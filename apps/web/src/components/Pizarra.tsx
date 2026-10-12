// Pizarra de la pulpería: lo que ofrece un negocio, como el menú escrito en tiza.
// Siempre oscura (en los dos temas) con texto marfil; cada línea con puntos hasta el precio.
export type LineaPizarra = { label: string; amount: string; note: string }; // Una oferta con su precio y su fuente

export function Pizarra({ title, lines, empty }: { title: string; lines: LineaPizarra[]; empty: string }) {
  return (
    <section className="pizarra mt-8 rounded-[var(--radius-m)] p-6 sm:p-8">
      <h2 className="m-0 mb-4 font-mundo text-[30px] font-bold">{title}</h2> {/* Título de la pizarra */}
      {lines.length === 0 ? (
        <p className="m-0 text-ink-muted">{empty}</p> // Sin tarifas: se dice, no se inventa
      ) : (
        <ul className="m-0 list-none p-0">
          {lines.map((l) => (
            <li key={l.label} className="py-2">
              <div className="flex items-baseline gap-3 text-[18px]">
                <span className="font-bold">{l.label}</span> {/* Oferta */}
                <span aria-hidden="true" className="pizarra-puntos min-w-6 flex-1" /> {/* Puntos hasta el precio */}
                <span className="font-mundo text-[22px] font-bold">{l.amount}</span> {/* Precio */}
              </div>
              <p className="m-0 text-[14px] text-ink-muted">{l.note}</p> {/* Fecha y quién lo informó */}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
