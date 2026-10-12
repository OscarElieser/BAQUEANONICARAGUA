'use client';

import { useMemo, useState } from 'react';
import { budgetBreakdown, parseTripIntent, type Interest } from '@nica/ai-core';

const interestLabel: Record<Interest, string> = {
  beach: 'Playa', food: 'Comida local', small_business: 'Pequeños negocios', nature: 'Naturaleza',
  volcano: 'Volcanes', culture: 'Cultura', history: 'Historia', adventure: 'Aventura',
  coffee: 'Café', nightlife: 'Vida nocturna', family: 'En familia',
};

const questions: Record<string, string> = {
  travelers: '¿Cuántas personas viajan?',
  days: '¿Cuántos días dura el viaje?',
  budget_currency: '¿Tu presupuesto es en dólares o en córdobas?',
  dates: '¿En qué fechas viajan?',
  transport: '¿Tendrán vehículo o usarán transporte público?',
};

const example = 'Vamos cinco días, somos cuatro, tenemos 600 dólares y queremos playa, buena comida y conocer pequeños negocios.';

/**
 * Primer paso de "Mi aventura": interpreta el viaje en el propio navegador (funciona sin
 * conexión) y pregunta solo lo que falta. El itinerario con rutas y costos llega cuando
 * se conecten el catálogo publicado y el proveedor de rutas.
 */
export function Planificador({ locale }: { locale: string }) {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const intent = useMemo(() => (submitted ? parseTripIntent(submitted) : null), [submitted]);
  const budget = intent ? budgetBreakdown(intent) : null;
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="flex flex-wrap gap-10">
      <form
        className="flex min-w-0 flex-[1_1_380px] flex-col gap-3"
        onSubmit={(e) => { e.preventDefault(); setSubmitted(text.trim()); }}
      >
        <label htmlFor="viaje" className="text-[19px] font-bold">Cuéntame tu viaje</label>
        <textarea
          id="viaje" rows={5} maxLength={2000} value={text} placeholder={example}
          onChange={(e) => setText(e.target.value)}
          className="rounded-m border border-control-border bg-ground-raised p-4 text-[17px] leading-[26px] text-ink"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={text.trim().length < 2} className="h-[52px] rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
            Entender mi viaje
          </button>
          <button type="button" onClick={() => { setText(example); setSubmitted(example); }} className="h-11 rounded-pill px-4 font-bold text-ink underline">
            Probar con un ejemplo
          </button>
        </div>
      </form>

      <section aria-live="polite" aria-labelledby="entendi" className="min-w-0 flex-[1_1_380px]">
        {!intent ? (
          <p className="text-ink-muted">Escribe con tus palabras: cuántos son, cuántos días, presupuesto y qué les gusta.</p>
        ) : (
          <div className="rounded-m bg-ground-raised p-5">
            <h2 id="entendi" className="mt-0 text-[20px] font-bold">Esto es lo que entendí</h2>
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[17px]">
              <li>Viajeros: {intent.travelers ?? <span className="text-oro-text">sin indicar</span>}</li>
              <li>Días: {intent.days ?? <span className="text-oro-text">sin indicar</span>}</li>
              <li>
                Presupuesto:{' '}
                {budget
                  ? <>{money(budget.total, budget.currency)} en total{budget.perPerson != null && <>, {money(budget.perPerson, budget.currency)} por persona</>}{budget.perPersonPerDay != null && <> ({money(budget.perPersonPerDay, budget.currency)} por persona al día)</>}</>
                  : intent.budget ? <span className="text-oro-text">{intent.budget.amount}, falta la moneda</span> : <span className="text-oro-text">sin indicar</span>}
              </li>
              <li>Intereses: {intent.interests.length ? intent.interests.map((i) => interestLabel[i]).join(', ') : <span className="text-oro-text">sin indicar</span>}</li>
              {intent.accessibilityNeeds && <li>Necesidades de accesibilidad: sí. Solo sugeriré lugares con accesibilidad comprobada.</li>}
            </ul>
            {intent.missing.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-[17px] font-bold">Para armar rutas reales me falta saber</h3>
                <ul className="m-0 pl-5">
                  {intent.missing.slice(0, 2).map((m) => <li key={m}>{questions[m]}</li>)}
                </ul>
              </>
            )}
            <p className="mb-0 mt-5 text-sm text-ink-muted">
              Solo uso tarifas verificadas. Lo que no tenga precio confirmado aparecerá como “por cotizar”, y los traslados se calculan con un proveedor de mapas.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
