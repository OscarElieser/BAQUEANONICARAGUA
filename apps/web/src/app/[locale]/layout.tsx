import type { Metadata } from 'next'; // Tipo de los metadatos de la página
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Young_Serif, Atkinson_Hyperlegible } from 'next/font/google';
import { locales, type Locale } from '@/i18n/config';
import { SiteHeader } from '@/components/SiteHeader';
import { t } from '@/i18n/t'; // Textos traducidos
import { SITE_URL } from '@/lib/seo'; // Dirección pública del sitio
import { SiteFooter } from '@/components/SiteFooter'; // Pie con páginas legales y preferencias de cookies
import { AvisoCookies } from '@/components/AvisoCookies'; // Aviso de cookies con consentimiento real
import { RegistroTrabajador } from '@/components/RegistroTrabajador'; // Modo sin conexión de las páginas visitadas
import { MedicionNavegacion } from '@/components/MedicionNavegacion'; // Medición anónima, solo con consentimiento
import '../globals.css';

const youngSerif = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-young-serif', display: 'swap' });
const atkinson = Atkinson_Hyperlegible({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-atkinson', display: 'swap' });

// Aplica el tema guardado antes de pintar (evita parpadeo). Tolera storage bloqueado.
const themeBoot = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.content=t==='dark'?'#0D5448':'#E6EEE9'})}}catch(e){}`; // Aplica el tema guardado (y el color de la barra del navegador) antes de pintar

/** Título de la pestaña en el idioma de la página: cada página pone el suyo y se agrega el nombre del sitio. */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; // Idioma de la página
  return {
    metadataBase: new URL(SITE_URL), // Base para convertir rutas en direcciones absolutas
    title: { default: t(locale, 'meta.title_default'), template: '%s | BAQUEANO' }, // Título por defecto y plantilla
    description: t(locale, 'meta.description'), // Descripción para buscadores
    openGraph: { siteName: 'Nicaragua', locale, type: 'website' }, // Datos comunes para la vista previa al compartir
    icons: { icon: [{ url: '/icono.svg', type: 'image/svg+xml' }, { url: '/icono-48.png', sizes: '48x48', type: 'image/png' }], apple: '/icono-180.png' }, // Icono: la silueta del país en curvas de nivel, con los colores de BAQUEANO
    // La canónica y las versiones por idioma las pone cada página (lib/seo.ts), para no apuntar todas a la portada
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <html lang={locale} className={`${youngSerif.variable} ${atkinson.variable}`} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" /> {/* Datos para instalar la web como app */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#E6EEE9" data-auto="#E6EEE9" /> {/* Barra del navegador en tema claro: mismo fondo que la página */}
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0D5448" data-auto="#0D5448" /> {/* Barra del navegador en tema oscuro */}
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <a href="#contenido" className="saltar">
          {t(locale, 'a11y.skip')} {/* Primer elemento con teclado: evita recorrer toda la cabecera */}
        </a>
        <SiteHeader locale={locale as Locale} />
        <div id="contenido" tabIndex={-1} className="outline-none">
          {children} {/* Contenido de cada página */}
        </div>
        <SiteFooter locale={locale} /> {/* Pie de página común */}
        <AvisoCookies locale={locale} /> {/* Aviso de cookies (solo aparece si falta elegir) */}
        <RegistroTrabajador /> {/* Instala el modo sin conexión (solo en producción) */}
        <MedicionNavegacion locale={locale} /> {/* Registra páginas vistas solo con consentimiento */}
      </body>
    </html>
  );
}
