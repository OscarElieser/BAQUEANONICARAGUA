import { DenunciaForm } from '@/components/DenunciaForm'; // Formulario de denuncia
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no indexan esta página

const numbers = [
  { n: '118', key: 'report.police' }, // Policía
  { n: '115', key: 'report.fire' }, // Bomberos
  { n: '128', key: 'report.medical' }, // Emergencias médicas
] as const; // Teléfonos oficiales de emergencia

export default async function Denunciar({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma de la página
  return (
    <main className="mx-auto max-w-[720px] px-4 py-12">
      <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">{t(locale, 'report.title')}</h1> {/* Título */}
      <p className="mt-4 text-[19px] leading-[30px] text-ink-muted">{t(locale, 'report.intro')}</p> {/* Qué se puede reportar */}
      {/* Información de seguridad: siempre visible, sin necesidad de iniciar sesión */}
      <section aria-labelledby="emergencia" className="my-8 rounded-m border-2 border-status-alert p-5">
        <h2 id="emergencia" className="m-0 text-[20px] font-bold">{t(locale, 'report.emergency_title')}</h2> {/* ¿Emergencia? */}
        <p className="mb-3 mt-2">{t(locale, 'report.emergency_body')}</p> {/* La plataforma no avisa por ti */}
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {numbers.map((x) => (
            <li key={x.n}>
              <a href={`tel:${x.n}`} className="flex h-[52px] items-center rounded-pill bg-ink px-6 font-bold text-ground no-underline">
                {t(locale, x.key, { n: x.n })} {/* Servicio y número */}
              </a>
            </li>
          ))}
        </ul>
      </section>
      <DenunciaForm locale={locale} /> {/* Formulario */}
    </main>
  );
}
