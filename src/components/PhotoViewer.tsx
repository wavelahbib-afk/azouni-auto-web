'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, X, ZoomIn, ZoomOut } from 'lucide-react';
import { ArticleImage } from './ArticleImage';

/**
 * Photo de la fiche article, cliquable : un clic l'ouvre en PLEIN ECRAN (photo entiere, sans recadrage), avec un bouton de zoom (la photo passe a 2 fois sa taille, on la fait defiler),
 * un lien pour l'ouvrir dans un nouvel onglet et la fermeture par la croix, la touche Echap ou un clic a cote de la photo. Le defilement de la page est bloque pendant l'agrandissement,
 * et le focus revient sur la photo a la fermeture (clavier et lecteurs d'ecran). Sans photo, l'icone generique s'affiche, sans bouton.
 * La photo agrandie est la photo d'origine envoyee par le magasin (photo_url) : rien de plus a envoyer.
 */
export function PhotoViewer({ photoUrl, alt, className }: { photoUrl: string | null; alt: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setZoomed(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open, close]);

  if (!photoUrl) return <ArticleImage photoUrl={photoUrl} alt={alt} className={className} />;

  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className="group relative block w-full cursor-zoom-in text-left" aria-label={`Agrandir la photo : ${alt}`} aria-haspopup="dialog">
        <ArticleImage photoUrl={photoUrl} alt={alt} className={className} />
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded bg-slate-900/80 px-2.5 py-1.5 font-display text-xs font-bold uppercase tracking-wider text-white opacity-90 transition-opacity group-hover:opacity-100">
          <ZoomIn size={14} aria-hidden="true" /> Agrandir
        </span>
      </button>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Photo : ${alt}`} className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95" onClick={close}>
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
            <p className="min-w-0 truncate text-sm text-slate-300">{alt}</p>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setZoomed((z) => !z)} className="inline-flex items-center gap-1.5 rounded bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20" aria-pressed={zoomed}>
                {zoomed ? <ZoomOut size={16} aria-hidden="true" /> : <ZoomIn size={16} aria-hidden="true" />}
                {zoomed ? 'Reduire' : 'Zoom'}
              </button>
              <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
                <ExternalLink size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Nouvel onglet</span>
              </a>
              <button ref={closeRef} type="button" onClick={close} className="inline-flex items-center gap-1.5 rounded bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20" aria-label="Fermer la photo">
                <X size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Fermer</span>
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 overflow-auto p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={alt}
              data-zoomed={zoomed ? '1' : '0'}
              onClick={(e) => {
                e.stopPropagation();
                setZoomed((z) => !z);
              }}
              className={`m-auto select-none rounded bg-white ${zoomed ? 'w-[200%] max-w-none cursor-zoom-out' : 'max-h-full max-w-full cursor-zoom-in object-contain'}`}
            />
          </div>
        </div>
      )}
    </>
  );
}
