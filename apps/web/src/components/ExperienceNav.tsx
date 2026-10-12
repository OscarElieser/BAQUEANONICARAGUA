'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

const experiences: Array<{ href: string; label: MessageKey }> = [
  { href: '', label: 'nav.discover' }, // Descubrir
  { href: '/mi-aventura', label: 'nav.adventure' }, // Mi aventura
  { href: '/comunidad', label: 'nav.community' }, // Comunidad
]; // Las tres experiencias con la clave de su texto

/** Selector de las tres experiencias. Cada opción es una ruta real. */
export function ExperienceNav({ locale }: { locale: string }) {
  const pathname = usePathname() ?? '';
  const rest = pathname.replace(new RegExp(`^/${locale}`), '');
  const current = rest.startsWith('/mi-aventura') ? '/mi-aventura' : rest.startsWith('/comunidad') ? '/comunidad' : '';

  return (
    <nav aria-label={t(locale, 'nav.aria')} className="flex gap-1 rounded-pill bg-ground-raised p-1">
      {experiences.map((e) => {
        const active = e.href === current;
        return (
          <Link
            key={e.href}
            href={`/${locale}${e.href}`}
            aria-current={active ? 'page' : undefined}
            className={`whitespace-nowrap rounded-pill px-3 py-2.5 text-[14px] font-bold no-underline sm:px-5 sm:text-[15px] ${
              active ? 'bg-ink text-ground' : 'text-ink'
            }`}
          >
            {t(locale, e.label)} {/* Nombre traducido */}
          </Link>
        );
      })}
    </nav>
  );
}
