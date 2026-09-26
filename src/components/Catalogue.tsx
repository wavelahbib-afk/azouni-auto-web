'use client';

import { useMemo, useState } from 'react';
import type { CatalogArticle } from '@/lib/types';
import { normalizeReference } from '@/lib/normalize';
import { ArticleCard } from './ArticleCard';

/**
 * Meme decoupage en mots que l'application de bureau
 * (electron/services/search.ts::buildFtsQuery) : accents/symboles ignores,
 * un mot = un prefixe. Ici on le reimplemente en JS (le catalogue est deja
 * charge cote client, pas de FTS5 disponible dans le navigateur).
 */
function tokenize(raw: string): string[] {
  return raw
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

/** Vrai si chaque mot de `queryTokens` est le PREFIXE d'au moins un mot de `text` (comme FTS5 "mot*"). */
function matchesAllTokensAsPrefix(text: string, queryTokens: string[]): boolean {
  const words = tokenize(text);
  return queryTokens.every((qt) => words.some((w) => w.startsWith(qt)));
}

export function Catalogue({ articles, initialQuery = '' }: { articles: CatalogArticle[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [famille, setFamille] = useState('');

  const familles = useMemo(() => Array.from(new Set(articles.map((a) => a.famille).filter((f): f is string => Boolean(f)))).sort(), [articles]);

  const filtered = useMemo(() => {
    const tokens = tokenize(query);
    const qRef = normalizeReference(query);
    return articles.filter((a) => {
      if (famille && a.famille !== famille) return false;
      if (tokens.length === 0) return true;
      // Comme l'application : mots-cles (prefixe, n'importe quel ordre) sur designation + marque...
      if (matchesAllTokensAsPrefix(`${a.designation} ${a.marque ?? ''}`, tokens)) return true;
      // ...OU reference (propre ou equivalente/d'origine), insensible au format (espaces/tirets/points).
      if (qRef && normalizeReference(a.reference ?? '').includes(qRef)) return true;
      if (qRef && a.equivalences?.some((ref) => normalizeReference(ref).includes(qRef))) return true;
      return false;
    });
  }, [articles, query, famille]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className="flex-1 border border-slate-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          placeholder="Rechercher une pièce, une référence, une marque..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {familles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
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
        <p className="text-slate-500 text-sm py-10 text-center">Aucun article ne correspond à votre recherche.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((a) => (
            <ArticleCard key={a.code} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
