'use client';

import { useState, type FormEvent } from 'react';
import { ActionButton } from '@/ops/ActionButton';
import { opsAction, useOpsData } from '@/ops/useOps';

type Incident = { id: string; category: string; state: string; is_urgent: boolean; department_id: number | null; created_at: string };

const CATEGORY: Record<string, string> = {
  pollution: 'Contaminación', environmental_damage: 'Daño ambiental', animal_abuse: 'Maltrato de fauna',
  tourism_irregularity: 'Irregularidad turística', misleading_info: 'Información engañosa', trail_risk: 'Riesgo en sendero',
  harassment: 'Acoso', safety: 'Seguridad', other: 'Otro',
};
const STATE: Record<string, string> = {
  received: 'Recibida', in_review: 'En revisión', needs_info: 'Requiere información', referred: 'Derivada', resolved: 'Resuelta', closed: 'Cerrada',
};
const NEXT: Record<string, string[]> = {
  received: ['in_review', 'closed'],
  in_review: ['needs_info', 'referred', 'resolved', 'closed'],
  needs_info: ['in_review', 'closed'],
  referred: ['resolved', 'closed'],
  resolved: ['closed'],
};

export default function Denuncias() {
  const { data, error, loading, reload } = useOpsData<Incident[]>('/incidents');
  const [openId, setOpenId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function changeState(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg(null);
    try {
      await opsAction(`/incidents/${id}/state`, 'POST', {
        to: String(f.get('to')), note: String(f.get('note') ?? ''), visible_to_reporter: f.get('visible') === 'on',
      });
      setMsg('Estado actualizado.');
      await reload();
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  async function prepare(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setMsg(null);
    try {
      await opsAction(`/incidents/${id}/referrals`, 'POST', {
        institution: String(f.get('institution')), channel: String(f.get('channel')),
        channel_doc_ref: String(f.get('doc')), consent_at: new Date(String(f.get('consent'))).toISOString(),
      });
      setMsg('Remisión preparada. Registra el acuse cuando la institución lo devuelva.');
    } catch (err) {
      setMsg((err as Error).message);
    }
  }

  const field = 'h-11 rounded-[12px] border border-control-border bg-ground-raised px-3 text-base font-normal text-ink';

  return (
    <>
      <h1 className="m-0 font-display text-[36px] font-normal">Denuncias</h1>
      <p className="mt-2 text-ink-muted">Expedientes abiertos, las urgentes primero. Requiere verificación en dos pasos. Nunca se publican.</p>
      {error && <p role="alert" className="text-status-alert">{error}</p>}
      {loading && !data && <p className="text-ink-muted">Cargando…</p>}
      {data?.length === 0 && <p className="text-ink-muted">No hay expedientes abiertos.</p>}
      {msg && <p role="status" className="font-bold">{msg}</p>}
      <ul className="m-0 mt-5 flex list-none flex-col gap-4 p-0">
        {(data ?? []).map((i) => (
          <li key={i.id} className="flex flex-col gap-3 rounded-m bg-ground-raised p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{CATEGORY[i.category] ?? i.category}</strong>
              <span className="flex gap-2">
                {i.is_urgent && <span className="rounded-pill bg-status-alert px-3 py-0.5 text-sm font-bold text-white">Urgente</span>}
                <span className="rounded-pill bg-ground px-3 py-0.5 text-sm font-bold">{STATE[i.state]}</span>
              </span>
            </div>
            <p className="m-0 text-sm text-ink-muted">Recibida el {new Date(i.created_at).toLocaleString()}.</p>
            <button type="button" onClick={() => setOpenId(openId === i.id ? null : i.id)} className="h-11 self-start font-bold text-accent underline">
              {openId === i.id ? 'Cerrar expediente' : 'Gestionar expediente'}
            </button>
            {openId === i.id && (
              <div className="flex flex-wrap gap-6">
                <form onSubmit={(e) => changeState(e, i.id)} className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
                  <h3 className="m-0 text-lg">Cambiar estado</h3>
                  <label className="flex flex-col gap-1 font-bold">Nuevo estado
                    <select name="to" className={field}>{(NEXT[i.state] ?? []).map((s) => <option key={s} value={s}>{STATE[s]}</option>)}</select>
                  </label>
                  <label className="flex flex-col gap-1 font-bold">Nota
                    <textarea name="note" rows={3} required minLength={5} className="rounded-[12px] border border-control-border bg-ground-raised p-3 font-normal text-ink" />
                  </label>
                  <label className="flex min-h-10 items-center gap-2"><input type="checkbox" name="visible" defaultChecked className="h-5 w-5" />Visible para el denunciante</label>
                  <button type="submit" className="h-11 self-start rounded-pill bg-oro px-4 font-bold text-on-oro">Guardar cambio de estado</button>
                  <p className="m-0 text-sm text-ink-muted">“Derivada” solo se acepta si hay una remisión transmitida con acuse.</p>
                </form>
                <form onSubmit={(e) => prepare(e, i.id)} className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
                  <h3 className="m-0 text-lg">Preparar remisión</h3>
                  <label className="flex flex-col gap-1 font-bold">Institución<input name="institution" required className={field} /></label>
                  <label className="flex flex-col gap-1 font-bold">Canal oficial<input name="channel" required className={field} /></label>
                  <label className="flex flex-col gap-1 font-bold">Documento que respalda el canal<input name="doc" required className={field} /></label>
                  <label className="flex flex-col gap-1 font-bold">Fecha del consentimiento del denunciante<input name="consent" type="datetime-local" required className={field} /></label>
                  <button type="submit" className="h-11 self-start rounded-pill border-[1.5px] border-control-border px-4 font-bold">Preparar remisión</button>
                </form>
              </div>
            )}
          </li>
        ))}
      </ul>
      <section className="mt-8 rounded-m bg-ground-raised p-5">
        <h2 className="m-0 text-lg">Registrar el resultado de una transmisión</h2>
        <p className="text-sm text-ink-muted">Cuando la institución devuelva el acuse, regístralo con el identificador de la remisión.</p>
        <TransmissionForm />
      </section>
    </>
  );
}

function TransmissionForm() {
  const [id, setId] = useState('');
  const [receipt, setReceipt] = useState('');
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 font-bold">Remisión (UUID)<input value={id} onChange={(e) => setId(e.target.value)} className="h-11 rounded-[12px] border border-control-border bg-ground-raised px-3 font-normal text-ink" /></label>
      <label className="flex flex-col gap-1 font-bold">Acuse<input value={receipt} onChange={(e) => setReceipt(e.target.value)} className="h-11 rounded-[12px] border border-control-border bg-ground-raised px-3 font-normal text-ink" /></label>
      <ActionButton label="Transmitida con acuse" done="Transmisión registrada" variant="primary" disabled={!id || !receipt}
        run={() => opsAction(`/referrals/${id}/transmission`, 'POST', { succeeded: true, receipt })} />
      <ActionButton label="No se pudo transmitir" done="Fallo registrado" variant="danger" disabled={!id}
        run={() => opsAction(`/referrals/${id}/transmission`, 'POST', { succeeded: false })} />
    </div>
  );
}
