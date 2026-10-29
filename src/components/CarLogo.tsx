import { CAR_LOGOS } from '@/lib/carLogos';
import { makeKey, makeLabel } from '@/lib/vehicles';

/**
 * Logo d'un constructeur (trace SVG, voir carLogos.ts) ; a defaut, son nom en lettres dans une pastille -- jamais de cadre vide.
 * `mono` : logo en gris (bande de marques) au lieu de la couleur officielle.
 */
export function CarLogo({ make, size = 36, mono = false, className = '' }: { make: string; size?: number; mono?: boolean; className?: string }) {
  const key = makeKey(make);
  const logo = CAR_LOGOS[key];
  const label = makeLabel(make);
  if (logo) {
    return (
      <svg
        role="img"
        aria-label={logo.title}
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        fill={mono ? 'currentColor' : `#${logo.hex === '000000' || logo.hex.toLowerCase() === '05141f' ? '1e293b' : logo.hex}`}
      >
        <path d={logo.path} />
      </svg>
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.3)) }}
      className={`inline-flex items-center justify-center rounded border border-slate-300 font-extrabold uppercase text-slate-500 leading-none ${className}`}
    >
      {label.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 3)}
    </span>
  );
}
