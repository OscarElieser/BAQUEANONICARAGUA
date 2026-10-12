'use client';

import { useState, type FormEvent } from 'react';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import type { Territory } from '@/lib/territories'; // Tipo de territorio
import { t } from '@/i18n/t'; // Textos traducidos

const categories = ['comedores', 'restaurantes', 'cafeterias', 'hospedaje-familiar', 'ecoalojamiento', 'operadores', 'talleres', 'turismo-rural', 'cafe', 'cacao'] as const; // Categorías de la base de datos (el nombre visible está en category.*)

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

export function RegistrarNegocioForm({ locale, territories }: { locale: string; territories: Territory[] }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  if (!isFirebaseConfigured) {
    return (
      <p className="mt-8 rounded-m bg-ground-raised p-5 font-bold">
        {t(locale, 'register.off')} {/* Aviso honesto */}
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const chosen = form.getAll('categories').map(String);
    if (chosen.length === 0) {
      setState({ kind: 'error', message: t(locale, 'register.choose_category') }); // Falta la categoría
      return;
    }
    const user = firebaseAuth()?.currentUser;
    if (!user) {
      setState({ kind: 'error', message: t(locale, 'register.sign_in') }); // Falta la sesión
      return;
    }
    setState({ kind: 'sending' });
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/businesses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({
          name: String(form.get('name') ?? ''),
          department_id: Number(form.get('department_id')),
          categories: chosen,
          summary: String(form.get('summary') ?? '') || undefined,
        }),
      });
      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        setState({ kind: 'error', message: problem?.detail ?? t(locale, 'register.failed') });
        return;
      }
      setState({ kind: 'done' });
    } catch {
      setState({ kind: 'error', message: t(locale, 'register.offline') }); // Sin red
    }
  }

  if (state.kind === 'done') {
    return (
      <div role="status" className="mt-8 rounded-m bg-ground-raised p-5">
        <p className="m-0 font-bold">{t(locale, 'register.sent')}</p>
        <p className="m-0 mt-2 text-ink-muted">{t(locale, 'register.sent_note')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" lang={locale}>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-bold">{t(locale, 'register.name')}</label>
        <input id="name" name="name" required minLength={2} maxLength={160}
          className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="department_id" className="font-bold">{t(locale, 'register.territory')}</label>
        <select id="department_id" name="department_id" required defaultValue=""
          className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink">
          <option value="" disabled>{t(locale, 'home.choose')}</option>
          {territories.map((ter) => <option key={ter.id} value={ter.id}>{ter.name}</option>)}
        </select>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 font-bold">{t(locale, 'register.offers')}</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {categories.map((c) => (
            <label key={c} className="flex min-h-11 items-center gap-3 rounded-m bg-ground-raised px-4 py-2">
              <input type="checkbox" name="categories" value={c} className="h-5 w-5 accent-[var(--oro)]" />
              {t(locale, `category.${c}`)} {/* Nombre de la categoría */}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="summary" className="font-bold">{t(locale, 'register.summary')}</label>
        <textarea id="summary" name="summary" rows={4} maxLength={500}
          className="rounded-m border border-control-border bg-ground-raised p-4 text-base text-ink" />
      </div>
      {state.kind === 'error' && <p role="alert" className="m-0 text-status-alert">{state.message}</p>}
      <button type="submit" disabled={state.kind === 'sending'}
        className="h-[52px] self-start rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
        {state.kind === 'sending' ? t(locale, 'business.sending') : t(locale, 'register.submit')}
      </button>
    </form>
  );
}
