'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { CatalogArticle } from '@/lib/types';
import { normalizeReference } from '@/lib/normalize';
import { articleTitle, articleVehicles, rawDesignation, hasPrice } from '@/lib/display';
import { ArticleCard } from './ArticleCard';

// Meme taille de page que la liste Articles de l'application de bureau.
const PAGE_SIZE = 50;
// Une famille n'est proposee en filtre qu'a partir de ce nombre d'articles.
const MIN_FAMILY_SIZE = 10;

type SortKey = 'name' | 'price_asc' | 'price_desc';

/**
 * Meme decoupage en mots que l'application de bureau
 * (electron/services/search.ts::buildFtsQuery) : accents/symboles ignores,
 * un mot = un prefixe. Ici on le reimplemente en JS (le catalogue est deja
 * charge cote client, pas de FTS5 disponible dans le navigateur). Les accents
 * sont retires ("arriere" trouve "arrière") : les titres affiches en ont maintenant.
 */
function tokenize(raw: string): string[] {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/** Vrai si chaque mot de `queryTokens` est le PREFIXE d'au moins un mot de `words` (comme FTS5 "mot*"). */
function matchesAllTokensAsPrefix(words: string[], queryTokens: string[]): boolean {
  return queryTokens.every((qt) => words.some((w) => w.startsWith(qt)));
}

interface Entry {
  article: CatalogArticle;
  title: string;
  /** Mots de la designation correcte, de la designation d'origine, des vehicules et de la marque (pour la recherche). */
  words: string[];
  /** References propres + equivalentes/d'origine, normalisees et collees (une seule recherche de sous-chaine par article). */
  refs: string;
}

export function Catalogue({ articles, initialQuery = '' }: { articles: CatalogArticle[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [famille, setFamille] = useState('');
  const [marque, setMarque] = useState('');
  const [sort, setSort] = useState<SortKey>('name');
  const [page, setPage] = useState(1);

  // Prepare une seule fois (titre mis en forme, mots de recherche, references normalisees) : le filtre tourne ensuite a chaque frappe.
  const entries = useMemo<Entry[]>(
    () =>
      articles.map((article) => ({
        article,
        title: articleTitle(article),
        words: tokenize(
          `${articleTitle(article)} ${rawDesignation(article)} ${articleVehicles(article) ?? ''} ${article.vehicules_compatibles ?? ''} ${article.marque ?? ''}`,
        ),
        refs: article.refsIndex ?? [article.reference ?? '', article.code, ...(article.equivalences ?? [])].map(normalizeReference).join('|'),
      })),
    [articles],
  );

  // Familles proposees en filtre : seulement celles qui regroupent assez d'articles pour etre utiles (sinon quelques articles isoles
  // classes dans des familles de 1 lettre donnent des boutons incomprehensibles).
  const familles = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) if (a.famille) counts.set(a.famille, (counts.get(a.famille) ?? 0) + 1);
    return Array.from(counts)
      .filter(([, n]) => n >= MIN_FAMILY_SIZE)
      .map(([f]) => f)
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }, [articles]);
  const marques = useMemo(() => Array.from(new Set(articles.map((a) => a.marque).filter((m): m is string => Boolean(m)))).sort((a, b) => a.localeCompare(b, 'fr')), [articles]);

  const filtered = useMemo(() => {
    const tokens = tokenize(query);
    const qRef = normalizeReference(query);
    const list = entries.filter(({ article, words, refs }) => {
      if (famille && article.famille !== famille) return false;
      if (marque && article.marque !== marque) return false;
      if (tokens.length === 0) return true;
      // Mots-cles (prefixe, n'importe quel ordre) sur designation correcte + designation d'origine + vehicules + marque...
      if (matchesAllTokensAsPrefix(words, tokens)) return true;
      // ...OU reference (propre ou equivalente/d'origine), insensible au format (espaces/tirets/points), a partir de 3 caracteres.
      return qRef.length >= 3 && refs.includes(qRef);
    });
    const byName = (a: Entry, b: Entry) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    if (sort === 'name') return list.sort(byName);
    // tri par prix : les articles "sur demande" (0 DT) passent toujours en dernier
    return list.sort((a, b) => {
      const pa = hasPrice(a.article);
      const pb = hasPrice(b.article);
      if (pa !== pb) return pa ? -1 : 1;
      const diff = a.article.prix_vente_ttc - b.article.prix_vente_ttc;
      return (sort === 'price_asc' ? diff : -diff) || byName(a, b);
    });
  }, [entries, query, famille, marque, sort]);

  // Retour a la page 1 quand la recherche, un filtre ou le tri change (ajustement
  // pendant le rendu, pas dans un effect : cf https://react.dev/learn/you-might-not-need-an-effect).
  const filterKey = `${query}|${famille}|${marque}|${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = query !== '' || famille !== '' || marque !== '';

  function goToPage(p: number) {
    setPage(p);
    document.getElementById('catalogue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function reset() {
    setQuery('');
    setFamille('');
    setMarque('');
  }

  const selectClass =
    'border border-slate-300 rounded-full bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            className="w-full border border-slate-300 rounded-full bg-white pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            placeholder="Rechercher une pièce, une référence, un véhicule, une marque..."
            aria-label="Rechercher dans le catalogue"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {marques.length > 1 && (
            <select className={`${selectClass} flex-1 lg:flex-none lg:w-52`} value={marque} onChange={(e) => setMarque(e.target.value)} aria-label="Filtrer par marque">
              <option value="">Toutes les marques</option>
              {marques.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
          <select className={`${selectClass} flex-1 lg:flex-none lg:w-48`} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Trier les articles">
            <option value="name">Nom (A → Z)</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {familles.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setFamille('')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              famille === '' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes les familles
          </button>
          {familles.map((f) => (
            <button
              key={f}
              onClick={() => setFamille(f)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                famille === f ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-14">
          <p className="text-slate-600 font-semibold mb-1">Aucun article ne correspond à votre recherche.</p>
          <p className="text-slate-400 text-sm mb-4">Essayez une autre référence, ou moins de mots.</p>
          {hasFilters && (
            <button onClick={reset} className="text-sm font-semibold text-brand hover:underline">
              Réinitialiser la recherche et les filtres
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 mb-3" aria-live="polite">
            {filtered.length.toLocaleString('fr-FR')} article{filtered.length > 1 ? 's' : ''} {hasFilters ? 'trouvé' + (filtered.length > 1 ? 's' : '') : 'en stock'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {paged.map(({ article }) => (
              <ArticleCard key={article.code} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-4 mt-8 text-sm" aria-label="Pagination">
              <button
                className="px-4 py-2 rounded-full font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Précédent
              </button>
              <span className="text-slate-500">
                Page {page} / {totalPages}
              </span>
              <button
                className="px-4 py-2 rounded-full font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 transition-colors"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Suivant
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
