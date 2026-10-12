'use client';

import { useState, type FormEvent } from 'react';

type Variant = 'primary' | 'neutral' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-oro text-on-oro',
  neutral: 'border-[1.5px] border-control-border text-ink',
  danger: 'border-[1.5px] border-status-alert text-status-alert',
};

/**
 * Botón de acción del Ops Center. Si `needsReason`, despliega un campo para el motivo
 * (queda en Auditoría) y una confirmación; nunca ejecuta acciones destructivas de un clic.
 */
export function ActionButton({
  label, done, run, variant = 'neutral', needsReason = false, reasonLabel = 'Motivo', disabled = false, disabledHint,
}: {
  label: string;
  done?: string;
  run: (reason?: string) => Promise<void>;
  variant?: Variant;
  needsReason?: boolean;
  reasonLabel?: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function execute(reason?: string) {
    setBusy(true);
    setMsg(null);
    try {
      await run(reason);
      setMsg({ ok: true, text: done ?? 'Hecho' });
      setOpen(false);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const reason = String(new FormData(e.currentTarget).get('reason') ?? '').trim();
    if (reason.length < 5) return setMsg({ ok: false, text: 'Escribe un motivo de al menos 5 caracteres.' });
    execute(reason);
  }

  const btn = `inline-flex h-11 items-center rounded-pill px-4 font-bold disabled:opacity-45 ${styles[variant]}`;

  return (
    <div className="inline-flex flex-col gap-2">
      {!open && (
        <button type="button" className={btn} disabled={disabled || busy} title={disabled ? disabledHint : undefined}
          onClick={() => (needsReason ? setOpen(true) : execute())}>
          {busy ? 'Procesando…' : label}
        </button>
      )}
      {open && (
        <form onSubmit={submit} className="flex w-full max-w-[420px] flex-col gap-2 rounded-m bg-ground p-3">
          <label className="flex flex-col gap-1 font-bold">
            {reasonLabel}
            <textarea name="reason" rows={2} required minLength={5} maxLength={1000}
              className="rounded-m border border-control-border bg-ground-raised p-2 font-normal text-ink" />
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn}>{busy ? 'Procesando…' : `Confirmar: ${label.toLowerCase()}`}</button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-pill px-4 font-bold text-ink">Cancelar</button>
          </div>
        </form>
      )}
      {msg && <p role={msg.ok ? 'status' : 'alert'} className={`m-0 text-sm ${msg.ok ? 'text-status-verified' : 'text-status-alert'}`}>{msg.text}</p>}
    </div>
  );
}
