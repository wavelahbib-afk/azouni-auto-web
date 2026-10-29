import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { ShowcaseItem } from '@/lib/showcase';
import { formatInt } from '@/lib/format';

/** Prix en chiffres condenses : "128" en grand, ".520" en petit. */
function PriceTag({ value, className = '' }: { value: number; className?: string }) {
  const [int, dec] = value.toFixed(3).split('.');
  return (
    <span className={`font-display font-extrabold leading-none ${className}`}>
      <span className="text-2xl">{formatInt(Number(int))}</span>
      <span className="text-xs">.{dec}</span>
      <span className="text-xs ml-0.5">DT</span>
    </span>
  );
}

function Card({ item }: { item: ShowcaseItem }) {
  return (
    <li className="shrink-0 pr-4">
      <Link
        href={`/article/${encodeURIComponent(item.code)}`}
        tabIndex={-1}
        aria-hidden="true"
        className="block w-36 rounded-lg border border-white/15 bg-ink-3/90 p-2 hover:border-volt/70 transition-colors"
      >
        <span className="relative block aspect-square overflow-hidden rounded bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photo} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain p-1" />
          {item.percent !== null && <span className="absolute left-0 top-0 bg-amber-400 px-1.5 py-0.5 font-display text-xs font-extrabold leading-none text-ink">−{item.percent}%</span>}
        </span>
        <span className="mt-2 block truncate text-[11px] text-slate-400">{item.title}</span>
        <PriceTag value={item.price} className={`mt-1 block ${item.oldPrice !== null ? 'text-amber-300' : 'text-white'}`} />
      </Link>
    </li>
  );
}

/**
 * Fond anime du bandeau d'accueil : trois rangees de vraies photos d'articles avec leur prix qui defilent lentement, en sens alternes, sur un fond incline.
 * Purement decoratif (aria-hidden) : le texte du bandeau reste lisible grace au degrade pose par-dessus (voir Hero.tsx). Passer la souris sur une rangee la met en pause.
 */
export function HeroShowcase({ items }: { items: ShowcaseItem[] }) {
  if (items.length < 6) return null;
  const third = Math.ceil(items.length / 3);
  const rows = [items.slice(0, third), items.slice(third, third * 2), items.slice(third * 2)].map((r) => (r.length >= 4 ? r : items.slice(0, third)));
  const speeds = [80, 95, 70];
  return (
    <div className="absolute -inset-x-32 -inset-y-16 flex -rotate-6 flex-col justify-center gap-4 opacity-95" aria-hidden="true">
      {rows.map((row, i) => (
        // la rangee est doublee : l'animation avance de la moitie de sa largeur puis recommence, sans coupure visible
        <ul key={i} className={`marquee-row ${i % 2 === 1 ? 'rev' : ''}`} style={{ '--dur': `${speeds[i]}s`, marginLeft: `${i * -3}rem` } as CSSProperties}>
          {[...row, ...row].map((item, k) => (
            <Card key={`${item.code}-${k}`} item={item} />
          ))}
        </ul>
      ))}
    </div>
  );
}

/**
 * Photos d'un carreau de rayon : 4 images qui se succedent en fondu avec un leger zoom (animation CSS, voir globals.css). Moins de 4 photos : elles tournent.
 * Le conteneur parent doit etre `relative` et avoir une hauteur.
 */
export function TileSlides({ items }: { items: ShowcaseItem[] }) {
  if (items.length === 0) return null;
  const slides = Array.from({ length: 4 }, (_, i) => items[i % items.length]);
  return (
    <>
      {slides.map((item, i) => (
        <span key={`${item.code}-${i}`} className="tile-slide bg-white" style={{ '--i': i } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.photo} alt={i === 0 ? item.title : ''} loading="lazy" decoding="async" className="h-full w-full object-contain p-3" />
        </span>
      ))}
    </>
  );
}
