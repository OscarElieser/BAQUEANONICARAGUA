import Link from 'next/link';

/**
 * Página honesta para módulos aún no construidos (principio 1: ningún botón
 * finge funcionar). Indica qué hará el módulo y en qué fase llega.
 */
export function ProximamentePage({
  locale,
  title,
  description,
  phase,
}: {
  locale: string;
  title: string;
  description: string;
  phase: string;
}) {
  return (
    <main className="mx-auto max-w-[1280px] px-4 py-16 sm:px-12">
      <h1 className="m-0 font-display text-[40px] font-normal leading-[1.02] sm:text-[48px]">{title}</h1>
      <p className="mt-4 max-w-[52ch] text-[19px] leading-[30px] text-ink-muted">{description}</p>
      <p className="mt-6 inline-block rounded-pill bg-ground-raised px-4 py-2 text-[15px] font-bold">
        No disponible todavía. Llega en la {phase}.
      </p>
      <p className="mt-8">
        <Link href={`/${locale}`}>Volver a Descubrir</Link>
      </p>
    </main>
  );
}
