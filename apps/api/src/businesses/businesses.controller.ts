import { Body, Controller, Get, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(160),
  department_id: z.number().int().min(1).max(17),
  municipality_id: z.string().uuid().optional(),
  categories: z.array(z.string().regex(/^[a-z0-9-]{2,40}$/)).min(1).max(5),
  summary: z.string().trim().max(500).optional(),
});

function bearer(req: AuthedRequest): string {
  return (req.headers['authorization'] ?? '').replace(/^Bearer\s+/, '');
}

/** Vitrina de Nuestra Gente: alta de negocios por su dueño. */
@ApiTags('negocios')
@ApiBearerAuth()
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly db: SupabaseService) {}

  /** Registra un negocio: queda "en revisión" y crea su solicitud de verificación. */
  @Post()
  @HttpCode(201)
  async register(@Req() req: AuthedRequest, @Body(new ZodPipe(registerSchema)) body: z.infer<typeof registerSchema>) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('register_business', {
      p_name: body.name,
      p_department: body.department_id,
      p_categories: body.categories,
      p_summary: body.summary ?? null,
      p_municipality: body.municipality_id ?? null,
    });
    if (error) httpFromDb(error);
    return { id: data, status: 'in_review', message: 'Recibimos tu negocio. Te avisaremos cuando termine la revisión.' };
  }

  /** Negocios que administro (RLS: solo los de mis organizaciones). */
  @Get('mine')
  async mine(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('businesses')
      .select('id, slug, name, editorial, listing_tier, verified_scope, verified_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) httpFromDb(error);
    return data;
  }
}
