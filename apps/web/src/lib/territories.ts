import { createClient } from '@supabase/supabase-js';

/** Cliente de solo lectura pública (anon): RLS limita a contenido publicado. */
export function publicDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
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
  return { territory, sections: sections ?? [], error: null };
}
