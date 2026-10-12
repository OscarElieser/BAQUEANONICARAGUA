import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

/**
 * "Qué está comprobado": toda ficha lo muestra antes de su descripción.
 * El color acompaña al texto; nunca lo sustituye.
 */
export type FieldState =
  | { kind: 'verified'; date: string }
  | { kind: 'approximate' }
  | { kind: 'pending' }
  | { kind: 'unconfirmed' }
  | { kind: 'ask_provider' }
  | { kind: 'restricted'; note?: string; noteKey?: MessageKey }; // Aviso escrito por el equipo (note) o texto traducible (noteKey)

export type VerificationRow = { field: MessageKey; state: FieldState }; // El campo es una clave de traducción (field.*)

const formatDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function StateText({ state, locale }: { state: FieldState; locale: string }) {
  switch (state.kind) {
    case 'verified':
      return <span className="text-status-verified">{t(locale, 'ficha.checked_on', { date: formatDate(state.date, locale) })}</span>; // Comprobado con fecha
    case 'approximate':
      return <span className="text-oro-text">{t(locale, 'ficha.approximate')}</span>; // Aproximada
    case 'pending':
      return <span className="text-oro-text">{t(locale, 'ficha.pending')}</span>; // Pendiente
    case 'unconfirmed':
      return <span className="text-ink-muted">{t(locale, 'ficha.unconfirmed')}</span>; // Sin confirmar
    case 'ask_provider':
      return <span className="text-ink-muted">{t(locale, 'ficha.ask_provider')}</span>; // Consultar al prestador
    case 'restricted':
      return <span className="text-status-alert">{state.noteKey ? t(locale, state.noteKey) : state.note}</span>; // Aviso traducido o escrito por el equipo
  }
}

export function EstadoVerificacion({
  rows,
  sourceHref,
  locale = 'es',
}: {
  rows: VerificationRow[];
  sourceHref?: string;
  locale?: string;
}) {
  return (
    <section aria-labelledby="estado-verificacion" className="rounded-m bg-ground-raised px-4 pb-1.5 pt-4">
      <h2 id="estado-verificacion" className="mb-2 text-base font-bold">
        {t(locale, 'ficha.verified_title')} {/* Título */}
      </h2>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.field} className="flex justify-between gap-3 border-t border-line py-2.5 text-[15px]">
            <span>{t(locale, r.field)}</span> {/* Nombre del campo */}
            <StateText state={r.state} locale={locale} />
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-line py-2.5 text-[15px]">
          <span>{t(locale, 'ficha.source')}</span> {/* Fila de la fuente */}
          {sourceHref ? <a href={sourceHref}>{t(locale, 'ficha.see_source')}</a> : <span className="text-oro-text">{t(locale, 'ficha.source_pending')}</span>} {/* Enlace o pendiente */}
        </li>
      </ul>
    </section>
  );
}
