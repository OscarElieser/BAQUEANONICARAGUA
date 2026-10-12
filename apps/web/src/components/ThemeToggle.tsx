'use client'; // Botón interactivo del navegador

import { useEffect, useState } from 'react'; // Estado y efectos
import { t, type MessageKey } from '@/i18n/t'; // Textos traducidos

type Theme = 'auto' | 'light' | 'dark'; // Temas posibles
const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' }; // Orden de rotación
const label: Record<Theme, MessageKey> = { auto: 'theme.auto', light: 'theme.light', dark: 'theme.dark' }; // Clave del nombre de cada tema

/** Rota automático → claro → oscuro. La preferencia es por navegador (localStorage, si está disponible). */
export function ThemeToggle({ locale }: { locale: string }) {
  const [theme, setTheme] = useState<Theme>('auto'); // Tema actual

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme'); // Tema guardado
      if (saved === 'light' || saved === 'dark') setTheme(saved); // Lo aplica si es válido
    } catch {
      // Almacenamiento bloqueado: se queda en automático
    }
  }, []); // Solo al cargar

  function cycle() {
    const nt = next[theme]; // Siguiente tema
    setTheme(nt); // Lo guarda en el estado
    const root = document.documentElement; // Elemento raíz de la página
    if (nt === 'auto') delete root.dataset.theme; // Automático: sigue al sistema
    else root.dataset.theme = nt; // Claro u oscuro forzado
    document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
      m.content = nt === 'auto' ? (m.dataset.auto ?? m.content) : nt === 'dark' ? '#0D5448' : '#E6EEE9'; // La barra del navegador sigue al tema elegido
    });
    try {
      if (nt === 'auto') localStorage.removeItem('theme'); // Olvida la preferencia
      else localStorage.setItem('theme', nt); // Recuerda la preferencia
    } catch {
      // Sin persistencia, pero el cambio se aplica
    }
  }

  const name = t(locale, label[theme]); // Nombre del tema actual
  return (
    <button
      type="button" // No envía formularios
      onClick={cycle} // Cambia de tema
      aria-label={`${name}. ${t(locale, 'theme.change')}`} // Estado y acción para lectores de pantalla
      title={name} // Ayuda al pasar el cursor
      className="boton-neu flex h-11 w-11 items-center justify-center rounded-pill text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {theme === 'dark' ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /> // Luna
        ) : theme === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" /> {/* Sol */}
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /> {/* Rayos */}
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" /> {/* Círculo */}
            <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" /> {/* Mitad rellena: automático */}
          </>
        )}
      </svg>
    </button>
  );
}
