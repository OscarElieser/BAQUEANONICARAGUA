import { Controller, HttpCode, Post, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

/**
 * Asistente de viaje.
 * La interpretación de solicitudes (@nica/ai-core) corre en la web y en Android, también sin
 * conexión. Este endpoint orquestará el modelo cuando haya proveedor de IA; sin él responde 503
 * y lo dice, sin simular respuestas.
 */
@ApiTags('asistente')
@Controller('assistant')
export class AssistantController {
  @Post('chat')
  @HttpCode(200)
  chat() {
    if (!process.env.AI_PROVIDER || !process.env.AI_API_KEY) {
      throw new ServiceUnavailableException(
        'El asistente conversacional se activa al configurar el proveedor de IA. Mientras tanto puedes usar el planificador.',
      );
    }
    // Orquestación (con proveedor): prompt v1 + herramientas de @nica/ai-core,
    // contenido externo envuelto con wrapUntrusted, respuesta verificada con checkGrounding
    // y registro en ai_messages con cited_refs y prompt_version_id.
    throw new ServiceUnavailableException('Orquestación del modelo pendiente de conectar al proveedor elegido.');
  }
}
