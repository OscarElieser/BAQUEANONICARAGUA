import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Young_Serif, Atkinson_Hyperlegible } from 'next/font/google';
import { locales, type Locale } from '@/i18n/config';
import { SiteHeader } from '@/components/SiteHeader';
import '../globals.css';

const youngSerif = Young_Serif({ weight: '400', subsets: ['latin'], variable: '--font-young-serif', display: 'swap' });
const atkinson = Atkinson_Hyperlegible({ weight: ['400', '700'], subsets: ['latin'], variable: '--font-atkinson', display: 'swap' });

// Aplica el tema guardado antes de pintar (evita parpadeo). Tolera storage bloqueado.
const themeBoot = `try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

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
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0D5448" />
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body>
        <SiteHeader locale={locale as Locale} />
        {children}
      </body>
    </html>
  );
}
