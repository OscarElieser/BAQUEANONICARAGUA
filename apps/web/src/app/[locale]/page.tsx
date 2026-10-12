import { createClient } from '@supabase/supabase-js';

// Lectura pública (anon): solo devuelve territorios publicados gracias a RLS.
async function getTerritories() {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
  const { data, error } = await db
    .from('departments')
    .select('id, slug, name, kind')
    .order('name');
  return { data: data ?? [], error };
}

export const revalidate = 3600;

export default async function Home() {
  const { data, error } = await getTerritories();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-4xl font-semibold">Nicaragua, territorio vivo</h1>
      <p className="mt-2 opacity-80">Esqueleto de Fase 2 — sin diseño definitivo.</p>

      {error && <p role="alert" className="mt-6">No se pudo cargar el catálogo territorial.</p>}

      {!error && data.length === 0 && (
        <p className="mt-6">Aún no hay territorios publicados. Se publican desde Ops Center tras verificar su fuente.</p>
      )}

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((t) => (
          <li key={t.id} className="rounded-xl border border-current/15 p-4">
            {t.name}
          </li>
        ))}
      </ul>
    </main>
  );
}
