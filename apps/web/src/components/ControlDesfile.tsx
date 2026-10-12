'use client'; // Botón interactivo

import { useState } from 'react'; // Estado de pausa

/** Botón que pausa o reanuda el desfile marcado con `data-desfile={id}` (WCAG 2.2.2). */
export function ControlDesfile({ id, pausar, reanudar }: { id: string; pausar: string; reanudar: string }) {
  const [pausa, setPausa] = useState(false); // Si la persona lo detuvo
  const alternar = () => {
    const nueva = !pausa; // Nuevo estado
    setPausa(nueva); // Lo guarda
    document.querySelector(`[data-desfile="${id}"]`)?.setAttribute('data-pausa', String(nueva)); // Lo aplica al desfile
  }; // Pausa o reanuda
  return (
    <button
      type="button" // No envía formularios
      onClick={alternar} // Alterna
      className="desfile-control min-h-[44px] rounded-pill border border-control-border bg-transparent px-5 text-[15px] font-bold text-ink" // Botón secundario
    >
      {pausa ? reanudar : pausar} {/* Lo que hará al pulsarlo */}
    </button>
  );
}
