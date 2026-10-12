import { Body, Controller, Get, HttpCode, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import type { AuthedRequest } from '../auth/firebase-auth.guard';
import { bearer } from '../common/bearer';
import { SupabaseService } from '../common/supabase.service';
import { httpFromDb, ZodPipe } from '../common/zod.pipe';

const tokenSchema = z.object({ token: z.string().min(20).max(4096), platform: z.enum(['android', 'web']) });
const prefSchema = z.object({
  kind: z.enum(['new_message', 'comment_reply', 'post_comment', 'reaction', 'new_follower',
                'verification_update', 'incident_update', 'trip_update', 'system']),
  push: z.boolean(),
  email: z.boolean(),
});

@ApiTags('notificaciones')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly db: SupabaseService) {}

  @Get()
  async list(@Req() req: AuthedRequest) {
    const { data, error } = await this.db
      .asUser(bearer(req))
      .from('notifications')
      .select('id, kind, payload, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) httpFromDb(error);
    return data;
  }

  @Post('read-all')
  @HttpCode(204)
  async readAll(@Req() req: AuthedRequest) {
    const { error } = await this.db
      .asUser(bearer(req))
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null);
    if (error) httpFromDb(error);
  }

  /** Registra el token FCM del dispositivo (Android o navegador). */
  @Post('push-tokens')
  @HttpCode(204)
  async registerToken(@Req() req: AuthedRequest, @Body(new ZodPipe(tokenSchema)) b: z.infer<typeof tokenSchema>) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client
      .from('push_tokens')
      .upsert({ profile_id: me, token: b.token, platform: b.platform, last_seen_at: new Date().toISOString() }, { onConflict: 'token' });
    if (error) httpFromDb(error);
  }

  @Put('preferences')
  @HttpCode(204)
  async preferences(@Req() req: AuthedRequest, @Body(new ZodPipe(prefSchema)) b: z.infer<typeof prefSchema>) {
    const client = this.db.asUser(bearer(req));
    const { data: me } = await client.rpc('my_profile_id');
    const { error } = await client.from('notification_preferences').upsert({ profile_id: me, ...b });
    if (error) httpFromDb(error);
  }
}
