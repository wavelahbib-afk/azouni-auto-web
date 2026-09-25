'use client';

import { useMemo, useState } from 'react';
import type { CatalogArticle } from '@/lib/types';
import { normalizeReference } from '@/lib/normalize';
import { ArticleCard } from './ArticleCard';

export function Catalogue({ articles }: { articles: CatalogArticle[] }) {
  const [query, setQuery] = useState('');
  const [famille, setFamille] = useState('');

  const familles = useMemo(() => Array.from(new Set(articles.map((a) => a.famille).filter((f): f is string => Boolean(f)))).sort(), [articles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qRef = normalizeReference(query);
    return articles.filter((a) => {
      if (famille && a.famille !== famille) return false;
      if (!q) return true;
      if (a.designation.toLowerCase().includes(q) || (a.marque ?? '').toLowerCase().includes(q)) return true;
      // Recherche par reference (propre ou equivalente/d'origine) : insensible au format (espaces/tirets/points).
      if (qRef && normalizeReference(a.reference ?? '').includes(qRef)) return true;
      if (qRef && a.equivalences?.some((ref) => normalizeReference(ref).includes(qRef))) return true;
      return false;
    });
  }, [articles, query, famille]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          placeholder="Rechercher une piece, une reference, une marque..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {familles.length > 0 && (
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={famille} onChange={(e) => setFamille(e.target.value)}>
            <option value="">Toutes les familles</option>
            {familles.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-slate-500 text-sm">Aucun article ne correspond a votre recherche.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <ArticleCard key={a.code} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}
