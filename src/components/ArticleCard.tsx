'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import type { CatalogArticle } from '@/lib/types';
import { ArticlePlaceholderIcon } from './ArticlePlaceholderIcon';

export function ArticleCard({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden flex flex-col bg-white">
      <Link href={`/article/${encodeURIComponent(article.code)}`}>
        <ArticlePlaceholderIcon famille={article.famille} className="w-full aspect-square" />
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link href={`/article/${encodeURIComponent(article.code)}`} className="text-sm font-semibold text-slate-800 line-clamp-2 min-h-[2.5rem]">
          {article.designation}
        </Link>
        {article.marque && <span className="text-xs text-slate-500">{article.marque}</span>}
        <div className="mt-auto pt-2 flex items-center justify-between">
          <span className="font-bold text-blue-900">{formatMoney(article.prix_vente_ttc)}</span>
          <button
            className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-blue-900 text-white hover:bg-blue-800"
            onClick={() => addItem(article)}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
