'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { isFirebaseConfigured } from '@/lib/firebase';
import { t } from '@/i18n/t'; // Textos traducidos

/** Consulta a un negocio por la mensajería de la plataforma. */
export function EscribirNegocio({ businessId, businessName, locale }: { businessId: string; businessName: string; locale: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'sent'; id: string } | { kind: 'error'; msg: string }>({ kind: 'idle' });

  if (!isFirebaseConfigured) {
    return <p className="m-0 text-sm text-ink-muted">{t(locale, 'business.messaging_off')}</p>;
  }
  if (state.kind === 'sent') {
    return (
      <p role="status" className="m-0">
        {t(locale, 'business.sent')} <Link href={`/${locale}/mensajes?c=${state.id}`}>{t(locale, 'business.see_conversation')}</Link>
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="flex h-[52px] items-center rounded-pill border-[1.5px] border-control-border px-6 font-bold text-ink">
        {t(locale, 'business.write')} {/* Abre el formulario */}
      </button>
    );
  }

  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = String(new FormData(e.currentTarget).get('body') ?? '').trim();
    if (body.length < 2) return setState({ kind: 'error', msg: t(locale, 'business.write_something') }); // Mensaje vacío
    setState({ kind: 'sending' });
    try {
      const r = await api<{ conversation_id: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ business_id: businessId, body }),
      });
      setState({ kind: 'sent', id: r.conversation_id });
    } catch (err) {
      setState({ kind: 'error', msg: (err as Error).message });
    }
  }

  return (
    <form onSubmit={send} className="flex w-full max-w-[560px] flex-col gap-2">
      <label htmlFor="msg" className="font-bold">{t(locale, 'business.message_for', { name: businessName })}</label>
      <textarea id="msg" name="body" rows={4} maxLength={8000} required
        className="rounded-m border border-control-border bg-ground-raised p-4 text-base text-ink" />
      {state.kind === 'error' && <p role="alert" className="m-0 text-status-alert">{state.msg}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={state.kind === 'sending'} className="h-[52px] rounded-pill bg-oro px-6 font-bold text-on-oro disabled:opacity-45">
          {state.kind === 'sending' ? t(locale, 'business.sending') : t(locale, 'business.send')}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-[52px] rounded-pill px-5 font-bold text-ink">{t(locale, 'business.cancel')}</button>
      </div>
      <p className="m-0 text-sm text-ink-muted">{t(locale, 'business.no_e2e')}</p>
    </form>
  );
}
