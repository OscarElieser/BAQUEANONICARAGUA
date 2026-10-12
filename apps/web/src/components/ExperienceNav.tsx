'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const experiences = [
  { href: '', label: 'Descubrir' },
  { href: '/mi-aventura', label: 'Mi aventura' },
  { href: '/comunidad', label: 'Comunidad' },
] as const;

/** Selector de las tres experiencias. Cada opción es una ruta real. */
export function ExperienceNav({ locale }: { locale: string }) {
  const pathname = usePathname() ?? '';
  const rest = pathname.replace(new RegExp(`^/${locale}`), '');
  const current = rest.startsWith('/mi-aventura') ? '/mi-aventura' : rest.startsWith('/comunidad') ? '/comunidad' : '';

  return (
    <nav aria-label="Experiencias" className="flex gap-1 rounded-pill bg-ground-raised p-1">
      {experiences.map((e) => {
        const active = e.href === current;
        return (
          <Link
            key={e.href}
            href={`/${locale}${e.href}`}
            aria-current={active ? 'page' : undefined}
            className={`rounded-pill px-4 py-2.5 text-[15px] font-bold no-underline sm:px-5 ${
              active ? 'bg-ink text-ground' : 'text-ink'
            }`}
          >
            {e.label}
          </Link>
        );
      })}
    </nav>
  );
}
