'use client'; // Componente interactivo del navegador

import { useMemo, useState } from 'react'; // Estado y cálculo memorizado
import { budgetBreakdown, parseTripIntent, type Interest } from '@nica/ai-core'; // Intérprete del viaje (mismo que Android)
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

type Missing = ReturnType<typeof parseTripIntent>['missing'][number]; // Datos que pueden faltar

/**
 * Primer paso de "Mi aventura": interpreta el viaje en el propio navegador (funciona sin
 * conexión) y pregunta solo lo que falta. El itinerario con rutas y costos llega cuando
 * se conecten el catálogo publicado y el proveedor de rutas.
 */
export function Planificador({ locale }: { locale: string }) {
  const [text, setText] = useState(''); // Texto escrito
  const [submitted, setSubmitted] = useState(''); // Texto enviado a interpretar
  const intent = useMemo(() => (submitted ? parseTripIntent(submitted) : null), [submitted]); // Lo entendido
  const budget = intent ? budgetBreakdown(intent) : null; // Desglose del presupuesto
  const example = t(locale, 'planner.example'); // Ejemplo en un idioma que el intérprete entiende
  const understoodLanguage = locale === 'es' || locale === 'en'; // El intérprete entiende español e inglés
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(n); // Dinero con su moneda
  const notGiven = <span className="text-oro-text">{t(locale, 'planner.not_given')}</span>; // Dato faltante, en oro

  return (
    <div className="flex flex-wrap gap-10">
      <form
        className="flex min-w-0 flex-[1_1_380px] flex-col gap-3" // Columna del formulario
        onSubmit={(e) => {
          e.preventDefault(); // Sin recargar la página
          setSubmitted(text.trim()); // Interpreta lo escrito
        }}
      >
        <label htmlFor="viaje" className="text-[19px] font-bold">{t(locale, 'planner.label')}</label> {/* Etiqueta del campo */}
        {!understoodLanguage && <p className="m-0 text-[15px] text-ink-muted">{t(locale, 'planner.languages_note')}</p>} {/* Aviso honesto de idiomas */}
        <textarea
          id="viaje" // Enlaza con la etiqueta
          rows={5} // Alto inicial
          maxLength={2000} // Límite
          value={text} // Texto actual
          placeholder={example} // Ejemplo
          lang={understoodLanguage ? locale : 'en'} // Idioma del ejemplo, para lectores de pantalla
          onChange={(e) => setText(e.target.value)} // Actualiza el texto
          className="rounded-m border border-control-border bg-ground-raised p-4 text-[17px] leading-[26px] text-ink"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={text.trim().length < 2} className="h-[52px] rounded-pill bg-oro px-7 font-bold text-on-oro disabled:opacity-45">
            {t(locale, 'planner.understand')} {/* Interpreta el viaje */}
          </button>
          <button
            type="button" // No envía el formulario
            onClick={() => {
              setText(example); // Escribe el ejemplo
              setSubmitted(example); // Y lo interpreta
            }}
            className="h-11 rounded-pill px-4 font-bold text-ink underline"
          >
            {t(locale, 'planner.try_example')} {/* Probar con el ejemplo */}
          </button>
        </div>
      </form>

      <section aria-live="polite" aria-labelledby="entendi" className="min-w-0 flex-[1_1_380px]">
        {!intent ? (
          <p className="text-ink-muted">{t(locale, 'planner.hint')}</p> // Instrucción antes de enviar
        ) : (
          <div className="rounded-m bg-ground-raised p-5">
            <h2 id="entendi" className="mt-0 text-[20px] font-bold">{t(locale, 'planner.understood')}</h2> {/* Título del resultado */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0 text-[17px]">
              {/* Personas */}
              <li>{t(locale, 'planner.travelers')}: {intent.travelers ?? notGiven}</li>
              {/* Días */}
              <li>{t(locale, 'planner.days')}: {intent.days ?? notGiven}</li>
              <li>
                {t(locale, 'planner.budget')}:{' '}
                {budget ? (
                  [
                    t(locale, 'planner.total', { amount: money(budget.total, budget.currency) }), // Total
                    budget.perPerson != null ? t(locale, 'planner.per_person', { amount: money(budget.perPerson, budget.currency) }) : null, // Por persona
                    budget.perPersonPerDay != null ? t(locale, 'planner.per_person_day', { amount: money(budget.perPersonPerDay, budget.currency) }) : null, // Por persona al día
                  ]
                    .filter(Boolean) // Solo lo que se pudo calcular
                    .join(', ') // Separado por comas
                ) : intent.budget ? (
                  <span className="text-oro-text">{t(locale, 'planner.currency_missing', { amount: intent.budget.amount })}</span> // Hay cantidad pero falta la moneda
                ) : (
                  notGiven // Sin presupuesto
                )}
              </li>
              <li>
                {t(locale, 'planner.interests')}: {intent.interests.length ? intent.interests.map((i: Interest) => t(locale, `interest.${i}` as MessageKey)).join(', ') : notGiven} {/* Intereses */}
              </li>
              {/* Accesibilidad */}
              {intent.accessibilityNeeds && <li>{t(locale, 'planner.accessibility')}: {t(locale, 'planner.accessibility_note')}</li>}
            </ul>
            {intent.missing.length > 0 && (
              <>
                <h3 className="mb-2 mt-5 text-[17px] font-bold">{t(locale, 'planner.missing_title')}</h3> {/* Lo que falta */}
                <ul className="m-0 pl-5">
                  {/* Máximo dos preguntas a la vez */}
                  {intent.missing.slice(0, 2).map((m: Missing) => <li key={m}>{t(locale, `question.${m}` as MessageKey)}</li>)}
                </ul>
              </>
            )}
            <p className="mb-0 mt-5 text-sm text-ink-muted">{t(locale, 'planner.promise')}</p> {/* Promesa honesta */}
          </div>
        )}
      </section>
    </div>
  );
}
