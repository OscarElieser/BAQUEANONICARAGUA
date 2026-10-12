import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { bearer } from '../common/bearer';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const uuid = z.string().uuid();
const messageSchema = z.object({ body: z.string().trim().min(1).max(8000) });
const startSchema = z.object({ business_id: uuid, body: z.string().trim().min(2).max(8000) });
const pageSchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Mensajería entre visitantes y negocios. No es cifrado de extremo a extremo: la
 * plataforma no lo afirma. Moderadores NO leen conversaciones; solo reportes con
 * extracto aportado por quien denuncia.
 */
@ApiTags('mensajería')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly db: SupabaseService) {}

  @Get()
  async inbox(@Req() req: AuthedRequest) {
    const { data, error } = await this.db.asUser(bearer(req)).rpc('my_inbox');
    if (error) httpFromDb(error);
    return data;
  }

  @Post()
  @HttpCode(201)
  async start(@Req() req: AuthedRequest, @Body(new ZodPipe(startSchema)) body: z.infer<typeof startSchema>) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .rpc('start_business_conversation', { p_business: body.business_id, p_message: body.body });
    if (error) httpFromDb(error);
    return { conversation_id: data };
  }

  @Get(':id/messages')
  async messages(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Query(new ZodPipe(pageSchema)) q: z.infer<typeof pageSchema>,
  ) {
    let query = this.db
      .asUser(bearer(req))
      .from('messages')
      .select('id, sender_id, body, created_at, deleted_at')
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .limit(q.limit);
    if (q.before) query = query.lt('created_at', q.before);
    const { data, error } = await query;
    if (error) httpFromDb(error);
    // Mensajes eliminados conservan su lugar sin mostrar el contenido
    return (data ?? []).map((m) => (m.deleted_at ? { ...m, body: null } : m)).reverse();
  }

  @Post(':id/messages')
  @HttpCode(201)
  async send(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(uuid)) id: string,
    @Body(new ZodPipe(messageSchema)) body: z.infer<typeof messageSchema>,
  ) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { data, error } = await client
      .from('messages')
      .insert({ conversation_id: id, sender_id: me, body: body.body })
      .select('id, created_at')
      .single();
    if (error) httpFromDb(error);
    await client.rpc('mark_conversation_read', { p_conversation: id });
    return data;
  }

  @Post(':id/read')
  @HttpCode(204)
  async read(@Req() req: AuthedRequest, @Param('id', new ZodPipe(uuid)) id: string) {
    const { error } = await this.db.asUser(bearer(req)).rpc('mark_conversation_read', { p_conversation: id });
    if (error) httpFromDb(error);
  }

  @Post(':id/messages/:messageId/delete')
  @HttpCode(204)
  async remove(
    @Req() req: AuthedRequest,
    @Param('id', new ZodPipe(uuid)) _id: string,
    @Param('messageId', new ZodPipe(uuid)) messageId: string,
  ) {
    const { error, count } = await this.db
      .asUser(bearer(req))
      .from('messages')
      .update({ deleted_at: new Date().toISOString() }, { count: 'exact' })
      .eq('id', messageId);
    if (error) httpFromDb(error);
    if (!count) httpFromDb({ code: 'P0002', message: 'Mensaje no encontrado' });
  }
}
