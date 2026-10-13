'use client';
// Botón que abre el diálogo de impresión del navegador (desde ahí también se puede guardar como PDF).

export function BotonImprimir({ texto }: { texto: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="boton-marca w-full justify-center"> {/* Abre imprimir / guardar como PDF */}
      {texto}
    </button>
  );
}
