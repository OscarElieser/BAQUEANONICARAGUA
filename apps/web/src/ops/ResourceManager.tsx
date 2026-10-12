'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { ActionButton } from './ActionButton';
import { ResourceForm } from './ResourceForm';
import { EDITORIAL_LABEL, RESOURCES, SECTIONS, type Resource } from './resources';
import { opsAction, useOpsData } from './useOps';

type Row = Record<string, unknown> & { id: string };
type Revision = { revision_no: number; change_note: string | null; origin: string; created_at: string };

/** Lista + editor + acciones para cualquier recurso registrado. */
export function ResourceManager({ resource, locale }: { resource: Resource; locale: string }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState<Row | 'new' | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) }).toString();
  const { data, error, loading, reload } = useOpsData<Row[]>(`/resources/${resource.key}${query ? `?${query}` : ''}`);
  const row = selected && selected !== 'new' ? (data ?? []).find((r) => r.id === selected.id) ?? selected : null;
  const history = useOpsData<Revision[]>(row && showHistory ? `/resources/${resource.key}/${row.id}/revisions` : null);

  const section = SECTIONS.find((s) => s.key === resource.section);
  const siblings = RESOURCES.filter((r) => r.section === resource.section);
  const editorialValue = row && resource.editorial ? String(row[resource.editorial] ?? '') : '';

  async function save(values: Record<string, unknown>, submitForReview: boolean) {
    if (selected === 'new') {
      const r = await apiCreate(resource.key, values, submitForReview);
      await reload();
      setSelected({ id: r } as Row);
    } else if (row) {
      await opsAction(`/resources/${resource.key}/${row.id}`, 'PATCH', { data: values, submit_for_review: submitForReview });
      await reload();
    }
  }

  async function apiCreate(key: string, values: Record<string, unknown>, review: boolean): Promise<string> {
    const r = await api<{ id: string }>(`/ops/resources/${key}`, { method: 'POST', body: JSON.stringify({ data: values, submit_for_review: review }) });
    return r.id;
  }

  const setEditorial = (to: string) => async (reason?: string) => {
    await opsAction(`/resources/${resource.key}/${row!.id}/editorial`, 'POST', { status: to, reason });
    await reload();
  };

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-label={resource.label} className="min-w-0 flex-[999_1_520px]">
        {siblings.length > 1 && (
          <nav aria-label={section?.label} className="mb-4 flex flex-wrap gap-1 rounded-pill bg-ground-raised p-1">
            {siblings.map((s) => (
              <Link key={s.key} href={`/${locale}/ops/r/${s.key}`} aria-current={s.key === resource.key ? 'page' : undefined}
                className={`rounded-pill px-4 py-2 font-bold no-underline ${s.key === resource.key ? 'bg-ink text-ground' : 'text-ink'}`}>
                {s.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 font-display text-[36px] font-normal">{resource.label}</h1>
          <button type="button" onClick={() => { setSelected('new'); setShowHistory(false); }}
            className="h-12 rounded-pill bg-oro px-5 font-bold text-on-oro">
            Nuevo {resource.singular}
          </button>
        </div>
        <form role="search" className="my-5 flex flex-wrap gap-2" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="ops-q" className="visually-hidden">Buscar</label>
          <input id="ops-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar"
            className="h-11 min-w-0 flex-[1_1_220px] rounded-pill border border-control-border bg-ground-raised px-4 text-base text-ink" />
          {resource.editorial && (
            <>
              <label htmlFor="ops-status" className="visually-hidden">Estado</label>
              <select id="ops-status" value={status} onChange={(e) => setStatus(e.target.value)}
                className="h-11 rounded-pill border border-control-border bg-ground-raised px-3 text-base text-ink">
                <option value="">Todos los estados</option>
                {Object.entries(EDITORIAL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </>
          )}
        </form>
        {error && <p role="alert" className="text-status-alert">{error}</p>}
        {loading && !data && <p className="text-ink-muted">Cargando…</p>}
        {data && data.length === 0 && <p className="text-ink-muted">No hay registros con estos filtros. Crea el primero con “Nuevo {resource.singular}”.</p>}
        {data && data.length > 0 && (
          <div className="overflow-x-auto rounded-m bg-ground-raised">
            <table className="w-full min-w-[560px] border-collapse text-[15px]">
              <thead>
                <tr className="text-left text-ink-muted">
                  {resource.columns.map((c) => (
                    <th key={c} scope="col" className="px-4 py-3">{resource.fields.find((f) => f.key === c)?.label ?? colLabel(c)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className={`border-t border-ground ${row?.id === r.id ? 'bg-ground' : ''}`}>
                    {resource.columns.map((c, i) => (
                      <td key={c} className="px-4 py-3">
                        {i === 0 ? (
                          <button type="button" onClick={() => { setSelected(r); setShowHistory(false); }} className="text-left font-bold text-accent underline">
                            {String(r[c] ?? '(sin título)')}
                          </button>
                        ) : cell(c, r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <aside aria-label={`Editar ${resource.singular}`} className="flex min-w-0 max-w-[520px] flex-[1_1_400px] flex-col gap-4 rounded-m bg-ground-raised p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="m-0 font-display text-[26px] font-normal">
              {selected === 'new' ? `Nuevo ${resource.singular}` : String(row?.[resource.titleField] ?? '')}
            </h2>
            <button type="button" onClick={() => setSelected(null)} className="h-11 px-2 font-bold text-ink underline">Cerrar</button>
          </div>
          {row && resource.editorial && (
            <p className="m-0 text-sm text-ink-muted">Estado: {EDITORIAL_LABEL[editorialValue] ?? editorialValue}. Formulario generado desde la definición del recurso.</p>
          )}

          <ResourceForm key={row?.id ?? 'new'} resource={resource} row={row} onSave={save} />

          {row && resource.editorial && (
            <div className="flex flex-col gap-2 border-t border-line pt-3.5">
              <p className="m-0 font-bold">Estado de publicación</p>
              <div className="flex flex-wrap gap-2">
                {editorialValue !== 'published' && (
                  <ActionButton label="Publicar" done="Publicado" variant="primary" run={setEditorial('published')}
                    disabled={resource.publishNeedsSource && !row.source_id}
                    disabledHint="Registra la fuente antes de publicar" />
                )}
                {editorialValue !== 'hidden' && (
                  <ActionButton label={resource.key === 'businesses' ? 'Suspender' : 'Ocultar'} done="Oculto" run={setEditorial('hidden')} needsReason />
                )}
                {editorialValue !== 'archived' && <ActionButton label="Archivar" done="Archivado" run={setEditorial('archived')} needsReason />}
                {editorialValue !== 'draft' && editorialValue !== 'published' && (
                  <ActionButton label="Volver a borrador" done="Devuelto a borrador" run={setEditorial('draft')} />
                )}
                <ActionButton label="Eliminar borrador" done="Eliminado" variant="danger"
                  disabled={editorialValue !== 'draft'} disabledHint="Solo borradores que nunca se publicaron; lo demás se archiva"
                  run={async () => {
                    if (!window.confirm('El borrador se eliminará de forma definitiva. ¿Continuar?')) throw new Error('Eliminación cancelada.');
                    await opsAction(`/resources/${resource.key}/${row.id}`, 'DELETE');
                    setSelected(null);
                    await reload();
                  }} />
              </div>
            </div>
          )}

          {row && (
            <div className="border-t border-line pt-3.5">
              <button type="button" onClick={() => setShowHistory((v) => !v)} className="h-11 font-bold text-accent underline">
                {showHistory ? 'Ocultar historial' : 'Ver historial'}
              </button>
              {showHistory && history.data && (
                <ol className="m-0 mt-2 list-none p-0 text-sm">
                  {history.data.map((h) => (
                    <li key={h.revision_no} className="border-t border-ground py-2">
                      <strong>Versión {h.revision_no}</strong>: {h.change_note ?? 'Sin nota'}
                      {h.origin === 'ai_proposal_approved' && <span className="text-oro-text"> (propuesta de IA aprobada)</span>}
                      <div className="text-ink-muted">{new Date(h.created_at).toLocaleString()}</div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

function colLabel(c: string): string {
  return ({ editorial: 'Estado', review_state: 'Estado', updated_at: 'Actualizado', listing_tier: 'Nivel', verification: 'Verificación' } as Record<string, string>)[c] ?? c;
}

function cell(col: string, v: unknown): string {
  if (v == null) return '—';
  if (col === 'editorial' || col === 'review_state') return EDITORIAL_LABEL[String(v)] ?? String(v);
  if (col === 'listing_tier') return ({ community_info: 'Información comunitaria', claimed: 'Reclamado', verified: 'Verificado' } as Record<string, string>)[String(v)] ?? String(v);
  if (typeof v === 'boolean') return v ? 'Sí' : 'No';
  if (col.endsWith('_at') && typeof v === 'string') return new Date(v).toLocaleDateString();
  return String(v);
}
