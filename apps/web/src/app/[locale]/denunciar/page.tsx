import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma
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
  const foto = fotoDe('rio-san-juan'); // Foto real del encabezado (río San Juan desde El Castillo)
  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-12`}>
      <header className="terr-portada legal-portada tema-noche">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt={foto.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto max-w-[68ch]">
          <h1 className="terr-titulo m-0">{t(locale, 'report.title')}</h1> {/* Título */}
          <p className="mt-3 text-[18px] leading-[28px]">{t(locale, 'report.intro')}</p> {/* Presentación */}
          {foto && <CreditoFoto locale={locale} foto={foto} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
        <p aria-hidden="true" className="cron-sello">{t(locale, 'report.stamp')}</p> {/* Sello escrito a mano (decoración) */}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,720px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <DenunciaForm locale={locale} /> {/* Formulario */}
        </div>
        <aside className="grid gap-4 self-start lg:sticky lg:top-6">
      {/* Información de seguridad: siempre visible, sin necesidad de iniciar sesión */}
      <section aria-labelledby="emergencia" className="rounded-m border-2 border-status-alert bg-ground-raised p-5">
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
          <div className="legal-tarjeta">
            <p className="m-0 font-bold">{t(locale, 'report.why_title')}</p> {/* "Tu denuncia sirve" */}
            <p className="m-0 mt-1 text-[15px] leading-6 text-ink-muted">{t(locale, 'report.why_text')}</p> {/* Qué pasa después */}
          </div>
        </aside>
      </div>
    </main>
  );
}
