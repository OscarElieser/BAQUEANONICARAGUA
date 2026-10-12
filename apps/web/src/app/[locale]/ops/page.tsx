'use client';

import { useOpsData } from '@/ops/useOps';

type Metrics = Record<string, number | string>;

const KPIS: Array<[string, string]> = [
  ['users_active', 'Usuarios activos'],
  ['businesses_published', 'Negocios publicados'],
  ['businesses_in_review', 'Negocios en revisión'],
  ['verifications_pending', 'Verificaciones pendientes'],
  ['claims_pending', 'Reclamaciones pendientes'],
  ['reports_open', 'Reportes abiertos'],
  ['incidents_open', 'Denuncias abiertas'],
  ['incidents_urgent_open', 'Denuncias urgentes'],
  ['posts_7d', 'Publicaciones en 7 días'],
  ['conversations_new_7d', 'Conversaciones nuevas en 7 días'],
  ['ai_corrections_pending', 'Propuestas de la IA'],
  ['destinations_published', 'Destinos publicados'],
];

export default function Panel() {
  const { data, error, loading } = useOpsData<Metrics>('/dashboard');
  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="m-0 font-display text-[36px] font-normal">Panel</h1>
        <p className="m-0 text-sm text-ink-muted">
          Datos de la base{data?.generated_at ? `, ${new Date(String(data.generated_at)).toLocaleString()}` : ''}. Sin cifras estimadas.
        </p>
      </div>
      {error && <p role="alert" className="text-status-alert">{error}</p>}
      {loading && !data && <p className="text-ink-muted">Cargando métricas…</p>}
      {data && (
        <section aria-label="Indicadores" className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-0.5 overflow-hidden rounded-m bg-line">
          {KPIS.map(([key, label]) => (
            <div key={key} className="bg-ground-raised px-5 py-4">
              <div className="font-display text-[34px] leading-none">{String(data[key] ?? 0)}</div>
              <div className="mt-2 text-[15px] text-ink-muted">{label}</div>
            </div>
          ))}
        </section>
      )}
      <p className="mt-6 text-sm text-ink-muted">La mensajería solo aparece como cifra agregada: el Ops Center no permite leer conversaciones privadas.</p>
    </>
  );
}
