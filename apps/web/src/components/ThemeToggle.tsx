'use client';

import { useEffect, useState } from 'react';

type Theme = 'auto' | 'light' | 'dark';
const next: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const label: Record<Theme, string> = {
  auto: 'Tema automático',
  light: 'Tema claro',
  dark: 'Tema oscuro',
};

/** Rota automático → claro → oscuro. La preferencia es por navegador (localStorage, si está disponible). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('auto');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') setTheme(saved);
    } catch {
      /* storage bloqueado: se queda en automático */
    }
  }, []);

  function cycle() {
    const t = next[theme];
    setTheme(t);
    const root = document.documentElement;
    if (t === 'auto') delete root.dataset.theme;
    else root.dataset.theme = t;
    try {
      if (t === 'auto') localStorage.removeItem('theme');
      else localStorage.setItem('theme', t);
    } catch {
      /* sin persistencia, pero el cambio se aplica */
    }
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${label[theme]}. Cambiar tema`}
      title={label[theme]}
      className="flex h-11 w-11 items-center justify-center rounded-pill bg-ground-raised text-ink"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {theme === 'dark' ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : theme === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" />
          </>
        )}
      </svg>
    </button>
  );
}
