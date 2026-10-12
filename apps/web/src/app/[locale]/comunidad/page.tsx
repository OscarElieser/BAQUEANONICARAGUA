import Link from 'next/link';
import { FranjaTejida } from '@/components/FranjaTejida';

export default async function Comunidad({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <main>
      <FranjaTejida height={22} />
      <div className="mx-auto max-w-[1280px] px-4 py-14 sm:px-12">
        <h1 className="m-0 max-w-[14ch] font-display text-[44px] font-normal leading-[0.98] sm:text-[72px]">
          Detrás de cada viaje hay alguien con nombre
        </h1>
        <p className="mt-6 max-w-[52ch] text-[19px] leading-[30px] text-ink-muted">
          La Vitrina de Nuestra Gente da visibilidad gratuita a comedores, guías, artesanos y fincas de todo el país.
          Escríbeles directo, sin intermediarios ni comisiones.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${locale}/mapa`} className="flex h-[52px] items-center rounded-pill bg-oro px-7 font-bold text-on-oro no-underline">
            Conocer a la gente
          </Link>
          <Link href={`/${locale}/comunidad/registrar`} className="flex h-[52px] items-center rounded-pill border-[1.5px] border-control-border px-7 font-bold text-ink no-underline">
            Publicar mi negocio
          </Link>
        </div>
        <p className="mt-10 text-ink-muted">Publicaciones, historias y mensajería llegan en la Fase 4.</p>
      </div>
    </main>
  );
}
