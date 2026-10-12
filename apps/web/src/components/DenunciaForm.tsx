'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { isFirebaseConfigured } from '@/lib/firebase'; // Si el inicio de sesión está configurado
import { t } from '@/i18n/t'; // Textos traducidos

const categories = ['pollution', 'environmental_damage', 'animal_abuse', 'trail_risk', 'tourism_irregularity', 'misleading_info', 'harassment', 'safety', 'other'] as const; // Categorías de la base de datos (el nombre visible está en report.cat.*)

type Result = { id: string; urgent_guidance: string | null };

export function DenunciaForm({ locale }: { locale: string }) {
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'done'; r: Result } | { kind: 'error'; msg: string }>({ kind: 'idle' });

  if (!isFirebaseConfigured) {
    return <p className="rounded-m bg-ground-raised p-5 font-bold">{t(locale, 'report.off')}</p>;
  }
  if (state.kind === 'done') {
    return (
      <div role="status" className="rounded-m bg-ground-raised p-5">
        <p className="m-0 font-bold">{t(locale, 'report.received')}</p>
        <p className="m-0 mt-2 text-ink-muted">{t(locale, 'report.follow')}</p>
        {state.r.urgent_guidance && <p className="m-0 mt-3 font-bold text-status-alert">{state.r.urgent_guidance}</p>}
      </div>
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ kind: 'sending' });
    try {
      const r = await api<Result>('/incidents', {
        method: 'POST',
        body: JSON.stringify({
          category: String(f.get('category')),
          description: String(f.get('description') ?? ''),
          is_urgent: f.get('is_urgent') === 'on',
        }),
      });
      setState({ kind: 'done', r });
    } catch (err) {
      setState({ kind: 'error', msg: (err as Error).message });
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor="category" className="font-bold">{t(locale, 'report.what')}</label>
        <select id="category" name="category" required className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink">
          {categories.map((c) => <option key={c} value={c}>{t(locale, `report.cat.${c}`)}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="font-bold">{t(locale, 'report.details')}</label>
        <textarea id="description" name="description" rows={6} minLength={10} maxLength={8000} required
          className="rounded-m border border-control-border bg-ground-raised p-4 text-base text-ink" />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="is_urgent" className="h-5 w-5 accent-[var(--terracota)]" />
        {t(locale, 'report.urgent')} {/* Marca de urgencia */}
      </label>
      {state.kind === 'error' && <p role="alert" className="m-0 text-status-alert">{state.msg}</p>}
      <button type="submit" disabled={state.kind === 'sending'} className="h-[52px] self-start rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
        {state.kind === 'sending' ? t(locale, 'business.sending') : t(locale, 'report.send')}
      </button>
      <p className="m-0 text-sm text-ink-muted">
        {t(locale, 'report.privacy')} {/* Cómo se trata la denuncia */}
      </p>
    </form>
  );
}
