/**
 * Contour d'un pignon (clin d'oeil au logo), trace par calcul : `teeth` dents, rayon exterieur `outer`, rayon des creux `inner`, et un trou central.
 * Purement decoratif (fond du bandeau d'accueil et du pied de page).
 */
export function Gear({ className = '', teeth = 12 }: { className?: string; teeth?: number }) {
  const outer = 96;
  const inner = 80;
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    // chaque dent : creux -> flanc montant -> sommet -> flanc descendant
    for (const [r, d] of [
      [inner, 0],
      [outer, 0.18],
      [outer, 0.42],
      [inner, 0.6],
    ] as const) {
      const ang = a + d * step;
      pts.push(`${(100 + r * Math.cos(ang)).toFixed(2)},${(100 + r * Math.sin(ang)).toFixed(2)}`);
    }
  }
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <polygon points={pts.join(' ')} strokeLinejoin="round" />
      <circle cx="100" cy="100" r="58" />
      <circle cx="100" cy="100" r="22" />
    </svg>
  );
}
