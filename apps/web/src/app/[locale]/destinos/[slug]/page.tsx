import Link from 'next/link';
import { SpriteMapa } from '@/components/SpriteMapa'; // Formas del mapa (las portadas las reutilizan)
import { BotonFavorito } from '@/components/BotonFavorito'; // Guardar en favoritos
import { notFound } from 'next/navigation';
import { Boleto, TalonTarifa } from '@/components/Boleto'; // Cabecera en forma de boleto y tarifas como talones
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { getDestination, reportedByKey } from '@/lib/catalog'; // Datos de la ficha y quién informó cada tarifa
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { absolute, jsonLd, pageMetadata } from '@/lib/seo'; // Canónica, idiomas, vista previa y datos estructurados

export const revalidate = 1800;

/** Metadatos de la ficha de destino. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; // Idioma y destino
  const data = await getDestination(slug); // Datos publicados
  if (!data) return {}; // No existe: la página dará 404
  const d = data.destination as { name: string; summary?: string | null }; // Nombre y resumen
  return pageMetadata(locale, `/destinos/${slug}`, d.name, d.summary || t(locale, 'destination.meta_desc', { name: d.name })); // Metadatos
}

export default async function DestinoPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getDestination(slug);
  if (!data) notFound();
  const { destination: d, prices, rows, sourceHref, territory } = data; // Ficha, tarifas, verificación, fuente y territorio
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));

  const structured = {
    '@context': 'https://schema.org', // Vocabulario de datos estructurados
    '@type': 'TouristAttraction', // Lugar turístico
    name: d.name, // Nombre
    ...(d.summary ? { description: d.summary } : {}), // Resumen, si existe
    url: absolute(locale, `/destinos/${slug}`), // Dirección de la ficha
    containedInPlace: { '@type': 'Country', name: 'Nicaragua' }, // País
  }; // Datos estructurados (sin coordenadas ni horarios que no estén comprobados)
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
      <SpriteMapa /> {/* Formas del mapa para la portada */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} /> {/* Datos para buscadores */}
      <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
        <Link href={`/${locale}`}>{t(locale, 'nav.discover')}</Link>
      </nav>
      <Boleto locale={locale} territory={territory}>
        <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[60px]">{d.name}</h1> {/* Nombre del destino */}
        {d.summary && <p className="mb-0 mt-4 max-w-[var(--measure)] text-[19px] leading-[30px] text-ink-muted">{d.summary}</p>} {/* Resumen */}
        <div className="mt-5"><BotonFavorito locale={locale} tipo="destino" id={(d as unknown as { id: string }).id} /></div> {/* Guardar en favoritos (misma lista que la app) */}
      </Boleto>

      <div className="mt-8 flex flex-wrap gap-10">
        <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
          {d.description_md && <div className="whitespace-pre-line text-[17px] leading-[28px]">{d.description_md}</div>}

          {d.access_notes && (
            <section className="mt-8">
              <h2 className="mb-3 mt-0 font-display text-[26px] font-normal">{t(locale, 'destination.access')}</h2>
              <p className="whitespace-pre-line">{d.access_notes}</p>
            </section>
          )}
          {d.environmental_notes && (
            <section className="mt-8">
              <h2 className="mb-3 mt-0 font-display text-[26px] font-normal">{t(locale, 'destination.care')}</h2>
              <p className="whitespace-pre-line">{d.environmental_notes}</p>
            </section>
          )}
          <section className="mt-8">
            <h2 className="mb-3 mt-0 font-display text-[26px] font-normal">{t(locale, 'field.prices')}</h2>
            {prices.length === 0 ? (
              <p className="text-ink-muted">{t(locale, 'prices.none')}</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {prices.map((p) => (
                  <TalonTarifa
                    key={p.label} // Una tarifa
                    label={p.label} // Concepto
                    amount={`${money(p.amount, p.currency)}${p.unit ? ` ${p.unit}` : ''}`} // Monto y unidad
                    note={t(locale, 'prices.observed', { date: date(p.observed_at), who: t(locale, reportedByKey[p.reported_by]) })} // Fecha y fuente
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside className="min-w-0 flex-[1_1_300px]">
          <EstadoVerificacion rows={rows} sourceHref={sourceHref} locale={locale} />
        </aside>
      </div>
    </main>
  );
}
