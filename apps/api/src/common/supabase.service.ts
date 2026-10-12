import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente con clave secreta (bypassa RLS). Vive SOLO en la API y los workers.
 * Toda operación privilegiada debe comprobar permisos antes y registrar auditoría después.
 */
@Injectable()
export class SupabaseService {
  readonly admin: SupabaseClient;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL y SUPABASE_SECRET_KEY son obligatorias');
    this.admin = createClient(url, key, { auth: { persistSession: false } });
  }

  /** Cliente público (sin clave secreta): lecturas sujetas a RLS como visitante. */
  readonly anon: SupabaseClient = createClient(
    process.env.SUPABASE_URL ?? '',
    process.env.SUPABASE_PUBLISHABLE_KEY ?? '',
    { auth: { persistSession: false } },
  );

  /**
   * Cliente que actúa COMO el usuario: reenvía su ID token de Firebase, así RLS y las
   * funciones (register_business, review_business_verification) ven su identidad real.
   */
  asUser(idToken: string): SupabaseClient {
    return createClient(process.env.SUPABASE_URL ?? '', process.env.SUPABASE_PUBLISHABLE_KEY ?? '', {
      auth: { persistSession: false },
      accessToken: async () => idToken,
    });
  }

  async permissionsFor(firebaseUid: string): Promise<Set<string>> {
    const { data, error } = await this.admin
      .from('profiles')
      .select('status, user_roles(expires_at, roles(role_permissions(permission_key)))')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();
    if (error) throw error;
    const result = new Set<string>();
    if (!data || data.status !== 'active') return result;
    const now = Date.now();
    for (const ur of (data.user_roles ?? []) as any[]) {
      if (ur.expires_at && Date.parse(ur.expires_at) <= now) continue;
      for (const rp of ur.roles?.role_permissions ?? []) result.add(rp.permission_key);
    }
    return result;
  }

  async audit(entry: {
    actorId: string | null;
    actorKind: 'user' | 'system' | 'ai';
    action: string;
    targetTable?: string;
    targetId?: string;
    before?: unknown;
    after?: unknown;
    requestId?: string;
  }): Promise<void> {
    const { error } = await this.admin.schema('audit').from('logs').insert({
      actor_id: entry.actorId,
      actor_kind: entry.actorKind,
      action: entry.action,
      target_table: entry.targetTable,
      target_id: entry.targetId,
      before_data: entry.before ?? null,
      after_data: entry.after ?? null,
      request_id: entry.requestId,
    });
    if (error) throw error; // una acción privilegiada sin auditoría debe fallar
  }
}
