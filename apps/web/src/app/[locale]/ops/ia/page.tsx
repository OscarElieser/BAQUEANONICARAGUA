'use client';

import { ActionButton } from '@/ops/ActionButton';
import { opsAction, useOpsData } from '@/ops/useOps';

type Proposal = {
  id: string; entity_table: string; entity_id: string; field: string; current_value: unknown; proposed_value: unknown;
  rationale: string; evidence: unknown[]; origin: 'ai' | 'user_feedback'; created_at: string;
};

const show = (v: unknown) => (v == null ? '—' : typeof v === 'string' ? v : JSON.stringify(v));

export default function IA() {
  const { data, error, loading, reload } = useOpsData<Proposal[]>('/ai/corrections');
  return (
    <>
      <h1 className="m-0 font-display text-[36px] font-normal">Inteligencia artificial</h1>
      <p className="mt-2 text-ink-muted">Correcciones propuestas por la IA o por usuarios. Nada cambia en lo publicado hasta que una persona lo aprueba; la aprobación se aplica y queda como versión del contenido.</p>
      {error && <p role="alert" className="text-status-alert">{error}</p>}
      {loading && !data && <p className="text-ink-muted">Cargando…</p>}
      {data?.length === 0 && <p className="text-ink-muted">No hay propuestas pendientes.</p>}
      <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex flex-col gap-3 rounded-m bg-ground-raised p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong>{p.entity_table}.{p.field}</strong>
              <span className="text-sm text-ink-muted">{p.origin === 'ai' ? 'Propuesta de la IA' : 'Aporte de usuario'}, {new Date(p.created_at).toLocaleDateString()}</span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
              <div><div className="text-sm text-ink-muted">Valor actual</div><div>{show(p.current_value)}</div></div>
              <div><div className="text-sm text-ink-muted">Valor propuesto</div><div className="font-bold">{show(p.proposed_value)}</div></div>
            </div>
            <p className="m-0"><span className="text-sm text-ink-muted">Razón: </span>{p.rationale}</p>
            <p className="m-0 text-sm text-ink-muted">Evidencias: {Array.isArray(p.evidence) && p.evidence.length ? p.evidence.map(show).join(', ') : 'ninguna'}</p>
            <div className="flex flex-wrap gap-2">
              <ActionButton label="Aprobar y aplicar" done="Aplicado y versionado" variant="primary" needsReason reasonLabel="Cómo se confirmó"
                run={async (note) => { await opsAction(`/ai/corrections/${p.id}`, 'POST', { decision: 'approve', note }); await reload(); }} />
              <ActionButton label="Rechazar" done="Propuesta rechazada" variant="danger" needsReason
                run={async (note) => { await opsAction(`/ai/corrections/${p.id}`, 'POST', { decision: 'reject', note }); await reload(); }} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
