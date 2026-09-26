import { ArticlePlaceholderIcon } from './ArticlePlaceholderIcon';

/**
 * Photo reelle de l'article si synchronisee (photo_url), sinon icone
 * generique -- jamais de cadre vide. <img> simple (pas next/image) : le
 * domaine du bucket Supabase est propre a chaque installation, pas connu a
 * l'avance pour la config next.config.ts.
 */
export function ArticleImage({ photoUrl, alt, className }: { photoUrl: string | null; alt: string; className?: string }) {
  if (!photoUrl) return <ArticlePlaceholderIcon className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl} alt={alt} className={`object-cover bg-slate-50 ${className ?? ''}`} loading="lazy" />;
}
