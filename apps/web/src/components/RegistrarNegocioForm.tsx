'use client';

import { useState, type FormEvent } from 'react';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import type { Territory } from '@/lib/territories';

const categories = [
  { slug: 'comedores', label: 'Comedor tradicional' },
  { slug: 'restaurantes', label: 'Restaurante' },
  { slug: 'cafeterias', label: 'Cafetería' },
  { slug: 'hospedaje-familiar', label: 'Hospedaje familiar' },
  { slug: 'ecoalojamiento', label: 'Ecoalojamiento' },
  { slug: 'operadores', label: 'Guía u operador turístico' },
  { slug: 'talleres', label: 'Taller artesanal' },
  { slug: 'turismo-rural', label: 'Turismo rural comunitario' },
  { slug: 'cafe', label: 'Experiencia de café' },
  { slug: 'cacao', label: 'Experiencia de cacao' },
];

type State = { kind: 'idle' } | { kind: 'sending' } | { kind: 'done' } | { kind: 'error'; message: string };

export function RegistrarNegocioForm({ locale, territories }: { locale: string; territories: Territory[] }) {
  const [state, setState] = useState<State>({ kind: 'idle' });

  if (!isFirebaseConfigured) {
    return (
      <p className="mt-8 rounded-m bg-ground-raised p-5 font-bold">
        El registro se activa cuando se conecte el inicio de sesión (Fase 2). No disponible todavía.
      </p>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const chosen = form.getAll('categories').map(String);
    if (chosen.length === 0) {
      setState({ kind: 'error', message: 'Elige al menos una categoría.' });
      return;
    }
    const user = firebaseAuth()?.currentUser;
    if (!user) {
      setState({ kind: 'error', message: 'Inicia sesión para registrar tu negocio.' });
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
        setState({ kind: 'error', message: problem?.detail ?? 'No se pudo enviar. Revisa los datos e intenta de nuevo.' });
        return;
      }
      setState({ kind: 'done' });
    } catch {
      setState({ kind: 'error', message: 'Sin conexión. Tus datos siguen en el formulario; intenta de nuevo.' });
    }
  }

  if (state.kind === 'done') {
    return (
      <div role="status" className="mt-8 rounded-m bg-ground-raised p-5">
        <p className="m-0 font-bold">Negocio enviado a revisión.</p>
        <p className="m-0 mt-2 text-ink-muted">Te avisaremos cuando esté publicado. Puedes seguir su estado en tu perfil.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-5" lang={locale}>
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="font-bold">Nombre del negocio</label>
        <input id="name" name="name" required minLength={2} maxLength={160}
          className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink" />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="department_id" className="font-bold">Territorio</label>
        <select id="department_id" name="department_id" required defaultValue=""
          className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink">
          <option value="" disabled>Elige un territorio</option>
          {territories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 font-bold">Qué ofreces (hasta 5)</legend>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {categories.map((c) => (
            <label key={c.slug} className="flex min-h-11 items-center gap-3 rounded-m bg-ground-raised px-4 py-2">
              <input type="checkbox" name="categories" value={c.slug} className="h-5 w-5 accent-[var(--oro)]" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="summary" className="font-bold">Cuéntale a los viajeros qué hacen</label>
        <textarea id="summary" name="summary" rows={4} maxLength={500}
          className="rounded-m border border-control-border bg-ground-raised p-4 text-base text-ink" />
      </div>
      {state.kind === 'error' && <p role="alert" className="m-0 text-status-alert">{state.message}</p>}
      <button type="submit" disabled={state.kind === 'sending'}
        className="h-[52px] self-start rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
        {state.kind === 'sending' ? 'Enviando…' : 'Enviar a revisión'}
      </button>
    </form>
  );
}
