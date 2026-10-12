import { Body, Controller, HttpCode, Post, Req, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public, type AuthedRequest } from '../auth/firebase-auth.guard';
import { ZodPipe } from '../common/zod.pipe';

const understandSchema = z.object({
  text: z.string().trim().min(2).max(2000),
  locale: z.string().max(10).default('es'),
});

const QUESTIONS: Record<string, string> = {
  travelers: '¿Cuántas personas viajan?',
  days: '¿Cuántos días dura el viaje?',
  budget_currency: '¿Tu presupuesto es en dólares o en córdobas?',
  dates: '¿En qué fechas viajan? Así reviso clima y temporada.',
  transport: '¿Tendrán vehículo o usarán transporte público?',
};

// @nica/ai-core es ESM y sin dependencias; se carga de forma dinámica desde Nest (CommonJS).
const aiCore = () => import('@nica/ai-core');

/**
 * Asistente de viaje.
 * - /understand funciona sin proveedor de IA: interpreta la solicitud y pregunta lo que falta.
 * - /chat requiere AI_PROVIDER configurado; sin él responde 503 y lo dice, sin simular respuestas.
 */
@ApiTags('asistente')
@Controller('assistant')
export class AssistantController {
  @Public()
  @Post('understand')
  @HttpCode(200)
  async understand(@Body(new ZodPipe(understandSchema)) body: z.infer<typeof understandSchema>) {
    const { parseTripIntent, budgetBreakdown } = await aiCore();
    const intent = parseTripIntent(body.text);
    const missing = intent.missing.slice(0, 2); // máximo dos preguntas a la vez
    return {
      intent,
      budget: budgetBreakdown(intent),
      next_questions: missing.map((m) => QUESTIONS[m]),
      note: 'Interpretación automática. Confírmala o corrígela antes de armar el plan.',
    };
  }

  @Post('chat')
  @HttpCode(200)
  async chat(@Req() _req: AuthedRequest) {
    if (!process.env.AI_PROVIDER || !process.env.AI_API_KEY) {
      throw new ServiceUnavailableException(
        'El asistente conversacional se activa al configurar el proveedor de IA. Mientras tanto puedes usar el planificador.',
      );
    }
    // Orquestación (Fase 5, con proveedor): prompt v1 + herramientas de @nica/ai-core,
    // contenido externo envuelto con wrapUntrusted, respuesta verificada con checkGrounding
    // y registro en ai_messages con cited_refs y prompt_version_id.
    throw new ServiceUnavailableException('Orquestación del modelo pendiente de conectar al proveedor elegido.');
  }
}
