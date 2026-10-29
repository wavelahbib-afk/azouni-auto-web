import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { CatalogArticle } from '@/lib/types';
import { ArticleCard } from './ArticleCard';
import { Eyebrow } from './Eyebrow';

/**
 * Rangee d'articles qui defile horizontalement, avec un titre (accueil : promotions, selection). `tone="dark"` : bande sombre pleine largeur.
 * La fiche article, elle, affiche les pieces de la meme categorie en grille (voir app/article/[code]/page.tsx).
 */
export function ProductSection({
  eyebrow,
  title,
  articles,
  moreHref,
  moreLabel = 'Voir tout',
  tone = 'light',
}: {
  eyebrow?: string;
  title: string;
  articles: CatalogArticle[];
  moreHref?: string;
  moreLabel?: string;
  tone?: 'light' | 'dark';
}) {
  if (articles.length === 0) return null;
  const dark = tone === 'dark';
  return (
    <section aria-label={title} className={dark ? 'relative overflow-hidden bg-ink my-6' : ''}>
      {dark && <div className="absolute inset-0 blueprint" aria-hidden="true" />}
      <div className={`relative max-w-7xl mx-auto px-4 ${dark ? 'py-12' : 'py-10'}`}>
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            {eyebrow && <Eyebrow onDark={dark}>{eyebrow}</Eyebrow>}
            <h2 className={`mt-2 text-4xl sm:text-5xl font-extrabold leading-[0.95] ${dark ? 'chrome-text' : 'text-ink'}`}>{title}</h2>
          </div>
          {moreHref && (
            <Link
              href={moreHref}
              className={`hidden sm:inline-flex items-center gap-1.5 font-display font-bold tracking-[0.12em] uppercase text-[15px] shrink-0 hover:gap-2.5 transition-all ${dark ? 'text-volt' : 'text-brand'}`}
            >
              {moreLabel} <ArrowRight size={16} />
            </Link>
          )}
        </div>
        <ul className="rail flex gap-3 sm:gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {articles.map((a) => (
            <li key={a.code} className="w-[14.5rem] sm:w-[16rem] shrink-0 snap-start flex">
              <ArticleCard article={a} />
            </li>
          ))}
        </ul>
        {moreHref && (
          <Link href={moreHref} className={`sm:hidden mt-2 inline-flex items-center gap-1.5 font-display font-bold tracking-[0.12em] uppercase text-[15px] ${dark ? 'text-volt' : 'text-brand'}`}>
            {moreLabel} <ArrowRight size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
