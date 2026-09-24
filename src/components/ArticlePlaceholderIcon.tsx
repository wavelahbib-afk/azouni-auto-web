/**
 * Pas de vraies photos en V1 (photo_path d'AZOUNI AUTO est un chemin local,
 * inexploitable depuis le web) : une icone generique par famille, avec ses
 * initiales, tient lieu de vignette.
 */
export function ArticlePlaceholderIcon({ famille, className }: { famille: string | null; className?: string }) {
  const label = (famille ?? '?').trim().slice(0, 2).toUpperCase();
  return (
    <div className={`flex items-center justify-center bg-slate-100 text-slate-400 font-bold ${className ?? ''}`}>
      <span className="text-2xl">{label}</span>
    </div>
  );
}
