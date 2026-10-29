import { PackageSearch } from 'lucide-react';

/**
 * Pas encore de photo pour cet article (pas de photo_path sur l'article,
 * dossier photos_articles pas encore copie sur le PC serveur, ou premiere
 * synchro pas encore faite) : fond de plan technique et icone generique,
 * jamais un cadre vide.
 */
export function ArticlePlaceholderIcon({ className }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center bg-slate-100 blueprint-light text-slate-300 ${className ?? ''}`}>
      <PackageSearch size={44} strokeWidth={1.3} />
    </div>
  );
}
