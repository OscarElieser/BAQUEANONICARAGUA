'use client';

import { useState } from 'react';
import { useOpsData } from '@/ops/useOps';

type Log = {
  id: number; occurred_at: string; actor_id: string | null; actor_kind: string; action: string;
  target_table: string | null; target_id: string | null; before_data: unknown; after_data: unknown;
};

function toCsv(rows: Log[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['fecha', 'responsable', 'tipo', 'accion', 'recurso', 'id', 'antes', 'despues'];
  return [head.join(','), ...rows.map((r) =>
    [r.occurred_at, r.actor_id, r.actor_kind, r.action, r.target_table, r.target_id, JSON.stringify(r.before_data), JSON.stringify(r.after_data)].map(esc).join(','),
  )].join('\n');
}

export default function Auditoria() {
  const [table, setTable] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const { data, error, loading } = useOpsData<Log[]>(`/audit?limit=200${table ? `&table=${table}` : ''}`);

  function exportCsv() {
    if (!data) return;
    const blob = new Blob([toCsv(data)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-display text-[36px] font-normal">Auditoría</h1>
        <button type="button" onClick={exportCsv} disabled={!data?.length} className="h-12 rounded-pill border-[1.5px] border-control-border px-5 font-bold disabled:opacity-45">Exportar CSV</button>
      </div>
      <p className="mt-2 max-w-[70ch] text-ink-muted">Solo lectura. Los registros no se pueden modificar ni borrar, ni siquiera desde la base de datos.</p>
      <div className="my-5 flex flex-wrap gap-2">
        <label htmlFor="tabla" className="visually-hidden">Recurso</label>
        <select id="tabla" value={table} onChange={(e) => setTable(e.target.value)} className="h-11 rounded-pill border border-control-border bg-ground-raised px-3 text-base text-ink">
          <option value="">Todos los recursos</option>
          <option value="businesses">Negocios</option><option value="destinations">Destinos</option><option value="profiles">Usuarios</option>
          <option value="user_roles">Roles</option><option value="incident_reports">Denuncias</option><option value="posts">Publicaciones</option>
          <option value="content_reports">Reportes</option><option value="settings">Configuración</option>
        </select>
      </div>
      {error && <p role="alert" className="text-status-alert">{error}</p>}
      {loading && !data && <p className="text-ink-muted">Cargando…</p>}
      {data && (
        <div className="overflow-x-auto rounded-m bg-ground-raised">
          <table className="w-full min-w-[760px] border-collapse text-[15px]">
            <thead><tr className="text-left text-ink-muted"><th scope="col" className="px-4 py-3">Cuándo</th><th scope="col" className="px-4 py-3">Responsable</th><th scope="col" className="px-4 py-3">Acción</th><th scope="col" className="px-4 py-3">Recurso</th><th scope="col" className="px-4 py-3">Cambio</th></tr></thead>
            <tbody>
              {data.map((l) => (
                <tr key={l.id} className="border-t border-ground align-top">
                  <td className="px-4 py-3">{new Date(l.occurred_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{l.actor_kind === 'system' ? 'Sistema' : l.actor_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3">{l.action}</td>
                  <td className="px-4 py-3">{l.target_table ?? '—'} {l.target_id ? l.target_id.slice(0, 8) : ''}</td>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setOpen(open === l.id ? null : l.id)} className="font-bold text-accent underline">
                      {open === l.id ? 'Ocultar' : 'Ver antes y después'}
                    </button>
                    {open === l.id && (
                      <pre className="mt-2 max-w-[520px] overflow-x-auto whitespace-pre-wrap rounded-[12px] bg-ground p-3 text-xs">
                        {JSON.stringify({ antes: l.before_data, despues: l.after_data }, null, 2)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
