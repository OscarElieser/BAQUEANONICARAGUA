import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EscribirNegocio } from '@/components/EscribirNegocio';
import { EstadoVerificacion } from '@/components/EstadoVerificacion';
import { FranjaNivel, FranjaTejida } from '@/components/FranjaTejida';
import { contactHref, getBusiness, reportedByLabel } from '@/lib/catalog';

export const revalidate = 600;

const contactLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', phone: 'Llamar', email: 'Correo', website: 'Sitio web',
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok',
};

export default async function NegocioPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const data = await getBusiness(slug);
  if (!data) notFound();
  const { business: b, contacts, prices, rows } = data;
  const money = (n: number, c: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: c }).format(n);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
  const links = contacts.map((c) => ({ ...c, href: contactHref(c) })).filter((c) => c.href);

  return (
    <main>
      <FranjaTejida height={22} />
      <div className="mx-auto max-w-[1280px] px-4 pb-16 sm:px-12">
        <nav aria-label="Ruta" className="pt-6 text-sm">
          <Link href={`/${locale}/comunidad`}>Comunidad</Link>
        </nav>
        <header className="pt-4">
          {b.is_sponsored && <p className="m-0 mb-2 text-sm font-bold text-oro-text">Patrocinado</p>}
          <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[48px]">{b.name}</h1>
          <div className="mt-3">
            <FranjaNivel tier={b.listing_tier} />
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
                {contactLabel[c.kind] ?? c.kind}
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-ink-muted">Este negocio aún no publicó medios de contacto.</p>
        )}
        {b.listing_tier !== 'community_info' && (
          <div className="mt-4">
            <EscribirNegocio businessId={b.id} businessName={b.name} locale={locale} />
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-10">
          <div className="min-w-0 max-w-[var(--measure)] flex-[999_1_560px]">
            {b.description_md && <div className="whitespace-pre-line text-[17px] leading-[28px]">{b.description_md}</div>}
            <section className="mt-8">
              <h2 className="font-display text-[26px] font-normal">Lo que ofrece</h2>
              {prices.length === 0 ? (
                <p className="text-ink-muted">Sin tarifas publicadas. Escríbele para cotizar.</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {prices.map((p) => (
                    <li key={p.label} className="border-b border-line py-3">
                      <div className="flex justify-between gap-4 font-bold">
                        <span>{p.label}</span>
                        <span>{money(p.amount, p.currency)}{p.unit ? ` ${p.unit}` : ''}</span>
                      </div>
                      <p className="m-0 text-sm text-ink-muted">Tarifa {reportedByLabel[p.reported_by]} el {date(p.observed_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
          <aside className="min-w-0 flex-[1_1_300px]">
            <EstadoVerificacion rows={rows} locale={locale} />
          </aside>
        </div>
      </div>
    </main>
  );
}
