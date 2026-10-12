// Ruta que se dibuja de lado a lado, como la franja de un bus pintado, con paradas.
// Ilustración original y decorativa (aria-hidden): no representa una ruta real.

export function RutaPintada({ className }: { className?: string }) {
  const d = 'M0 70 C120 70 150 20 270 24 S430 96 560 80 S760 14 880 30 S1080 90 1200 60'; // Curva libre de lado a lado
  const paradas = [[270, 24], [560, 80], [880, 30]]; // Puntos sobre la curva donde va una parada
  return (
    <svg viewBox="0 0 1200 110" preserveAspectRatio="none" className={className} aria-hidden="true" focusable="false">
      <path d={d} pathLength={1} className="ruta-trazo" fill="none" stroke="var(--band-maiz)" strokeWidth="6" strokeLinecap="round" /> {/* La ruta */}
      <path d={d} fill="none" stroke="var(--band-anil)" strokeWidth="2" strokeDasharray="10 14" vectorEffect="non-scaling-stroke" /> {/* Línea central punteada, como una carretera */}
      {paradas.map(([x, y], i) => (
        <circle key={x} cx={x} cy={y} r="9" className="ruta-parada" style={{ animationDelay: `${0.5 + i * 0.35}s` }} fill="var(--band-achiote)" stroke="var(--band-marfil)" strokeWidth="3" /> // Parada que aparece cuando pasa la ruta
      ))}
    </svg>
  );
}
