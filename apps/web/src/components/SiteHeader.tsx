import Link from 'next/link'; // Enlaces internos sin recargar la página
import type { Locale } from '@/i18n/config'; // Tipo de los idiomas disponibles
import { ExperienceNav } from './ExperienceNav'; // Selector Descubrir / Mi aventura / Comunidad
import { SessionButton } from './SessionButton'; // Botón de iniciar sesión o menú del usuario
import { ThemeToggle } from './ThemeToggle'; // Botón de tema claro / oscuro / automático

/** Cabecera común a todas las páginas públicas. */
export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-4 pt-6 sm:px-12">
      <Link href={`/${locale}`} className="font-display text-[26px] leading-tight text-ink no-underline">
        [Marca] {/* Nombre de la marca (pendiente de definir) */}
      </Link>
      <ExperienceNav locale={locale} /> {/* Las tres experiencias principales */}
      <div className="flex items-center gap-3">
        <ThemeToggle /> {/* Cambio de tema */}
        <SessionButton locale={locale} /> {/* Iniciar sesión o menú con "Cerrar sesión" */}
      </div>
    </header>
  );
}
