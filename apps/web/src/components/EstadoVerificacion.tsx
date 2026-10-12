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
  | { kind: 'restricted'; note: string };

export type VerificationRow = { field: string; state: FieldState };

const formatDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

function StateText({ state, locale }: { state: FieldState; locale: string }) {
  switch (state.kind) {
    case 'verified':
      return <span className="text-status-verified">Comprobado el {formatDate(state.date, locale)}</span>;
    case 'approximate':
      return <span className="text-oro-text">Aproximada</span>;
    case 'pending':
      return <span className="text-oro-text">Pendiente</span>;
    case 'unconfirmed':
      return <span className="text-ink-muted">Sin confirmar</span>;
    case 'ask_provider':
      return <span className="text-ink-muted">Consulta al prestador</span>;
    case 'restricted':
      return <span className="text-status-alert">{state.note}</span>;
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
        Qué está comprobado
      </h2>
      <ul className="m-0 list-none p-0">
        {rows.map((r) => (
          <li key={r.field} className="flex justify-between gap-3 border-t border-line py-2.5 text-[15px]">
            <span>{r.field}</span>
            <StateText state={r.state} locale={locale} />
          </li>
        ))}
        <li className="flex justify-between gap-3 border-t border-line py-2.5 text-[15px]">
          <span>Fuente</span>
          {sourceHref ? <a href={sourceHref}>Ver fuente</a> : <span className="text-oro-text">Pendiente de citar</span>}
        </li>
      </ul>
    </section>
  );
}
