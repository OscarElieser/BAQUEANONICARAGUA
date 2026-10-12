'use client'; // Selector interactivo del navegador

import { usePathname, useRouter } from 'next/navigation'; // Ruta actual y navegación
import { locales } from '@/i18n/config'; // Idiomas disponibles
import { languageName, t } from '@/i18n/t'; // Nombres y textos traducidos

/** Selector de idioma: cambia el idioma de la ruta actual y lo recuerda en una cookie necesaria. */
export function LanguageSwitcher({ locale }: { locale: string }) {
  const pathname = usePathname() ?? `/${locale}`; // Ruta actual
  const router = useRouter(); // Navegación

  function change(next: string) {
    const secure = location.protocol === 'https:' ? '; Secure' : ''; // Solo por conexión cifrada cuando hay HTTPS
    document.cookie = `locale=${next}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`; // Recuerda el idioma 12 meses (cookie necesaria)
    const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), ''); // Ruta sin el idioma actual
    router.push(`/${next}${rest}`); // Misma página en el idioma elegido
  }

  return (
    <label className="flex items-center">
      <span className="visually-hidden">{t(locale, 'lang.label')}</span> {/* Nombre accesible */}
      <select
        value={locale} // Idioma actual
        onChange={(e) => change(e.target.value)} // Cambia al elegir
        className="h-11 rounded-pill border border-control-border bg-ground-raised px-3 text-[15px] text-ink" // Mismo estilo que los botones
      >
        {locales.map((l) => (
          <option key={l} value={l} lang={l}>
            {languageName(l)} {/* Nombre del idioma en su propio idioma */}
          </option>
        ))}
      </select>
    </label>
  );
}
