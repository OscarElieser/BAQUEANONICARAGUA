import Link from 'next/link';
import { BotonFavorito } from '@/components/BotonFavorito'; // Guardar en favoritos
import { notFound } from 'next/navigation';
import { EscribirNegocio } from '@/components/EscribirNegocio';
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { FranjaNivel, FranjaTejida } from '@/components/FranjaTejida';
import { contactHref, getBusiness, reportedByKey } from '@/lib/catalog'; // Datos de la ficha, enlaces de contacto y quién informó cada tarifa
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { absolute, jsonLd, pageMetadata } from '@/lib/seo'; // Canónica, idiomas, vista previa y datos estructurados
import { letraComunidad } from '@/app/fuentes'; // Letra de Nuestra gente (Bricolage Grotesque)
import { Pizarra } from '@/components/Pizarra'; // Ofertas como pizarra de pulpería

export const revalidate = 600;

const contactKey: Record<string, MessageKey> = { phone: 'contact.phone', email: 'contact.email', website: 'contact.website' }; // Contactos con nombre traducible
const brandName: Record<string, string> = { whatsapp: 'WhatsApp', facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' }; // Marcas: no se traducen

/** Metadatos de la ficha de negocio. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params; // Idioma y negocio
  const data = await getBusiness(slug); // Datos publicados
  if (!data) return {}; // No existe: la página dará 404
  const b = data.business as { name: string; summary?: string | null }; // Nombre y resumen
  return pageMetadata(locale, `/negocios/${slug}`, b.name, b.summary || t(locale, 'business.meta_desc', { name: b.name })); // Metadatos
}

export default async function NegocioPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getBusiness(slug);
  if (!data) notFound();
  const { business: b, contacts, prices, rows, territory } = data; // Ficha, contactos, tarifas, verificación y territorio
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
  const links = contacts.map((c) => ({ ...c, href: contactHref(c) })).filter((c) => c.href);

  const phone = contacts.find((c) => c.kind === 'phone'); // Teléfono publicado por el negocio (si hay)
  const structured = {
    '@context': 'https://schema.org', // Vocabulario de datos estructurados
    '@type': 'LocalBusiness', // Negocio local
    name: b.name, // Nombre
    ...(b.summary ? { description: b.summary } : {}), // Resumen, si existe
    url: absolute(locale, `/negocios/${slug}`), // Dirección de la ficha
    ...(phone ? { telephone: phone.value } : {}), // Teléfono solo si el negocio lo publicó
    address: { '@type': 'PostalAddress', addressCountry: 'NI' }, // País (la dirección exacta no se inventa)
  }; // Datos estructurados (sin precios, horarios ni reseñas que no estén comprobados)
  return (
    <main className={`${letraComunidad.variable} mundo-comunidad`}>
      {/* Mundo de Nuestra gente: franja de hamaca, letra cálida y pizarra de pulpería */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} /> {/* Datos para buscadores */}
      <FranjaTejida height={28} className="franja-tejiendo" /> {/* La franja se teje al llegar */}
      <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
        <nav aria-label={t(locale, 'nav.breadcrumb')} className="pt-6 text-sm">
          <Link href={`/${locale}/comunidad`}>{t(locale, 'nav.community')}</Link>
        </nav>
        <header className="pt-4">
          {b.is_sponsored && <p className="m-0 mb-2 text-sm font-bold text-oro-text">{t(locale, 'business.sponsored')}</p>}
          <h1 className="m-0 font-mundo text-[44px] font-extrabold leading-[0.98] tracking-[-0.02em] sm:text-[68px]">{b.name}</h1> {/* Nombre del negocio */}
          {territory && <p className="m-0 mt-2"><Link href={`/${locale}/territorios/${territory.slug}`}>{t(locale, 'territory.in', { name: territory.name })}</Link></p>} {/* Territorio, con enlace */}
          <div className="mt-4"><BotonFavorito locale={locale} tipo="negocio" id={b.id} /></div> {/* Guardar en favoritos (misma lista que la app) */}
          <div className="mt-3">
            <FranjaNivel tier={b.listing_tier} locale={locale} />
          </div>
          {b.summary && <p className="mt-3 max-w-[var(--measure)] text-[19px] leading-[30px] text-ink-muted">{b.summary}</p>}
        </header>

        {links.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {links.map((c, i) => (
              <a
                key={c.kind + c.value}
                href={c.href!}
                rel="noopener"
                className={`flex h-[52px] items-center rounded-pill px-6 font-bold no-underline ${
                  i === 0 ? 'bg-oro text-on-oro' : 'border-[1.5px] border-control-border text-ink'
                }`}
              >
                {contactKey[c.kind] ? t(locale, contactKey[c.kind]) : (brandName[c.kind] ?? c.kind)} {/* Nombre del contacto */}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ink-muted">{t(locale, 'business.no_contacts')}</p>
        )}
        {b.listing_tier !== 'community_info' && (
          <div className="mt-4">
            <EscribirNegocio businessId={b.id} businessName={b.name} locale={locale} />
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-10">
          <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
            {b.description_md && <div className="whitespace-pre-line text-[17px] leading-[28px]">{b.description_md}</div>}
            <Pizarra
              title={t(locale, 'business.offers')} // Qué ofrece
              empty={t(locale, 'business.no_prices')} // Sin tarifas: por cotizar
              lines={prices.map((p) => ({ label: p.label, amount: `${money(p.amount, p.currency)}${p.unit ? ` ${p.unit}` : ''}`, note: t(locale, 'prices.observed', { date: date(p.observed_at), who: t(locale, reportedByKey[p.reported_by]) }) }))} // Cada oferta con su precio y su fuente
            />
          </div>
          <aside className="min-w-0 flex-[1_1_300px]">
            <EstadoVerificacion rows={rows} locale={locale} />
          </aside>
        </div>
      </div>
    </main>
  );
}
