import { FranjaTejida } from '@/components/FranjaTejida';
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
  const { data: territories } = await listTerritories();
  return (
    <main>
      <FranjaTejida height={22} />
      <div className="mx-auto max-w-[720px] px-4 py-12">
        <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02]">{t(locale, 'register.title')}</h1>
        <p className="mt-4 text-[19px] leading-[30px] text-ink-muted">
          {t(locale, 'register.intro')} {/* Sin comisiones */}
        </p>
        <RegistrarNegocioForm locale={locale} territories={territories} />
      </div>
    </main>
  );
}
