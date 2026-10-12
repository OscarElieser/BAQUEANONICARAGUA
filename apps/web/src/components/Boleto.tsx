// Boleto de viaje: la cabecera de cada destino tiene forma de boleto con su talón.
// El talón lleva la portada del territorio real donde está el destino (si se conoce) y enlaza a él.
import Link from 'next/link'; // Enlace interno
import type { ReactNode } from 'react'; // Tipo del contenido
import { PortadaTerritorio } from './PortadaTerritorio'; // Portada ilustrada del territorio
import { t } from '@/i18n/t'; // Textos traducidos

type Props = { locale: string; children: ReactNode; territory: { slug: string; name: string } | null }; // Contenido y territorio

export function Boleto({ locale, children, territory }: Props) {
  return (
    <div className="boleto mt-4 grid overflow-hidden sm:grid-cols-[minmax(0,1fr)_240px]">
      <div className="boleto-cuerpo min-w-0 p-6 sm:p-10">{children}</div> {/* Nombre y resumen del destino */}
      <div className="boleto-talon flex flex-col justify-between gap-4 p-6">
        {territory ? (
          <Link href={`/${locale}/territorios/${territory.slug}`} className="block text-ink no-underline">
            <PortadaTerritorio slug={territory.slug} uid="boleto" className="block aspect-[4/5] w-full rounded-[var(--radius-s)]" /> {/* Su territorio */}
            <span className="mt-3 block font-display text-[20px] leading-tight">{t(locale, 'territory.in', { name: territory.name })}</span> {/* En qué territorio está */}
          </Link>
        ) : (
          <span className="text-[14px] text-ink-muted">{t(locale, 'ficha.territory_unknown')}</span> // Sin territorio publicado: se dice
        )}
      </div>
    </div>
  );
}

/** Tarifa como talón de boleto: monto grande, concepto y de quién viene el dato con su fecha. */
export function TalonTarifa({ label, amount, note }: { label: string; amount: string; note: string }) {
  return (
    <li className="talon-tarifa flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-4">
      <span className="font-bold">{label}</span> {/* Concepto */}
      <span className="font-display text-[26px] leading-none">{amount}</span> {/* Monto */}
      <span className="basis-full text-[14px] text-ink-muted">{note}</span> {/* Fecha y fuente del dato */}
    </li>
  );
}
