import { createClient, type SupabaseClient } from '@supabase/supabase-js'; // Cliente de Supabase
import publica from '@/config/publica.json'; // Valores públicos del proyecto oficial

export const url = process.env.NEXT_PUBLIC_SUPABASE_URL || publica.supabaseUrl; // Dirección del proyecto (el entorno puede cambiarla)
export const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || publica.supabasePublishableKey; // Clave publicable (no es secreta: RLS decide qué se ve)

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

export type Municipio = { slug: string; name: string }; // Municipio publicado (nombre y dirección corta)

/**
 * Municipios publicados de un territorio, por páginas (6 por página).
 * RLS solo deja ver los que el equipo ya confirmó (editorial = published); los borradores no salen.
 */
export async function listMunicipalities(departmentId: number, page: number, size = 6) {
  const desde = (page - 1) * size; // Primer registro de la página
  const { data, error, count } = await publicDb()
    .from('municipalities') // Tabla de municipios
    .select('slug, name', { count: 'exact' }) // Nombre y total publicado
    .eq('department_id', departmentId) // Solo de este territorio
    .order('name') // Orden alfabético
    .range(desde, desde + size - 1); // Solo la página pedida
  return { data: (data ?? []) as Municipio[], total: count ?? 0, error }; // Lista, total y error (si lo hubo)
}
