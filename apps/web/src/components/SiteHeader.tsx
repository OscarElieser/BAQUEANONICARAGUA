import Link from 'next/link'; // Enlaces internos sin recargar la página
import type { Locale } from '@/i18n/config'; // Tipo de los idiomas disponibles
import { ExperienceNav } from './ExperienceNav'; // Selector Descubrir / Mi aventura / Comunidad
import { SessionButton } from './SessionButton'; // Botón de iniciar sesión o menú del usuario
import { ThemeToggle } from './ThemeToggle'; // Botón de tema claro / oscuro / automático
import { LanguageSwitcher } from './LanguageSwitcher'; // Selector de idioma
import { t } from '@/i18n/t'; // Textos traducidos

/** Cabecera común a todas las páginas públicas. */
export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-4 pt-6 sm:px-12">
      <Link href={`/${locale}`} className="marca-cabecera text-ink no-underline">
        {t(locale, 'brand.name')} {/* Nombre de la marca: BAQUEANO */}
      </Link>
      <ExperienceNav locale={locale} /> {/* Las tres experiencias principales */}
      <div className="flex items-center gap-3">
        <LanguageSwitcher locale={locale} /> {/* Idioma de la interfaz */}
        <ThemeToggle locale={locale} /> {/* Cambio de tema */}
        <SessionButton locale={locale} /> {/* Iniciar sesión o menú con "Cerrar sesión" */}
      </div>
    </header>
  );
}
