import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  href?: string;
}

/** Fil d'Ariane : le dernier element est la page courante (sans lien). */
export function Breadcrumbs({ items, className = '' }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Fil d'Ariane" className={`flex flex-wrap items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      {items.map((c, i) => (
        <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
          {c.href && i < items.length - 1 ? (
            <Link href={c.href} className="hover:text-brand transition-colors">
              {c.label}
            </Link>
          ) : (
            <span className="text-slate-600 truncate max-w-[60vw]" aria-current={i === items.length - 1 ? 'page' : undefined}>
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
