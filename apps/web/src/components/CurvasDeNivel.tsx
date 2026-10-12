/**
 * Motivo de relieve "Territorios vivos": anillos concéntricos en oro con opacidad
 * creciente hacia la cima. Decorativo salvo que reciba `label`.
 * En el mapa real las curvas vienen de un modelo de elevación con licencia.
 */
type Peak = { cx: number; cy: number; rx: number; ry: number; rings: number; active?: boolean };

const ometepe: Peak[] = [
  { cx: 240, cy: 228, rx: 230, ry: 170, rings: 7, active: true },
  { cx: 474, cy: 312, rx: 150, ry: 112, rings: 5 },
];

export function CurvasDeNivel({
  peaks = ometepe,
  label,
  animate = false,
  className,
}: {
  peaks?: Peak[];
  label?: string;
  animate?: boolean;
  className?: string;
}) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
  return (
    <svg viewBox="0 0 640 480" className={className} {...a11y}>
      {peaks.map((p, pi) => (
        <g key={pi} fill="none" stroke="var(--oro)">
          {Array.from({ length: p.rings }, (_, i) => {
            const t = i / Math.max(p.rings - 1, 1); // 0 = base, 1 = cima
            const scale = 1 - t * 0.9;
            return (
              <ellipse
                key={i}
                className={animate ? 'curva' : undefined}
                style={animate ? { animationDelay: `${i * 90}ms` } : undefined}
                cx={p.cx - t * 4}
                cy={p.cy - t * 10}
                rx={p.rx * scale}
                ry={p.ry * scale}
                opacity={0.15 + t * 0.8}
                strokeWidth={i === p.rings - 1 ? 2 : 1.4}
              />
            );
          })}
          <circle cx={p.cx - 4} cy={p.cy - 10} r={5} fill={p.active ? 'var(--terracota)' : 'var(--oro)'} stroke="none" />
        </g>
      ))}
    </svg>
  );
}
