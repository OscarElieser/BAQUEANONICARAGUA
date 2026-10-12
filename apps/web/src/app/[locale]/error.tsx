'use client'; // Los límites de error de Next.js corren en el navegador

import { useEffect } from 'react'; // Efecto al aparecer
import { useIdiomaDeRuta } from '@/components/Extraviado'; // Idioma de la dirección
import { t } from '@/i18n/t'; // Textos traducidos

/** Si una página falla, se explica sin tecnicismos y se puede reintentar sin recargar todo. */
export default function ErrorDePagina({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const locale = useIdiomaDeRuta(); // Idioma de la página
  useEffect(() => {
    console.error('Error de página', error.digest ?? ''); // Solo el código del error (sin datos de la persona)
  }, [error]); // Una vez por error

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-14 sm:px-12">
      <h1 className="m-0 max-w-[16ch] font-display text-[44px] font-normal leading-[1] sm:text-[64px]">{t(locale, 'errorpage.title')}</h1> {/* Qué pasó */}
      <p role="alert" className="mb-0 mt-5 max-w-[52ch] text-[19px] leading-[30px] text-ink-muted">{t(locale, 'errorpage.body')}</p> {/* Qué puede hacer */}
      <button type="button" onClick={reset} className="mt-8 h-[52px] rounded-pill bg-oro px-7 font-bold text-on-oro">
        {t(locale, 'errorpage.retry')} {/* Vuelve a intentar mostrar la página */}
      </button>
    </main>
  );
}
