'use client';
// Buscador del catálogo de territorios: filtra en el navegador las tarjetas ya dibujadas por nombre (sin tildes ni mayúsculas).
import { useState } from 'react'; // Estado del texto buscado

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); // "León" → "leon"

export function BuscadorTerritorios({ etiqueta, vacio }: { etiqueta: string; vacio: string }) {
  const [nada, setNada] = useState(false); // Si ninguna tarjeta coincide

  function filtrar(texto: string) {
    const q = normal(texto.trim()); // Texto normalizado
    let visibles = 0; // Cuántas quedan
    document.querySelectorAll<HTMLElement>('[data-nombre]').forEach((li) => {
      const ok = !q || normal(li.dataset.nombre ?? '').includes(q); // Coincide o no hay búsqueda
      li.hidden = !ok; // Oculta las que no coinciden
      if (ok) visibles++; // Cuenta las visibles
    });
    document.querySelectorAll<HTMLElement>('[data-grupo]').forEach((g) => {
      g.hidden = !g.querySelector('[data-nombre]:not([hidden])'); // Oculta el grupo si quedó vacío
    });
    setNada(visibles === 0); // Avisa si no hay resultados
  }

  return (
    <div className="mt-6">
      <label className="buscador-terr">
        <span className="visually-hidden">{etiqueta}</span> {/* Nombre del campo para lectores de pantalla */}
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg> {/* Lupa */}
        <input type="search" placeholder={etiqueta} onInput={(e) => filtrar(e.currentTarget.value)} autoComplete="off" /> {/* Filtra mientras se escribe */}
      </label>
      <p role="status" className="m-0 mt-2 min-h-[1.5em] text-[15px]">{nada ? vacio : ''}</p> {/* Aviso cuando no hay coincidencias */}
    </div>
  );
}
