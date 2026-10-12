'use client'; // Escucha el puntero en el navegador

import { useEffect } from 'react'; // Efecto al montar

/**
 * Inclina en 3D cualquier tarjeta `.inclinable` hacia el cursor (ratón o lápiz; con el dedo no).
 * Un solo oyente para toda la página en lugar de uno por tarjeta: menos JavaScript y nada que hidratar.
 */
export function InclinacionTarjetas() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; // Sin movimiento si se pidió
    let actual: HTMLElement | null = null; // Tarjeta inclinada ahora
    const soltar = () => {
      actual?.style.setProperty('--rx', '0deg'); // Sin giro vertical
      actual?.style.setProperty('--ry', '0deg'); // Sin giro horizontal
      actual = null; // Ninguna inclinada
    }; // Devuelve la tarjeta a su lugar
    const mover = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // Con el dedo se desplaza la página
      const el = (e.target as Element | null)?.closest<HTMLElement>('.inclinable') ?? null; // Tarjeta bajo el cursor
      if (el !== actual) soltar(); // Cambió de tarjeta: suelta la anterior
      if (!el) return; // Fuera de toda tarjeta
      actual = el; // Recuerda cuál está inclinada
      const r = el.getBoundingClientRect(); // Posición y tamaño
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; // Posición relativa (0 a 1)
      el.style.setProperty('--ry', `${((x - 0.5) * 12).toFixed(2)}deg`); // Giro horizontal (máx. 6°)
      el.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(2)}deg`); // Giro vertical (máx. 6°)
      el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`); // Brillo sigue al cursor
      el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`); // Brillo sigue al cursor
    }; // Inclina según la posición del cursor
    document.addEventListener('pointermove', mover, { passive: true }); // Un solo oyente
    document.addEventListener('pointerleave', soltar); // Al salir de la ventana
    return () => {
      document.removeEventListener('pointermove', mover); // Limpia al salir
      document.removeEventListener('pointerleave', soltar); // Limpia al salir
    };
  }, []); // Una sola vez
  return null; // No dibuja nada
}
