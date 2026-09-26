import { PackageSearch } from 'lucide-react';

/**
 * Pas encore de photo pour cet article (pas de photo_path sur l'article,
 * dossier photos_articles pas encore copie sur le PC serveur, ou premiere
 * synchro pas encore faite) : icone generique, jamais un cadre vide.
 */
export function ArticlePlaceholderIcon({ className }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-300 ${className ?? ''}`}>
      <PackageSearch size={40} strokeWidth={1.5} />
    </div>
  );
}
