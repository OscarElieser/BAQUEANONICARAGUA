import { Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseService } from '../common/supabase.service';
import type { AuthedRequest } from '../auth/firebase-auth.guard';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly db: SupabaseService) {}

  /**
   * Crea el perfil del usuario autenticado si no existe (idempotente).
   * Web y Android lo llaman tras el primer inicio de sesión.
   */
  @Post('bootstrap')
  async bootstrap(@Req() req: AuthedRequest) {
    const u = req.user!;
    const { data, error } = await this.db.admin
      .from('profiles')
      .upsert(
        {
          firebase_uid: u.uid,
          display_name: (u.name as string | undefined)?.slice(0, 80) ?? null,
          email_verified: u.email_verified ?? false,
        },
        { onConflict: 'firebase_uid', ignoreDuplicates: false },
      )
      .select('id, display_name, username, preferred_locale, status')
      .single();
    if (error) throw error;

    // Rol base "user" (no falla si ya existe)
    await this.db.admin
      .from('user_roles')
      .upsert({ profile_id: data.id, role_key: 'user' }, { onConflict: 'profile_id,role_key', ignoreDuplicates: true });

    return data;
  }

  @Get()
  async me(@Req() req: AuthedRequest) {
    const { data, error } = await this.db.admin
      .from('profiles')
      .select('id, display_name, username, avatar_path, bio, preferred_locale, status, user_roles(role_key)')
      .eq('firebase_uid', req.user!.uid)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}
