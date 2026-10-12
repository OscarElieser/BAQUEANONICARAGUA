'use client';

import { useState, type FormEvent } from 'react';
import { ActionButton } from '@/ops/ActionButton';
import { opsAction, useOpsData } from '@/ops/useOps';

type User = {
  id: string; display_name: string | null; username: string | null; status: 'active' | 'suspended' | 'deleted';
  email_verified: boolean; created_at: string; user_roles: Array<{ role_key: string; granted_at: string; expires_at: string | null }>;
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadministrador', admin: 'Administrador', auditor: 'Auditor', moderator: 'Moderador',
  editor: 'Editor de contenido', entrepreneur: 'Emprendedor', guide: 'Guía', user: 'Usuario',
};
const STATUS_LABEL = { active: 'Activa', suspended: 'Suspendida', deleted: 'Eliminada' } as const;

export default function Usuarios() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) }).toString();
  const { data, error, loading, reload } = useOpsData<User[]>(`/users${query ? `?${query}` : ''}`);
  const user = data?.find((u) => u.id === selectedId) ?? null;

  async function grant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!user) return;
    const role = String(new FormData(e.currentTarget).get('role'));
    await opsAction(`/users/${user.id}/roles`, 'POST', { role }).catch((err) => alert((err as Error).message));
    await reload();
  }

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-label="Usuarios" className="min-w-0 flex-[999_1_480px]">
        <h1 className="m-0 font-display text-[36px] font-normal">Usuarios</h1>
        <form role="search" className="my-5 flex flex-wrap gap-2" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="uq" className="visually-hidden">Buscar usuario</label>
          <input id="uq" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o usuario"
            className="h-11 min-w-0 flex-[1_1_220px] rounded-pill border border-control-border bg-ground-raised px-4 text-base text-ink" />
          <label htmlFor="us" className="visually-hidden">Estado</label>
          <select id="us" value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-pill border border-control-border bg-ground-raised px-3 text-base text-ink">
            <option value="">Todos</option><option value="active">Activas</option><option value="suspended">Suspendidas</option><option value="deleted">Eliminadas</option>
          </select>
        </form>
        {error && <p role="alert" className="text-status-alert">{error}</p>}
        {loading && !data && <p className="text-ink-muted">Cargando…</p>}
        <ul className="m-0 list-none overflow-hidden rounded-m bg-ground-raised p-0">
          {(data ?? []).map((u) => (
            <li key={u.id} className={`border-t border-ground ${u.id === selectedId ? 'bg-ground' : ''}`}>
              <button type="button" onClick={() => setSelectedId(u.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
                <span>
                  <span className="block font-bold">{u.display_name ?? (u.status === 'deleted' ? 'Cuenta eliminada' : 'Sin nombre')}</span>
                  <span className="block text-sm text-ink-muted">{u.username ? `@${u.username}` : ''} {u.user_roles.map((r) => ROLE_LABEL[r.role_key] ?? r.role_key).join(', ')}</span>
                </span>
                <span className={`rounded-pill px-3 py-0.5 text-sm font-bold ${u.status === 'active' ? 'bg-status-verified text-white' : 'border border-control-border'}`}>{STATUS_LABEL[u.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {user && (
        <aside aria-label="Detalle del usuario" className="flex min-w-0 max-w-[520px] flex-[1_1_380px] flex-col gap-5 rounded-m bg-ground-raised p-6">
          <div>
            <h2 className="m-0 font-display text-[26px] font-normal">{user.display_name ?? 'Cuenta eliminada'}</h2>
            <p className="m-0 mt-1 text-sm text-ink-muted">Cuenta creada el {new Date(user.created_at).toLocaleDateString()}. {user.email_verified ? 'Correo verificado.' : 'Correo sin verificar.'}</p>
          </div>

          {user.status !== 'deleted' && (
            <section>
              <h3 className="mb-2 mt-0 text-lg">Roles</h3>
              <ul className="m-0 list-none p-0">
                {user.user_roles.map((r) => (
                  <li key={r.role_key} className="flex items-center justify-between gap-3 border-t border-ground py-2">
                    <span><strong>{ROLE_LABEL[r.role_key] ?? r.role_key}</strong>{r.expires_at && <span className="text-sm text-ink-muted"> hasta {new Date(r.expires_at).toLocaleDateString()}</span>}</span>
                    {r.role_key !== 'user' && (
                      <ActionButton label="Quitar rol" done="Rol quitado" variant="danger"
                        run={async () => { await opsAction(`/users/${user.id}/roles/${r.role_key}`, 'DELETE'); await reload(); }} />
                    )}
                  </li>
                ))}
              </ul>
              <form onSubmit={grant} className="mt-3 flex flex-wrap gap-2">
                <label htmlFor="role" className="visually-hidden">Rol a asignar</label>
                <select id="role" name="role" className="h-11 flex-[1_1_180px] rounded-pill border border-control-border bg-ground-raised px-3 text-base text-ink">
                  {Object.entries(ROLE_LABEL).filter(([k]) => k !== 'user' && !user.user_roles.some((r) => r.role_key === k)).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <button type="submit" className="h-11 rounded-pill bg-oro px-4 font-bold text-on-oro">Asignar rol</button>
              </form>
              <p className="mb-0 mt-2 text-sm text-ink-muted">No se puede quitar el último superadministrador; solo un superadministrador otorga ese rol.</p>
            </section>
          )}

          {user.status !== 'deleted' && (
            <section>
              <h3 className="mb-2 mt-0 text-lg">Estado de la cuenta</h3>
              <div className="flex flex-wrap gap-2">
                {user.status === 'active' ? (
                  <ActionButton label="Suspender" done="Cuenta suspendida" variant="danger" needsReason reasonLabel="Motivo (queda en Auditoría)"
                    run={async (reason) => { await opsAction(`/users/${user.id}/status`, 'POST', { status: 'suspended', reason }); await reload(); }} />
                ) : (
                  <ActionButton label="Reactivar" done="Cuenta reactivada" needsReason
                    run={async (reason) => { await opsAction(`/users/${user.id}/status`, 'POST', { status: 'active', reason }); await reload(); }} />
                )}
                <ActionButton label="Eliminar cuenta" done="Cuenta eliminada y anonimizada" variant="danger" needsReason
                  reasonLabel="Motivo de la eliminación (p. ej., solicitud del titular)"
                  run={async (reason) => { await opsAction(`/users/${user.id}/status`, 'POST', { status: 'deleted', reason }); await reload(); }} />
              </div>
              <p className="mb-0 mt-2 text-sm text-ink-muted">Eliminar anonimiza el perfil (Ley 787) y conserva la auditoría. No puedes cambiar tu propia cuenta.</p>
            </section>
          )}
        </aside>
      )}
    </div>
  );
}
