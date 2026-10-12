import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** true cuando el proyecto Supabase está configurado para este entorno. */
export const isSupabaseConfigured = Boolean(url && key);

const notConfigured = { message: 'Supabase no está configurado en este entorno', code: 'not_configured' };

/**
 * Cliente de solo lectura pública (anon): RLS limita a contenido publicado.
 * Sin configuración devuelve un cliente "vacío" que responde con error controlado,
 * así el build y las páginas muestran su estado de error en lugar de romperse.
 */
export function publicDb(): SupabaseClient {
  if (isSupabaseConfigured) {
    return createClient(url!, key!, { auth: { persistSession: false } });
  }
  const empty = { data: null, error: notConfigured, count: null };
  const chain: Record<string, unknown> = {};
  const builder = new Proxy(chain, {
    get: (_t, prop) => {
      if (prop === 'then') return (resolve: (v: typeof empty) => unknown) => resolve(empty);
      return () => builder;
    },
  });
  return new Proxy({} as SupabaseClient, { get: () => () => builder });
}

export type Territory = { id: number; slug: string; name: string; kind: 'department' | 'autonomous_region' };

export async function listTerritories() {
  const { data, error } = await publicDb().from('departments').select('id, slug, name, kind').order('name');
  return { data: (data ?? []) as Territory[], error };
}

export async function getTerritory(slug: string, locale: string) {
  const db = publicDb();
  const { data: territory, error } = await db
    .from('departments')
    .select('id, slug, name, kind, capital_name, source_id, data_sources(url)')
    .eq('slug', slug)
    .maybeSingle();
  if (error || !territory) return { territory: null, sections: [], error };

  const { data: sections } = await db
    .from('territory_sections')
    .select('section, title, body_md, machine_translated, verified_at')
    .eq('department_id', territory.id)
    .eq('locale', locale);
  return { territory, sections: (sections ?? []) as Section[], error: null };
}

export type Section = {
  section: string; title: string; body_md: string; machine_translated: boolean; verified_at: string | null;
};
