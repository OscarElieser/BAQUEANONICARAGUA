'use client'; // Botones que mueven la galería

/** Flechas que deslizan la galería marcada con `data-arco={id}` una tarjeta hacia cada lado. */
export function ControlArco({ id, anterior, siguiente }: { id: string; anterior: string; siguiente: string }) {
  const mover = (dir: number) => {
    const el = document.querySelector<HTMLElement>(`[data-arco="${id}"]`); // Galería
    const carta = el?.querySelector<HTMLElement>('.arco-item'); // Una tarjeta, para saber cuánto mide
    if (!el || !carta) return; // Nada que mover
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches; // Sin animación si así se pidió
    el.scrollBy({ left: dir * (carta.offsetWidth + 24), behavior: quieto ? 'auto' : 'smooth' }); // Una tarjeta más el espacio entre ellas
  }; // Desliza una posición
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => mover(-1)} aria-label={anterior} className="arco-flecha">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 5l-7 7 7 7" /></svg> {/* Flecha a la izquierda */}
      </button>
      <button type="button" onClick={() => mover(1)} aria-label={siguiente} className="arco-flecha">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5l7 7-7 7" /></svg> {/* Flecha a la derecha */}
      </button>
    </div>
  );
}
