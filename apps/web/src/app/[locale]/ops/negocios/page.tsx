'use client';

import Link from 'next/link';
import { use, useState } from 'react';
import { ActionButton } from '@/ops/ActionButton';
import { opsAction, useOpsData } from '@/ops/useOps';

type Verification = { id: string; subject_id: string; risk_level: 'low' | 'standard' | 'high'; state: string; created_at: string };
type Claim = { id: string; business_id: string; claimant_id: string; state: string; created_at: string; evidence_paths: string[] };

const RISK = { low: 'Riesgo bajo', standard: 'Riesgo estándar', high: 'Riesgo alto' } as const;
const SCOPES: Array<[string, string]> = [['identity', 'Identidad'], ['location', 'Ubicación'], ['operating_permit', 'Permiso de operación'], ['tourism_license', 'Licencia turística']];

export default function Negocios({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [tab, setTab] = useState<'verificacion' | 'reclamaciones'>('verificacion');
  const [scope, setScope] = useState<Record<string, string[]>>({});
  const verifications = useOpsData<Verification[]>(tab === 'verificacion' ? '/verifications' : null);
  const claims = useOpsData<Claim[]>(tab === 'reclamaciones' ? '/claims' : null);

  const toggle = (id: string, s: string) =>
    setScope((prev) => ({ ...prev, [id]: (prev[id] ?? []).includes(s) ? (prev[id] ?? []).filter((x) => x !== s) : [...(prev[id] ?? []), s] }));

  const review = (id: string, decision: 'approve' | 'reject' | 'needs_info') => async (reason?: string) => {
    await opsAction(`/verifications/${id}`, 'POST', { decision, reason, verified_scope: decision === 'approve' ? scope[id] ?? [] : [] });
    await verifications.reload();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 font-display text-[36px] font-normal">Negocios</h1>
        <nav aria-label="Vistas de negocios" className="flex gap-1 rounded-pill bg-ground-raised p-1">
          {(['verificacion', 'reclamaciones'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
              className={`rounded-pill px-4 py-2 font-bold ${tab === t ? 'bg-ink text-ground' : 'text-ink'}`}>
              {t === 'verificacion' ? 'Verificación' : 'Reclamaciones'}
            </button>
          ))}
          <Link href={`/${locale}/ops/r/businesses`} className="rounded-pill px-4 py-2 font-bold text-ink no-underline">Todos los negocios</Link>
        </nav>
      </div>

      {tab === 'verificacion' && (
        <section aria-label="Cola de verificación" className="mt-5">
          {verifications.error && <p role="alert" className="text-status-alert">{verifications.error}</p>}
          {verifications.data?.length === 0 && <p className="text-ink-muted">No hay solicitudes pendientes.</p>}
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {(verifications.data ?? []).map((v) => (
              <li key={v.id} className="flex flex-col gap-3 rounded-m bg-ground-raised p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <Link href={`/${locale}/ops/r/businesses`} className="font-bold">Negocio {v.subject_id.slice(0, 8)}</Link>
                  <span className={`text-sm font-bold ${v.risk_level === 'high' ? 'text-status-alert' : 'text-ink-muted'}`}>{RISK[v.risk_level]}, enviado el {new Date(v.created_at).toLocaleDateString()}</span>
                </div>
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-1 font-bold">Qué se comprobó (se muestra en la ficha pública)</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-1">
                    {SCOPES.map(([s, l]) => (
                      <label key={s} className="flex min-h-10 items-center gap-2">
                        <input type="checkbox" checked={(scope[v.id] ?? []).includes(s)} onChange={() => toggle(v.id, s)} className="h-5 w-5" />{l}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <ActionButton label="Aprobar" done="Aprobado y publicado" variant="primary" needsReason reasonLabel="Motivo (lo lee el solicitante)" run={review(v.id, 'approve')} />
                  <ActionButton label="Pedir información" done="Información solicitada" needsReason reasonLabel="Qué información falta" run={review(v.id, 'needs_info')} />
                  <ActionButton label="Rechazar" done="Rechazado" variant="danger" needsReason reasonLabel="Motivo del rechazo" run={review(v.id, 'reject')} />
                </div>
                <p className="m-0 text-sm text-ink-muted">Sin alcance marcado se publica como “perfil reclamado”; con alcance, como “negocio verificado”. Requiere verificación en dos pasos.</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'reclamaciones' && (
        <section aria-label="Reclamaciones de fichas" className="mt-5">
          {claims.error && <p role="alert" className="text-status-alert">{claims.error}</p>}
          {claims.data?.length === 0 && <p className="text-ink-muted">No hay reclamaciones pendientes.</p>}
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {(claims.data ?? []).map((c) => (
              <li key={c.id} className="flex flex-col gap-3 rounded-m bg-ground-raised p-5">
                <p className="m-0"><strong>Ficha {c.business_id.slice(0, 8)}</strong> reclamada el {new Date(c.created_at).toLocaleDateString()}. Evidencias: {c.evidence_paths.length}.</p>
                <div className="flex flex-wrap gap-2">
                  <ActionButton label="Aprobar" done="Reclamación aprobada" variant="primary" needsReason
                    run={async (reason) => { await opsAction(`/claims/${c.id}`, 'POST', { decision: 'approve', reason }); await claims.reload(); }} />
                  <ActionButton label="Pedir información" done="Información solicitada" needsReason
                    run={async (reason) => { await opsAction(`/claims/${c.id}`, 'POST', { decision: 'needs_info', reason }); await claims.reload(); }} />
                  <ActionButton label="Rechazar" done="Reclamación rechazada" variant="danger" needsReason
                    run={async (reason) => { await opsAction(`/claims/${c.id}`, 'POST', { decision: 'reject', reason }); await claims.reload(); }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
