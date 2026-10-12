import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseService } from '../common/supabase.service';
import type { AuthedRequest } from '../auth/firebase-auth.guard';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
export class MeController {
  constructor(private readonly db: SupabaseService) {}

  // El perfil se crea en la función de Supabase "preparar-sesion" (un solo camino para web y Android).
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
