import { Body, Controller, Get, HttpCode, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { RequireMfa, RequirePermissions } from '../auth/permissions.guard';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'needs_info']),
  reason: z.string().trim().min(5).max(1000),
  verified_scope: z.array(z.enum(['identity', 'location', 'operating_permit', 'tourism_license'])).max(4).default([]),
});

/** Ops Center · verificación de negocios. Permiso verifications.review + segundo factor. */
@ApiTags('ops')
@ApiBearerAuth()
@Controller('ops/verifications')
@RequirePermissions('verifications.review')
@RequireMfa()
export class VerificationsController {
  constructor(private readonly db: SupabaseService) {}

  @Get()
  async pending(@Req() req: AuthedRequest) {
    const token = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/, '');
    const { data, error } = await this.db
      .asUser(token)
      .from('verification_requests')
      .select('id, subject_type, subject_id, risk_level, state, created_at')
      .in('state', ['submitted', 'in_review', 'needs_info', 'appealed'])
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post(':id')
  @HttpCode(204)
  async review(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(z.string().uuid())) id: string,
    @Body(new ZodPipe(reviewSchema)) body: z.infer<typeof reviewSchema>,
  ) {
    const token = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/, '');
    // La función en base de datos vuelve a comprobar permisos, impide autorrevisión y audita.
    const { error } = await this.db.asUser(token).rpc('review_business_verification', {
      p_request: id,
      p_decision: body.decision,
      p_reason: body.reason,
      p_verified_scope: body.verified_scope,
    });
    if (error) httpFromDb(error);
  }
}
