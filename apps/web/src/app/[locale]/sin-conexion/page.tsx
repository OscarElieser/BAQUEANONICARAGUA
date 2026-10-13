// Página que muestra el trabajador sin conexión cuando la persona abre una página que todavía no había visitado.
import Link from 'next/link'; // Enlace a la portada
import { t } from '@/i18n/t'; // Textos traducidos

export const metadata = { robots: { index: false, follow: false } }; // Los buscadores no la indexan

export default async function SinConexion({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  return (
    <main className="mx-auto max-w-[640px] px-4 py-20 text-center">
      <h1 className="terr-grupo m-0">{t(locale, 'offline.title')}</h1> {/* "Sin conexión" */}
      <p className="mt-3 text-[18px] leading-7 text-ink-muted">{t(locale, 'offline.text')}</p> {/* Qué se puede hacer */}
      <Link href={`/${locale}`} className="boton-marca mt-6">{t(locale, 'offline.retry')}</Link> {/* Intenta de nuevo con la portada */}
    </main>
  );
}
