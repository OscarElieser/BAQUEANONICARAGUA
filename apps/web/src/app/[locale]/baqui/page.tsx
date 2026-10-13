// BAQÜI: el asistente de viajes de BAQUEANO (Google Gemini en el servidor, solo con datos publicados).
import type { Metadata } from 'next'; // Tipo de los metadatos
import { ChatBaqui } from '@/components/ChatBaqui'; // Conversación
import { CreditoFoto } from '@/components/CreditoFoto'; // Crédito de la foto
import { fotoDe, srcsetDe } from '@/lib/fotos'; // Fotos reales con licencia libre
import { letraFirma, letraMarca } from '@/app/fuentes'; // Letras de la marca y de la firma
import { pageMetadata } from '@/lib/seo'; // Canónica y versiones por idioma
import { t } from '@/i18n/t'; // Textos traducidos

/** Metadatos de la página en su idioma. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma
  return pageMetadata(locale, '/baqui', t(locale, 'baqui.title'), t(locale, 'baqui.intro')); // Título y descripción
}

export default async function Baqui({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; // Idioma
  const foto = fotoDe('portada-pacifico'); // Foto real del encabezado (Concepción, Ometepe)
  return (
    <main className={`${letraMarca.variable} ${letraFirma.variable} mx-auto max-w-[1100px] px-4 pb-16 pt-4 sm:px-12`}>
      <header className="terr-portada legal-portada tema-noche">
        {foto && <img src={foto.imagen_movil} srcSet={srcsetDe(foto)} sizes="100vw" alt={foto.lugar} decoding="async" className="terr-portada-foto" />} {/* Foto real de fondo */}
        <div className="terr-portada-texto max-w-[64ch]">
          <h1 className="terr-titulo m-0">BAQÜI</h1> {/* Nombre propio del asistente (igual en todos los idiomas) */}
          <p className="mt-2 text-[20px] font-bold">{t(locale, 'baqui.subtitle')}</p> {/* "Tu guía de viaje por Nicaragua" */}
          <p className="mt-2 text-[16px] leading-6">{t(locale, 'baqui.intro')}</p> {/* Qué hace y con qué datos */}
          {foto && <CreditoFoto locale={locale} foto={foto} className="mt-4 block" />} {/* Crédito de la foto */}
        </div>
      </header>
      <section aria-label={t(locale, 'baqui.title')} className="mt-8">
        <ChatBaqui locale={locale} /> {/* Conversación con la sesión */}
      </section>
    </main>
  );
}
