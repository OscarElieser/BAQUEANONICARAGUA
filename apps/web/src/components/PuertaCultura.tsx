// Puerta al mundo de Cultura desde la portada: una franja de barro con su greca y su letra.
import Link from 'next/link'; // Enlace interno
import { letraCultura } from '@/app/fuentes'; // Caprasimo
import { Greca } from './Greca'; // Friso de greca
import { t } from '@/i18n/t'; // Textos traducidos

export function PuertaCultura({ locale }: { locale: string }) {
  return (
    <Link href={`/${locale}/cultura`} className={`${letraCultura.variable} mundo-cultura cultura-heroe puerta-cultura my-8 block overflow-hidden rounded-[var(--radius-m)] no-underline`}>
      <Greca unidades={30} alto={28} className="block h-[28px] w-full text-[var(--band-marfil)]" /> {/* Friso de greca */}
      <span className="flex flex-wrap items-end justify-between gap-4 px-6 pb-7 pt-5 sm:px-10">
        <span className="block font-mundo text-[34px] leading-[1.05] sm:text-[48px]">{t(locale, 'culture.title')}</span> {/* Nombre del mundo */}
        <span className="block max-w-[44ch] text-[17px] leading-[27px]">{t(locale, 'culture.door')}</span> {/* Qué hay adentro */}
      </span>
    </Link>
  );
}
