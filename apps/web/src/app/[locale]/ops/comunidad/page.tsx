'use client';

import { api } from '@/lib/api';
import { ActionButton } from '@/ops/ActionButton';
import { opsAction, useOpsData } from '@/ops/useOps';

type Report = {
  id: string; target_type: 'post' | 'comment' | 'review' | 'profile' | 'message' | 'business'; target_id: string;
  reason: string; details: string | null; message_excerpt: string | null; state: string; created_at: string;
};

const REASON: Record<string, string> = {
  spam: 'Spam', harassment: 'Acoso', hate: 'Odio', sexual_content: 'Contenido sexual', minor_safety: 'Seguridad de menores',
  misinformation: 'Desinformación', fake_review: 'Opinión falsa', violence: 'Violencia', other: 'Otro',
};
const TARGET: Record<string, string> = { post: 'Publicación', comment: 'Comentario', review: 'Opinión', profile: 'Perfil', message: 'Mensaje', business: 'Negocio' };

export default function Comunidad() {
  const { data, error, loading, reload } = useOpsData<Report[]>('/reports');

  const moderate = (r: Report, action: 'hide' | 'remove' | 'restore') => async (reason?: string) => {
    await api('/community/moderation', {
      method: 'POST',
      body: JSON.stringify({ target_type: r.target_type, target_id: r.target_id, action, reason, report_id: r.id }),
    });
    await reload();
  };

  return (
    <>
      <h1 className="m-0 font-display text-[36px] font-normal">Comunidad</h1>
      <p className="mt-2 text-ink-muted">Reportes abiertos, del más antiguo al más reciente. En reportes de mensajes solo ves el extracto que aportó quien denuncia.</p>
      {error && <p role="alert" className="text-status-alert">{error}</p>}
      {loading && !data && <p className="text-ink-muted">Cargando…</p>}
      {data?.length === 0 && <p className="text-ink-muted">No hay reportes abiertos.</p>}
      <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
        {(data ?? []).map((r) => {
          const moderatable = r.target_type === 'post' || r.target_type === 'comment' || r.target_type === 'review';
          return (
            <li key={r.id} className="flex flex-col gap-3 rounded-m bg-ground-raised p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong>{TARGET[r.target_type]}: {REASON[r.reason] ?? r.reason}</strong>
                <span className="text-sm text-ink-muted">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.details && <p className="m-0">{r.details}</p>}
              {r.message_excerpt && <blockquote className="m-0 border-l-4 border-line pl-3 text-ink-muted">{r.message_excerpt}</blockquote>}
              <div className="flex flex-wrap gap-2">
                {moderatable && <ActionButton label="Ocultar" done="Contenido oculto" needsReason run={moderate(r, 'hide')} />}
                {moderatable && <ActionButton label="Eliminar" done="Contenido eliminado" variant="danger" needsReason run={moderate(r, 'remove')} />}
                {moderatable && <ActionButton label="Restaurar" done="Contenido restaurado" needsReason run={moderate(r, 'restore')} />}
                <ActionButton label="Descartar reporte" done="Reporte descartado" needsReason
                  run={async (reason) => { await opsAction(`/reports/${r.id}/dismiss`, 'POST', { reason }); await reload(); }} />
              </div>
              {!moderatable && <p className="m-0 text-sm text-ink-muted">Para perfiles, mensajes o negocios: suspende la cuenta desde Usuarios o la ficha desde Negocios.</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
