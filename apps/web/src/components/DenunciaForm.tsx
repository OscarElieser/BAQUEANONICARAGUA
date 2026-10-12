'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { isFirebaseConfigured } from '@/lib/firebase';

const categories = [
  { value: 'pollution', label: 'Contaminación' },
  { value: 'environmental_damage', label: 'Daño ambiental' },
  { value: 'animal_abuse', label: 'Maltrato de fauna' },
  { value: 'trail_risk', label: 'Riesgo en un sendero' },
  { value: 'tourism_irregularity', label: 'Irregularidad turística' },
  { value: 'misleading_info', label: 'Información engañosa' },
  { value: 'harassment', label: 'Acoso o comportamiento inadecuado' },
  { value: 'safety', label: 'Incidente de seguridad' },
  { value: 'other', label: 'Otro' },
];

type Result = { id: string; urgent_guidance: string | null };

export function DenunciaForm() {
  const [state, setState] = useState<{ kind: 'idle' | 'sending' } | { kind: 'done'; r: Result } | { kind: 'error'; msg: string }>({ kind: 'idle' });

  if (!isFirebaseConfigured) {
    return <p className="rounded-m bg-ground-raised p-5 font-bold">El envío de denuncias se activa con el inicio de sesión (Fase 2). No disponible todavía.</p>;
  }
  if (state.kind === 'done') {
    return (
      <div role="status" className="rounded-m bg-ground-raised p-5">
        <p className="m-0 font-bold">Denuncia recibida.</p>
        <p className="m-0 mt-2 text-ink-muted">Puedes seguir su estado en tu perfil. Te avisaremos cuando cambie.</p>
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
        <label htmlFor="category" className="font-bold">Qué quieres reportar</label>
        <select id="category" name="category" required className="h-[52px] rounded-pill border border-control-border bg-ground-raised px-5 text-base text-ink">
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="font-bold">Qué pasó, dónde y cuándo</label>
        <textarea id="description" name="description" rows={6} minLength={10} maxLength={8000} required
          className="rounded-m border border-control-border bg-ground-raised p-4 text-base text-ink" />
      </div>
      <label className="flex min-h-11 items-center gap-3">
        <input type="checkbox" name="is_urgent" className="h-5 w-5 accent-[var(--terracota)]" />
        Hay riesgo inmediato para alguien
      </label>
      {state.kind === 'error' && <p role="alert" className="m-0 text-status-alert">{state.msg}</p>}
      <button type="submit" disabled={state.kind === 'sending'} className="h-[52px] self-start rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
        {state.kind === 'sending' ? 'Enviando…' : 'Enviar denuncia'}
      </button>
      <p className="m-0 text-sm text-ink-muted">
        Tu denuncia es confidencial y nunca se publica. Solo se remite a una institución con tu consentimiento y por un canal oficial; si eso ocurre, verás el acuse en el seguimiento.
      </p>
    </form>
  );
}
