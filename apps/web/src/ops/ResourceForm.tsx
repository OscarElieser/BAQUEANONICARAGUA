'use client';

import { useState, type FormEvent } from 'react';
import type { Field, Resource } from './resources';

const DEPARTMENTS: Array<[number, string]> = [
  [1, 'Boaco'], [2, 'Carazo'], [3, 'Chinandega'], [4, 'Chontales'], [5, 'Estelí'], [6, 'Granada'], [7, 'Jinotega'],
  [8, 'León'], [9, 'Madriz'], [10, 'Managua'], [11, 'Masaya'], [12, 'Matagalpa'], [13, 'Nueva Segovia'],
  [14, 'Río San Juan'], [15, 'Rivas'], [16, 'Costa Caribe Norte'], [17, 'Costa Caribe Sur'],
];

type Row = Record<string, unknown>;

const input = 'h-11 rounded-[12px] border border-control-border bg-ground-raised px-3 text-base font-normal text-ink';

/** Convierte el valor del formulario al tipo que espera la columna. */
function parseValue(field: Field, raw: FormDataEntryValue | null, checked: boolean): unknown {
  const s = typeof raw === 'string' ? raw.trim() : '';
  switch (field.type) {
    case 'boolean': return checked;
    case 'integer': return s === '' ? null : Number.parseInt(s, 10);
    case 'number': return s === '' ? null : Number(s);
    case 'department': return s === '' ? null : Number(s);
    case 'tags': return s === '' ? [] : s.split(',').map((x) => x.trim()).filter(Boolean);
    case 'refs:source': return s === '' ? [] : s.split(/[\s,]+/).filter(Boolean);
    case 'datetime': return s === '' ? null : new Date(s).toISOString();
    default: return s === '' ? null : s;
  }
}

function displayValue(field: Field, v: unknown): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(field.type === 'tags' ? ', ' : ' ');
  if (field.type === 'datetime' && typeof v === 'string') return v.slice(0, 16);
  if (typeof v === 'object') return '';
  return String(v);
}

/** Formulario generado desde la definición del recurso: sin formularios escritos a mano. */
export function ResourceForm({
  resource, row, onSave,
}: {
  resource: Resource;
  row: Row | null;
  onSave: (data: Row, submitForReview: boolean) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const forReview = submitter?.value === 'review';
    const form = e.currentTarget;
    const fd = new FormData(form);
    const data: Row = {};
    for (const f of resource.fields) {
      const el = form.elements.namedItem(f.key) as HTMLInputElement | null;
      const value = parseValue(f, fd.get(f.key), Boolean(el?.checked));
      // En edición solo se envía lo que cambió
      if (row && JSON.stringify(value ?? null) === JSON.stringify(row[f.key] ?? null)) continue;
      if (!row && (value === null || (Array.isArray(value) && value.length === 0))) continue;
      data[f.key] = value;
    }
    const missing = resource.fields.filter((f) => f.required && (row ? row[f.key] == null && data[f.key] == null : data[f.key] == null));
    if (missing.length) return setError(`Completa: ${missing.map((m) => m.label).join(', ')}.`);
    setBusy(true);
    setError(null);
    try {
      await onSave(data, forReview);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
      {resource.fields.map((f) => {
        const value = row ? row[f.key] : undefined;
        const id = `f-${f.key}`;
        const help = f.help ? <span className="text-sm font-normal text-ink-muted">{f.help}</span> : null;
        if (f.type === 'boolean') {
          return (
            <label key={f.key} htmlFor={id} className="flex min-h-10 items-center gap-2.5">
              <input id={id} name={f.key} type="checkbox" defaultChecked={Boolean(value)} className="h-5 w-5" />
              {f.label}
            </label>
          );
        }
        return (
          <label key={f.key} htmlFor={id} className="flex flex-col gap-1.5 font-bold">
            <span>{f.label}{f.required && <span aria-hidden="true"> *</span>}</span>
            {f.type === 'textarea' || f.type === 'markdown' ? (
              <textarea id={id} name={f.key} rows={f.type === 'markdown' ? 6 : 3} maxLength={f.max} defaultValue={displayValue(f, value)}
                className="rounded-[12px] border border-control-border bg-ground-raised p-3 text-base font-normal text-ink" />
            ) : f.type === 'select' ? (
              <select id={id} name={f.key} defaultValue={displayValue(f, value)} className={input}>
                <option value="">Sin definir</option>
                {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'department' ? (
              <select id={id} name={f.key} defaultValue={displayValue(f, value)} className={input}>
                <option value="">Elegir territorio</option>
                {DEPARTMENTS.map(([n, label]) => <option key={n} value={n}>{label}</option>)}
              </select>
            ) : (
              <input
                id={id}
                name={f.key}
                defaultValue={displayValue(f, value)}
                type={f.type === 'integer' || f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime' ? 'datetime-local' : f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : 'text'}
                min={f.min}
                max={f.type === 'integer' || f.type === 'number' ? f.max : undefined}
                maxLength={f.type === 'text' ? f.max : undefined}
                pattern={f.type === 'slug' ? '[a-z0-9-]+' : undefined}
                placeholder={f.type.startsWith('ref') ? 'Identificador (UUID)' : undefined}
                className={input}
              />
            )}
            {help}
          </label>
        );
      })}
      {error && <p role="alert" className="m-0 text-status-alert">{error}</p>}
      <div className="flex flex-wrap gap-2 border-t border-line pt-3.5">
        <button type="submit" value="save" disabled={busy} className="h-11 rounded-pill border-[1.5px] border-control-border px-4 font-bold disabled:opacity-45">
          {busy ? 'Guardando…' : row ? 'Guardar cambios' : `Crear ${resource.singular}`}
        </button>
        {resource.editorial && (
          <button type="submit" value="review" disabled={busy} className="h-11 rounded-pill border-[1.5px] border-control-border px-4 font-bold disabled:opacity-45">
            Guardar y enviar a revisión
          </button>
        )}
      </div>
    </form>
  );
}
