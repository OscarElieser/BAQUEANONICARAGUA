import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { RequireMfa, RequirePermissions } from '../auth/permissions.guard';
import { bearer } from '../common/bearer';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const uuid = z.string().uuid();
const resource = z.enum([
  'destinations', 'businesses', 'territory_sections', 'municipalities', 'data_sources',
  'heritage_items', 'historical_events', 'artists', 'music_works', 'media_licenses', 'community_stories',
]);
const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(['draft', 'in_review', 'published', 'hidden', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const saveSchema = z.object({
  data: z.record(z.unknown()),
  submit_for_review: z.boolean().default(false),
  note: z.string().trim().max(500).optional(),
});
const editorialSchema = z.object({
  status: z.enum(['draft', 'in_review', 'published', 'hidden', 'archived']),
  reason: z.string().trim().max(1000).optional(),
});
const userStatusSchema = z.object({ status: z.enum(['active', 'suspended', 'deleted']), reason: z.string().trim().min(5).max(1000) });
const roleSchema = z.object({ role: z.string().regex(/^[a-z_]+$/), expires_at: z.string().datetime().optional() });
const decisionSchema = z.object({ decision: z.enum(['approve', 'reject', 'needs_info']), reason: z.string().trim().min(5).max(1000) });
const aiDecisionSchema = z.object({ decision: z.enum(['approve', 'reject']), note: z.string().trim().min(5).max(1000) });
const reasonSchema = z.object({ reason: z.string().trim().min(5).max(1000) });
const settingSchema = z.object({ value: z.string().max(2000) });
const auditSchema = z.object({
  table: z.string().regex(/^[a-z_]+$/).optional(),
  actor: uuid.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

/**
 * Ops Center. Cada acción la ejecuta una función de BD que vuelve a comprobar el permiso,
 * aplica la lista blanca de campos y escribe historial y auditoría (migración 0014).
 * Aquí: validación de entrada, segundo factor y traducción de errores.
 */
@ApiTags('ops')
@ApiBearerAuth()
@RequireMfa()
@Controller('ops')
export class OpsController {
  constructor(private readonly db: SupabaseService) {}

  @Get('dashboard')
  async dashboard(@Req() req: AuthedRequest) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('ops_dashboard_metrics');
    if (error) httpFromDb(error);
    return data;
  }

  // ---- Editor genérico de recursos ----

  @Get('resources/:resource')
  async list(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) r: z.infer<typeof resource>,
    @Query(new ZodPipe(listSchema)) q: z.infer<typeof listSchema>,
  ) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('admin_list', {
      p_resource: r, p_q: q.q ?? null, p_status: q.status ?? null, p_limit: q.limit, p_offset: q.offset,
    });
    if (error) httpFromDb(error);
    return data;
  }

  @Post('resources/:resource')
  @HttpCode(201)
  async create(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) r: z.infer<typeof resource>,
    @Body(new ZodPipe(saveSchema)) b: z.infer<typeof saveSchema>,
  ) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('admin_save_content', {
      p_resource: r, p_id: null, p_data: b.data, p_submit_for_review: b.submit_for_review, p_note: b.note ?? null,
    });
    if (error) httpFromDb(error);
    return { id: data };
  }

  @Patch('resources/:resource/:id')
  async update(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) r: z.infer<typeof resource>,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Body(new ZodPipe(saveSchema)) b: z.infer<typeof saveSchema>,
  ) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('admin_save_content', {
      p_resource: r, p_id: id, p_data: b.data, p_submit_for_review: b.submit_for_review, p_note: b.note ?? null,
    });
    if (error) httpFromDb(error);
    return { id: data };
  }

  @Post('resources/:resource/:id/editorial')
  @HttpCode(204)
  async editorial(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) r: z.infer<typeof resource>,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Body(new ZodPipe(editorialSchema)) b: z.infer<typeof editorialSchema>,
  ) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_set_editorial', {
      p_resource: r, p_id: id, p_status: b.status, p_reason: b.reason ?? null,
    });
    if (error) httpFromDb(error);
  }

  /** Borra solo borradores que nunca se publicaron; lo demás se archiva. */
  @Delete('resources/:resource/:id')
  @HttpCode(204)
  async deleteDraft(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) r: z.infer<typeof resource>,
    @Param('id', new ZodPipe(uuid)) id: string,
  ) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_delete_draft', { p_resource: r, p_id: id });
    if (error) httpFromDb(error);
  }

  @Get('resources/:resource/:id/revisions')
  async revisions(
    @Req() req: AuthedRequest,
    @Param('resource', new ZodPipe(resource)) _r: z.infer<typeof resource>,
    @Param('id', new ZodPipe(uuid)) id: string,
  ) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('content_revisions')
      .select('revision_no, change_note, author_id, origin, created_at, data')
      .eq('entity_id', id)
      .order('revision_no', { ascending: false });
    if (error) httpFromDb(error);
    return data;
  }

  // ---- Usuarios ----

  @Get('users')
  @RequirePermissions('users.read')
  async users(@Req() req: AuthedRequest, @Query('q') q?: string, @Query('status') status?: string) {
    let query = this.db
      .asUser(bearer(req))
      .from('profiles')
      .select('id, display_name, username, status, email_verified, created_at, user_roles(role_key, granted_at, expires_at)')
      .order('created_at', { ascending: false })
      .limit(100);
    if (q && q.length <= 80) query = query.or(`display_name.ilike.%${q.replace(/[%,()]/g, '')}%,username.ilike.%${q.replace(/[%,()]/g, '')}%`);
    if (status && ['active', 'suspended', 'deleted'].includes(status)) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) httpFromDb(error);
    return data;
  }

  @Post('users/:id/status')
  @HttpCode(204)
  async userStatus(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(userStatusSchema)) b: z.infer<typeof userStatusSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_set_user_status', { p_profile: id, p_status: b.status, p_reason: b.reason });
    if (error) httpFromDb(error);
    // Pendiente con Firebase conectado: revocar sesiones (suspendido) y eliminar la cuenta de acceso (eliminado).
  }

  @Post('users/:id/roles')
  @HttpCode(204)
  async grantRole(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(roleSchema)) b: z.infer<typeof roleSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_grant_role', { p_profile: id, p_role: b.role, p_expires_at: b.expires_at ?? null });
    if (error) httpFromDb(error);
  }

  @Delete('users/:id/roles/:role')
  @HttpCode(204)
  async revokeRole(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Param('role', new ZodPipe(z.string().regex(/^[a-z_]+$/))) role: string) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_revoke_role', { p_profile: id, p_role: role });
    if (error) httpFromDb(error);
  }

  // ---- Negocios: reclamaciones ----

  @Get('claims')
  @RequirePermissions('businesses.review')
  async claims(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('business_claims')
      .select('id, business_id, claimant_id, state, created_at, evidence_paths')
      .in('state', ['submitted', 'in_review', 'needs_info', 'appealed'])
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post('claims/:id')
  @HttpCode(204)
  async reviewClaim(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(decisionSchema)) b: z.infer<typeof decisionSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_review_claim', { p_claim: id, p_decision: b.decision, p_reason: b.reason });
    if (error) httpFromDb(error);
  }

  // ---- Comunidad: reportes ----

  @Get('reports')
  @RequirePermissions('community.moderate')
  async reports(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('content_reports')
      .select('id, target_type, target_id, reason, details, message_excerpt, state, created_at')
      .in('state', ['open', 'in_review', 'appealed'])
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post('reports/:id/dismiss')
  @HttpCode(204)
  async dismiss(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(reasonSchema)) b: z.infer<typeof reasonSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_dismiss_report', { p_report: id, p_reason: b.reason });
    if (error) httpFromDb(error);
  }

  // ---- IA: propuestas de corrección ----

  @Get('ai/corrections')
  @RequirePermissions('ai.review')
  async corrections(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('ai_correction_proposals')
      .select('id, entity_table, entity_id, field, current_value, proposed_value, rationale, evidence, origin, created_at')
      .eq('state', 'pending')
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post('ai/corrections/:id')
  @HttpCode(204)
  async reviewCorrection(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string, @Body(new ZodPipe(aiDecisionSchema)) b: z.infer<typeof aiDecisionSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_review_ai_correction', { p_id: id, p_decision: b.decision, p_note: b.note });
    if (error) httpFromDb(error);
  }

  // ---- Auditoría (solo lectura) y configuración ----

  @Get('audit')
  @RequirePermissions('audit.read')
  async audit(@Req() req: AuthedRequest, @Query(new ZodPipe(auditSchema)) q: z.infer<typeof auditSchema>) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('audit_log_search', {
      p_target_table: q.table ?? null, p_actor: q.actor ?? null, p_limit: q.limit,
    });
    if (error) httpFromDb(error);
    return data;
  }

  @Get('navigation')
  @RequirePermissions('analytics.read') // Solo quien tenga permiso de ver el resumen
  async navigation(@Req() req: AuthedRequest, @Query(new ZodPipe(z.object({ days: z.coerce.number().int().min(1).max(90).default(30) }))) q: { days: number }) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('ops_navigation_summary', { p_days: q.days }); // Resumen anónimo calculado en la base de datos
    if (error) httpFromDb(error); // Traduce errores de la base de datos a HTTP
    return data; // Devuelve el resumen
  }

  @Post('settings/:key')
  @HttpCode(204)
  @RequirePermissions('settings.manage')
  async setting(@Req() req: AuthedRequest, @Param('key', new ZodPipe(z.string().regex(/^[a-z_]+$/))) key: string, @Body(new ZodPipe(settingSchema)) b: z.infer<typeof settingSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('admin_set_setting', { p_key: key, p_value: b.value });
    if (error) httpFromDb(error);
  }
}
