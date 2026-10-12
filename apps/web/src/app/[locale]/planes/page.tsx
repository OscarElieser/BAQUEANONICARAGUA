// Planes de suscripción para negocios. Los nombres, precios (en córdobas y en dólares) y beneficios salen de
// config/planes-negocios.json, que define el dueño. Lo que falta se muestra como "Por definir" y no se cobra nada:
// todavía no hay pasarela de pago, así que los botones dicen "No disponible todavía".
import Link from 'next/link'; // Enlaces internos
import type { Metadata } from 'next'; // Tipo de los metadatos
import planes from '@/config/planes-negocios.json'; // Planes definidos por el dueño
import { t } from '@/i18n/t'; // Textos traducidos

type Plan = { id: string; nombre: string | null; resumen: string | null; precio_nio: number | null; precio_usd: number | null; periodo: string; beneficios: string[]; destacado: boolean; contacto: boolean }; // Forma de un plan

/** Mientras los planes no estén confirmados, los buscadores no indexan la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return { title: t(locale, 'plans.title'), robots: planes.confirmado ? undefined : { index: false, follow: true } }; // Título y regla para buscadores
}

/** Precio en una moneda, con el formato del idioma; si falta, "Por definir". */
function precio(locale: string, valor: number | null, moneda: 'NIO' | 'USD') {
  if (valor === null) return null; // Aún no definido
  const simbolo = moneda === 'NIO' ? 'C$' : 'US$'; // Símbolos usados en Nicaragua
  return `${simbolo} ${valor.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`; // Ej.: C$ 1,500
}

export default async function Planes({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  const lista = planes.planes as Plan[]; // Planes
  return (
    <main className="tema-noche planes-escena">
      <div className="mx-auto max-w-[1180px] px-4">
        <header className="mx-auto max-w-[60ch] text-center">
          <h1 className="planes-titulo">{t(locale, 'plans.title')}</h1> {/* Título */}
          <p className="mt-3 text-[17px] leading-[27px] text-ink-muted">{t(locale, 'plans.intro')}</p> {/* Para quién son */}
          {!planes.confirmado && <p role="note" className="planes-aviso">{t(locale, 'plans.pending_banner')}</p>} {/* Aviso honesto: aún sin definir */}
        </header>

        <ul className="planes-lista">
          {lista.map((p, i) => {
            const nio = precio(locale, p.precio_nio, 'NIO'), usd = precio(locale, p.precio_usd, 'USD'); // Precios en las dos monedas
            return (
              <li key={p.id} className={`plan-tarjeta ${p.destacado ? 'plan-destacado' : ''}`}>
                <span aria-hidden="true" className={`plan-orbe orbe-${i}`} /> {/* Esfera de color de marca (decoración) */}
                {p.destacado && <span className="plan-insignia">{t(locale, 'plans.featured')}</span>} {/* Destacado */}
                <h2 className="m-0 mt-4 text-[22px] font-bold">{p.nombre ?? t(locale, 'plans.name_pending')}</h2> {/* Nombre */}
                <p className="m-0 mt-1 text-[15px] text-ink-muted">{p.resumen ?? t(locale, 'plans.summary_pending')}</p> {/* Resumen */}
                <p className="plan-precio">
                  {nio ?? `C$ ${t(locale, 'plans.price_pending')}`} {/* Precio en córdobas */}
                  {nio && <span className="plan-periodo"> {t(locale, 'plans.per_month')}</span>} {/* Por mes */}
                </p>
                <p className="m-0 text-[15px] text-ink-muted">{usd ?? `US$ ${t(locale, 'plans.price_pending')}`}</p> {/* Precio en dólares */}
                {p.contacto ? (
                  <Link href={`/${locale}/contacto`} className="plan-boton">{t(locale, 'plans.contact')}</Link> // Lleva a la página de contacto
                ) : (
                  <button type="button" disabled className="plan-boton">{t(locale, 'plans.unavailable')}</button> // Sin pasarela de pago todavía
                )}
                <ul className="plan-beneficios">
                  {p.beneficios.length === 0 ? (
                    <li className="text-ink-muted">{t(locale, 'plans.benefits_pending')}</li> // Sin beneficios confirmados
                  ) : (
                    p.beneficios.map((b) => <li key={b}>{b}</li>) // Beneficios reales
                  )}
                </ul>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-center text-sm text-ink-muted">{t(locale, 'plans.currencies_note')}</p> {/* Las dos monedas */}
      </div>
    </main>
  );
}
