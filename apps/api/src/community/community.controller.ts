import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Public, type AuthedRequest } from '../auth/firebase-auth.guard';
import { RequirePermissions } from '../auth/permissions.guard';
import { bearer } from '../common/bearer';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const uuid = z.string().uuid();

const feedSchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  department: z.coerce.number().int().min(1).max(17).optional(),
});

const postSchema = z.object({
  kind: z.enum(['experience', 'story', 'blog', 'chronicle', 'gallery']).default('experience'),
  title: z.string().trim().max(160).optional(),
  body_md: z.string().trim().min(1).max(20000),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  department_id: z.number().int().min(1).max(17).optional(),
  destination_id: uuid.optional(),
  business_id: uuid.optional(),
  is_promotional: z.boolean().default(false),
  locale: z.string().max(10).default('es'),
});

const commentSchema = z.object({ body: z.string().trim().min(1).max(4000), parent_id: uuid.optional() });
const reactionSchema = z.object({ kind: z.enum(['like', 'love', 'useful', 'wow']).default('like') });
const reportSchema = z.object({
  target_type: z.enum(['post', 'comment', 'review', 'profile', 'message', 'business']),
  target_id: uuid,
  reason: z.enum(['spam', 'harassment', 'hate', 'sexual_content', 'minor_safety', 'misinformation', 'fake_review', 'violence', 'other']),
  details: z.string().trim().max(2000).optional(),
  message_excerpt: z.string().trim().max(4000).optional(),
});
const moderationSchema = z.object({
  target_type: z.enum(['post', 'comment', 'review']),
  target_id: uuid,
  action: z.enum(['hide', 'remove', 'restore']),
  reason: z.string().trim().min(5).max(1000),
  report_id: uuid.optional(),
});

/** Red social turística: todo se ejecuta como el usuario, así RLS decide qué puede ver y hacer. */
@ApiTags('comunidad')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly db: SupabaseService) {}

  @Public()
  @Get('feed')
  async feed(@Query(new ZodPipe(feedSchema)) q: z.infer<typeof feedSchema>) {
    const { data, error } = await this.db.anon.rpc('public_feed', {
      p_before: q.before ?? null,
      p_limit: q.limit,
      p_department: q.department ?? null,
    });
    if (error) httpFromDb(error);
    return { posts: data, ordering: 'cronológico, sin algoritmo de interacción' };
  }

  @Post('posts')
  @HttpCode(201)
  async createPost(@Req() req: AuthedRequest, @Body(new ZodPipe(postSchema)) body: z.infer<typeof postSchema>) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { data, error } = await client.from('posts').insert({ ...body, author_id: me }).select('id').single();
    if (error) httpFromDb(error);
    return data;
  }

  @Delete('posts/:id')
  @HttpCode(204)
  async deletePost(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string) {
    const { error, count } = await this.db.asUser(bearer(req)).from('posts').delete({ count: 'exact' }).eq('id', id);
    if (error) httpFromDb(error);
    if (!count) httpFromDb({ code: 'P0002', message: 'Publicación no encontrada' });
  }

  @Public()
  @Get('posts/:id/comments')
  async comments(@Param('id', new ZodPipe(uuid)) id: string) {
    const { data, error } = await this.db.anon
      .from('comments')
      .select('id, parent_id, body, created_at, author_id')
      .eq('post_id', id)
      .order('created_at');
    if (error) httpFromDb(error);
    return data;
  }

  @Post('posts/:id/comments')
  @HttpCode(201)
  async comment(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Body(new ZodPipe(commentSchema)) body: z.infer<typeof commentSchema>,
  ) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { data, error } = await client
      .from('comments')
      .insert({ post_id: id, author_id: me, body: body.body, parent_id: body.parent_id ?? null })
      .select('id')
      .single();
    if (error) httpFromDb(error);
    return data;
  }

  @Put('posts/:id/reaction')
  @HttpCode(204)
  async react(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Body(new ZodPipe(reactionSchema)) body: z.infer<typeof reactionSchema>,
  ) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('reactions').upsert({ post_id: id, profile_id: me, kind: body.kind });
    if (error) httpFromDb(error);
  }

  @Delete('posts/:id/reaction')
  @HttpCode(204)
  async unreact(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('reactions').delete().eq('post_id', id).eq('profile_id', me);
    if (error) httpFromDb(error);
  }

  @Post('reports')
  @HttpCode(201)
  async report(@Req() req: AuthedRequest, @Body(new ZodPipe(reportSchema)) body: z.infer<typeof reportSchema>) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('content_reports').insert({ ...body, reporter_id: me });
    if (error) httpFromDb(error);
    return { message: 'Gracias. El equipo de moderación revisará el reporte.' };
  }

  @Put('blocks/:profileId')
  @HttpCode(204)
  async block(@Req() req: AuthedRequest, @Param('profileId', new ZodPipe(uuid)) profileId: string) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('user_blocks').upsert({ blocker_id: me, blocked_id: profileId });
    if (error) httpFromDb(error);
  }

  @Delete('blocks/:profileId')
  @HttpCode(204)
  async unblock(@Req() req: AuthedRequest, @Param('profileId', new ZodPipe(uuid)) profileId: string) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('user_blocks').delete().eq('blocker_id', me).eq('blocked_id', profileId);
    if (error) httpFromDb(error);
  }

  /** Ops Center · moderación (la función vuelve a comprobar el permiso y audita). */
  @Post('moderation')
  @HttpCode(204)
  @RequirePermissions('community.moderate')
  async moderate(@Req() req: AuthedRequest, @Body(new ZodPipe(moderationSchema)) b: z.infer<typeof moderationSchema>) {
    const { error } = await this.db.asUser(bearer(req)).rpc('moderate_content', {
      p_target_type: b.target_type,
      p_target: b.target_id,
      p_action: b.action,
      p_reason: b.reason,
      p_report: b.report_id ?? null,
    });
    if (error) httpFromDb(error);
  }
}
