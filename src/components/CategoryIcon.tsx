import { Funnel, Disc3, Wrench, Cog, Zap, Droplets, Settings, Package } from 'lucide-react';
import type { CategoryIcon as CategoryIconName } from '@/lib/categories';

/** Icone d'une categorie (tuiles de l'accueil, menus, filtre du catalogue). */
export function CategoryIcon({ icon, size = 24, className = '' }: { icon: CategoryIconName; size?: number; className?: string }) {
  const props = { size, className, strokeWidth: 1.6, 'aria-hidden': true as const };
  switch (icon) {
    case 'filter':
      return <Funnel {...props} />;
    case 'brake':
      return <Disc3 {...props} />;
    case 'suspension':
      return <Wrench {...props} />;
    case 'transmission':
      return <Cog {...props} />;
    case 'electric':
      return <Zap {...props} />;
    case 'oil':
      return <Droplets {...props} />;
    case 'engine':
      return <Settings {...props} />;
    default:
      return <Package {...props} />;
  }
}
