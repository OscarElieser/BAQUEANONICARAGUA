import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { RequireMfa, RequirePermissions } from '../auth/permissions.guard';
import { bearer } from '../common/bearer';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const uuid = z.string().uuid();
const submitSchema = z.object({
  category: z.enum(['pollution', 'environmental_damage', 'animal_abuse', 'tourism_irregularity', 'misleading_info', 'trail_risk', 'harassment', 'safety', 'other']),
  description: z.string().trim().min(10).max(8000),
  occurred_at: z.string().datetime().optional(),
  lat: z.number().min(10.5).max(15.2).optional(),
  lng: z.number().min(-88).max(-82.5).optional(),
  department_id: z.number().int().min(1).max(17).optional(),
  is_urgent: z.boolean().default(false),
});
const replySchema = z.object({ note: z.string().trim().min(5).max(4000) });
const stateSchema = z.object({
  to: z.enum(['in_review', 'needs_info', 'referred', 'resolved', 'closed']),
  note: z.string().trim().min(5).max(4000),
  visible_to_reporter: z.boolean().default(true),
});
const referralSchema = z.object({
  institution: z.string().trim().min(2).max(120),
  channel: z.string().trim().min(2).max(200),
  channel_doc_ref: z.string().trim().min(2).max(200),
  consent_at: z.string().datetime(),
});
const transmissionSchema = z.object({ succeeded: z.boolean(), receipt: z.string().trim().max(200).optional() });

/** Denuncias confidenciales. Nunca se publican en la red social. */
@ApiTags('denuncias')
@ApiBearerAuth()
@Controller()
export class IncidentsController {
  constructor(private readonly db: SupabaseService) {}

  @Post('incidents')
  @HttpCode(201)
  async submit(@Req() req: AuthedRequest, @Body(new ZodPipe(submitSchema)) b: z.infer<typeof submitSchema>) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('submit_incident', {
      p_category: b.category,
      p_description: b.description,
      p_occurred_at: b.occurred_at ?? null,
      p_lat: b.lat ?? null,
      p_lng: b.lng ?? null,
      p_department: b.department_id ?? null,
      p_is_urgent: b.is_urgent,
    });
    if (error) httpFromDb(error);
    return data;
  }

  /** Mis denuncias con su línea de tiempo visible (RLS oculta las notas internas). */
  @Get('incidents/mine')
  async mine(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('incident_reports')
      .select('id, category, state, is_urgent, created_at, incident_events(event, to_state, note, created_at)')
      .order('created_at', { ascending: false });
    if (error) httpFromDb(error);
    return data;
  }

  @Post('incidents/:id/reply')
  @HttpCode(204)
  async reply(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(replySchema)) b: z.infer<typeof replySchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('reply_incident', { p_incident: id, p_note: b.note });
    if (error) httpFromDb(error);
  }

  // ---- Ops Center: expedientes (reports.manage + segundo factor) ----

  @Get('ops/incidents')
  @RequirePermissions('reports.manage')
  @RequireMfa()
  async queue(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('incident_reports')
      .select('id, category, state, is_urgent, department_id, created_at, assigned_to')
      .not('state', 'eq', 'closed')
      .order('is_urgent', { ascending: false })
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post('ops/incidents/:id/state')
  @HttpCode(204)
  @RequirePermissions('reports.manage')
  @RequireMfa()
  async changeState(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(stateSchema)) b: z.infer<typeof stateSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('update_incident_state', {
      p_incident: id, p_to: b.to, p_note: b.note, p_visible_to_reporter: b.visible_to_reporter,
    });
    if (error) httpFromDb(error);
  }

  @Post('ops/incidents/:id/referrals')
  @HttpCode(201)
  @RequirePermissions('reports.manage')
  @RequireMfa()
  async prepareReferral(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(referralSchema)) b: z.infer<typeof referralSchema>) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('prepare_incident_referral', {
      p_incident: id, p_institution: b.institution, p_channel: b.channel, p_channel_doc_ref: b.channel_doc_ref, p_consent_at: b.consent_at,
    });
    if (error) httpFromDb(error);
    return { referral_id: data, status: 'prepared' };
  }

  /** Registra el resultado REAL de la transmisión; sin acuse no queda como transmitida. */
  @Post('ops/referrals/:id/transmission')
  @HttpCode(204)
  @RequirePermissions('reports.manage')
  @RequireMfa()
  async transmission(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(transmissionSchema)) b: z.infer<typeof transmissionSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('record_referral_transmission', {
      p_referral: id, p_succeeded: b.succeeded, p_receipt: b.receipt ?? null,
    });
    if (error) httpFromDb(error);
  }
}
