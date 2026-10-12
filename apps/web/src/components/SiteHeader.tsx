import Link from 'next/link';
import type { Locale } from '@/i18n/config';
import { ExperienceNav } from './ExperienceNav';
import { ThemeToggle } from './ThemeToggle';

/** Cabecera común a todas las páginas públicas. */
export function SiteHeader({ locale }: { locale: Locale }) {
  return (
    <header className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-5 px-4 pt-6 sm:px-12">
      <Link href={`/${locale}`} className="font-display text-[26px] leading-tight text-ink no-underline">
        [Marca]
      </Link>
      <ExperienceNav locale={locale} />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href={`/${locale}/cuenta`}
          className="flex h-11 items-center rounded-pill border border-oro px-[18px] text-[15px] font-bold text-ink no-underline"
        >
          Iniciar sesión
        </Link>
      </div>
    </header>
  );
}
