'use client';

import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import type { CatalogArticle } from '@/lib/types';
import { ArticleImage } from './ArticleImage';

export function ArticleCard({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const lowStock = article.stock_qty > 0 && article.stock_qty <= 3;

  function handleAdd() {
    addItem(article);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <div className="group border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <Link href={`/article/${encodeURIComponent(article.code)}`} className="relative block">
        <ArticleImage photoUrl={article.photo_url} alt={article.designation} className="w-full aspect-square" />
        {lowStock && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Derniers stocks
          </span>
        )}
      </Link>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        {article.marque && <span className="text-[11px] font-semibold text-brand uppercase tracking-wide">{article.marque}</span>}
        <Link
          href={`/article/${encodeURIComponent(article.code)}`}
          className="text-sm font-medium text-slate-800 line-clamp-2 min-h-[2.5rem] group-hover:text-brand transition-colors"
        >
          {article.designation}
        </Link>
        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
          <span className="font-extrabold text-slate-900">{formatMoney(article.prix_vente_ttc)}</span>
          <button
            onClick={handleAdd}
            aria-label="Ajouter au panier"
            className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${
              added ? 'bg-green-600 text-white' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white'
            }`}
          >
            {added ? <Check size={16} /> : <Plus size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
