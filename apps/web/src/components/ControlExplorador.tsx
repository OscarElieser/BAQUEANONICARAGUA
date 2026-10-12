'use client'; // Cambia el territorio activo del explorador

import { useCallback, useEffect, useState } from 'react'; // Estado y efectos

/** Flechas del explorador; también escucha los clics en las tarjetas (data-ir) y las flechas del teclado. */
export function ControlExplorador({ total, anterior, siguiente }: { total: number; anterior: string; siguiente: string }) {
  const [activo, setActivo] = useState(0); // Territorio visible

  const ir = useCallback((i: number) => setActivo(((i % total) + total) % total), [total]); // Da la vuelta al llegar al final

  useEffect(() => {
    const el = document.getElementById('explorador'); // Sección del explorador
    if (!el) return; // Nada que actualizar
    el.dataset.activo = String(activo); // El CSS muestra el fondo de este territorio
    el.querySelectorAll<HTMLElement>('.exp-slide').forEach((s) => { s.hidden = Number(s.dataset.i) !== activo; }); // Solo su texto
    el.querySelectorAll<HTMLElement>('.exp-cartas li').forEach((li) => {
      const d = (Number(li.dataset.i) - activo + total) % total; // Distancia hacia adelante
      if (d >= 1 && d <= 3) li.dataset.pos = String(d); // Las tres siguientes asoman a la derecha
      else delete li.dataset.pos; // Las demás se ocultan
    });
    el.querySelectorAll<HTMLElement>('.exp-fondo').forEach((f) => f.classList.toggle('es-activo', Number(f.dataset.i) === activo)); // Fondo con fundido
    el.style.setProperty('--avance', String((activo + 1) / total)); // Riel de avance
  }, [activo, total]); // Cada vez que cambia

  useEffect(() => {
    const el = document.getElementById('explorador'); // Sección del explorador
    if (!el) return; // Sin sección
    const clic = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-ir]'); // Tarjeta tocada
      if (b) ir(Number(b.dataset.ir)); // Muestra ese territorio
    };
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return; // No interfiere con campos de texto
      if (e.key === 'ArrowRight') setActivo((a) => (a + 1) % total); // Siguiente
      if (e.key === 'ArrowLeft') setActivo((a) => (a - 1 + total) % total); // Anterior
    };
    el.addEventListener('click', clic); // Clics en las tarjetas
    el.addEventListener('keydown', tecla); // Flechas cuando el foco está dentro
    return () => {
      el.removeEventListener('click', clic); // Limpieza
      el.removeEventListener('keydown', tecla); // Limpieza
    };
  }, [ir, total]); // Una vez

  return (
    <div className="exp-flechas">
      <button type="button" className="arco-flecha" aria-label={anterior} onClick={() => ir(activo - 1)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg> {/* Flecha a la izquierda */}
      </button>
      <button type="button" className="arco-flecha" aria-label={siguiente} onClick={() => ir(activo + 1)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg> {/* Flecha a la derecha */}
      </button>
    </div>
  );
}
