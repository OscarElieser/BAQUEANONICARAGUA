import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto del encabezado
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma
import { RegistrarNegocioForm } from '@/components/RegistrarNegocioForm';
import { listTerritories } from '@/lib/territories'; // Territorios para el selector
import { t } from '@/i18n/t'; // Textos traducidos
import type { Metadata } from 'next'; // Tipo de los metadatos
import { pageMetadata } from '@/lib/seo'; // Canónica, idiomas y vista previa

/** Metadatos para buscadores en el idioma de la página. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/comunidad/registrar', t(locale, 'register.title'), t(locale, 'register.intro')); // Canónica y versiones por idioma
}

export default async function RegistrarNegocio({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { data: territories } = await listTerritories(); // Territorios publicados para el selector
  const foto = fotoDe('masaya'); // Foto real del encabezado
  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-12`}>
      <header className="terr-portada legal-portada tema-noche">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt={foto.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto max-w-[68ch]">
          <h1 className="terr-titulo m-0">{t(locale, 'register.title')}</h1> {/* Título */}
          <p className="mt-3 text-[18px] leading-[28px]">{t(locale, 'register.intro')}</p> {/* Presentación */}
          {foto && <CreditoFoto locale={locale} foto={foto} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
        <p aria-hidden="true" className="cron-sello">{t(locale, 'register.stamp')}</p> {/* Sello escrito a mano (decoración) */}
      </header>

      <ol className="pasos-negocio m-0 mt-8 list-none p-0" aria-label={t(locale, 'register.steps')}>
        {/* Cómo funciona de verdad: es un proceso en orden, por eso va numerado */}
        {(['register.step1', 'register.step2', 'register.step3', 'register.step4'] as const).map((k, i) => (
          <li key={k}><span aria-hidden="true">{i + 1}</span>{t(locale, k)}</li> // Paso del proceso
        ))}
      </ol>
      <div className="mx-auto mt-10 max-w-[720px]">
        <RegistrarNegocioForm locale={locale} territories={territories} /> {/* Formulario real (pide sesión) */}
      </div>
    </main>
  );
}
