'use client'; // Cambia el territorio activo del explorador

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'; // Estado y efectos

type DocConTransicion = Document & { startViewTransition?: (cb: () => void) => { finished: Promise<void> } }; // Navegadores con View Transitions

/** Muestra en la página el territorio `activo`: su texto, su fondo, las tres tarjetas siguientes y el riel. */
function aplicar(el: HTMLElement, activo: number, total: number) {
  el.dataset.activo = String(activo); // Territorio activo
  el.querySelectorAll<HTMLElement>('.exp-slide').forEach((s) => { s.hidden = Number(s.dataset.i) !== activo; }); // Solo su texto
  el.querySelectorAll<HTMLElement>('.exp-cartas li').forEach((li) => {
    const d = (Number(li.dataset.i) - activo + total) % total; // Distancia hacia adelante
    if (d >= 1 && d <= 3) li.dataset.pos = String(d); // Las tres siguientes asoman a la derecha
    else delete li.dataset.pos; // Las demás se ocultan
  });
  el.querySelectorAll<HTMLElement>('.exp-fondo').forEach((f) => f.classList.toggle('es-activo', Number(f.dataset.i) === activo)); // Fondo activo
  el.style.setProperty('--avance', String((activo + 1) / total)); // Riel de avance
}

/**
 * Flechas del explorador; también escucha los clics en las tarjetas (data-ir) y las flechas del teclado.
 * Al elegir una tarjeta que asoma, la tarjeta crece hasta convertirse en el fondo (View Transitions);
 * donde no existe esa función, o con "reducir movimiento", el cambio es un fundido simple.
 */
export function ControlExplorador({ total, anterior, siguiente }: { total: number; anterior: string; siguiente: string }) {
  const [activo, setActivo] = useState(0); // Territorio visible
  const activoRef = useRef(0); // Copia para los oyentes de eventos

  useLayoutEffect(() => {
    activoRef.current = activo; // Mantiene la copia al día
    const el = document.getElementById('explorador'); // Sección del explorador
    if (el) aplicar(el, activo, total); // Muestra el territorio activo
  }, [activo, total]); // Antes de pintar

  const ir = useCallback((destino: number) => {
    const nuevo = ((destino % total) + total) % total; // Da la vuelta al llegar al final
    const el = document.getElementById('explorador'); // Sección
    const doc = document as DocConTransicion; // Documento con la función opcional
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // Menos movimiento pedido
    const carta = el?.querySelector<HTMLElement>(`.exp-cartas li[data-i="${nuevo}"][data-pos] .exp-carta`); // Tarjeta visible del destino (si asoma)
    if (!el || !doc.startViewTransition || quieto || !carta) {
      setActivo(nuevo); // Cambio normal (fundido por CSS)
      return;
    }
    carta.style.viewTransitionName = 'exp-crece'; // La tarjeta es el punto de partida
    el.classList.add('en-transicion'); // Sin fundidos propios mientras dura
    const tr = doc.startViewTransition(() => {
      carta.style.viewTransitionName = ''; // Deja de ser la protagonista…
      aplicar(el, nuevo, total); // …se aplica el cambio en la página…
      activoRef.current = nuevo; // …y en la copia…
      const fondo = el.querySelector<HTMLElement>(`.exp-fondo[data-i="${nuevo}"]`); // …y el fondo nuevo toma su lugar
      if (fondo) fondo.style.viewTransitionName = 'exp-crece'; // La tarjeta crece hasta ser el fondo
    });
    tr.finished.finally(() => {
      setActivo(nuevo); // El estado de React se pone al día (la página ya muestra el nuevo)
      el.classList.remove('en-transicion'); // Vuelven los fundidos normales
      el.querySelectorAll<HTMLElement>('.exp-fondo').forEach((f) => { f.style.viewTransitionName = ''; }); // Limpia los nombres
    });
  }, [total]);

  useEffect(() => {
    const el = document.getElementById('explorador'); // Sección del explorador
    if (!el) return; // Sin sección
    const clic = (e: MouseEvent) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-ir]'); // Tarjeta tocada
      if (b) ir(Number(b.dataset.ir)); // Muestra ese territorio
    };
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return; // No interfiere con campos de texto
      if (e.key === 'ArrowRight') ir(activoRef.current + 1); // Siguiente
      if (e.key === 'ArrowLeft') ir(activoRef.current - 1); // Anterior
    };
    el.addEventListener('click', clic); // Clics en las tarjetas
    el.addEventListener('keydown', tecla); // Flechas cuando el foco está dentro
    return () => {
      el.removeEventListener('click', clic); // Limpieza
      el.removeEventListener('keydown', tecla); // Limpieza
    };
  }, [ir]); // Una vez

  return (
    <div className="exp-flechas">
      <button type="button" className="arco-flecha" aria-label={anterior} onClick={() => ir(activoRef.current - 1)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg> {/* Flecha a la izquierda */}
      </button>
      <button type="button" className="arco-flecha" aria-label={siguiente} onClick={() => ir(activoRef.current + 1)}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg> {/* Flecha a la derecha: la próxima tarjeta crece hasta el fondo */}
      </button>
    </div>
  );
}
