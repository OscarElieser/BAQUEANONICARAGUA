import { splitMarkers } from '@/lib/legal'; // Separa los [marcador: …] del texto

/** Muestra un texto resaltando los datos pendientes para que nadie los confunda con información real. */
export function TextoLegal({ text }: { text: string }) {
  return (
    <>
      {splitMarkers(text).map((part, i) =>
        part.marker ? (
          <mark
            key={i} // Posición del trozo
            className="rounded-[4px] border border-dashed border-oro-text bg-transparent px-1 text-oro-text" // Recuadro punteado: dato por confirmar
            title="Dato pendiente de confirmar" // Explicación al pasar el cursor
          >
            {part.text} {/* Texto del marcador */}
          </mark>
        ) : (
          <span key={i}>{part.text}</span> // Texto normal
        ),
      )}
    </>
  );
}
