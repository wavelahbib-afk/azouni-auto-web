/**
 * Sur-titre de section : les "traits de vitesse" du logo (trois barres inclinees) suivis d'un petit libelle en capitales.
 * `onDark` : version pour fond sombre.
 */
export function Eyebrow({ children, onDark = false, className = '' }: { children: React.ReactNode; onDark?: boolean; className?: string }) {
  return (
    <p className={`flex items-center gap-2.5 font-display font-semibold uppercase tracking-[0.16em] text-[13px] ${onDark ? 'text-volt' : 'text-brand'} ${className}`}>
      <span className="flex items-center gap-[3px] shrink-0" aria-hidden="true">
        <span className="block h-3.5 w-[3px] -skew-x-[20deg] bg-current" />
        <span className="block h-3.5 w-[3px] -skew-x-[20deg] bg-current opacity-60" />
        <span className="block h-3.5 w-[3px] -skew-x-[20deg] bg-current opacity-30" />
      </span>
      {children}
    </p>
  );
}
