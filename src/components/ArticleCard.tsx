'use client';

import Link from 'next/link';
import { Plus, Check, Car, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import { articleRef, articleTitle, articleVehicles, hasPrice } from '@/lib/display';
import { buildArticleQuestionMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import type { CatalogArticle } from '@/lib/types';
import { ArticleImage } from './ArticleImage';

export function ArticleCard({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const lowStock = article.stock_qty > 0 && article.stock_qty <= 3;
  const title = articleTitle(article);
  const vehicles = articleVehicles(article);
  const ref = articleRef(article);
  const priced = hasPrice(article);
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
  const shopWhatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || '';
  const href = `/article/${encodeURIComponent(article.code)}`;

  function handleAdd() {
    addItem(article);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="group border border-slate-200 rounded-2xl overflow-hidden flex flex-col bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden="true">
        <ArticleImage photoUrl={article.photo_url} alt="" className="w-full aspect-square" />
        {lowStock && (
          <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            Derniers stocks
          </span>
        )}
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex flex-col gap-0.5 mb-1.5">
          {article.marque && <span className="text-[11px] font-bold text-brand uppercase tracking-wide truncate">{article.marque}</span>}
          <span className="text-[11px] font-mono text-slate-400 truncate" title={ref}>
            Réf. {ref}
          </span>
        </div>

        <h3 className="min-h-[2.5rem]">
          <Link href={href} className="text-sm font-semibold leading-snug text-slate-800 line-clamp-2 group-hover:text-brand transition-colors">
            {title}
          </Link>
        </h3>

        {vehicles && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500 line-clamp-2" title={vehicles}>
            <Car size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="line-clamp-2">{vehicles}</span>
          </p>
        )}

        <div className="mt-auto pt-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-green-700 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
            En stock
          </p>
          <div className="flex items-center justify-between gap-2">
            {priced ? (
              <span className="font-extrabold text-slate-900 text-[15px]">{formatMoney(article.prix_vente_ttc)}</span>
            ) : (
              <span className="text-sm font-semibold text-slate-500">Prix sur demande</span>
            )}
            {priced ? (
              <button
                onClick={handleAdd}
                aria-label={`Ajouter au panier : ${title}`}
                className={`inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors shrink-0 ${
                  added ? 'bg-green-600 text-white' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white'
                }`}
              >
                {added ? <Check size={16} /> : <Plus size={16} />}
              </button>
            ) : (
              shopWhatsapp && (
                <a
                  href={buildWhatsAppLink(shopWhatsapp, buildArticleQuestionMessage(shopName, title, ref, article.marque))}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Demander le prix sur WhatsApp : ${title}`}
                  title="Demander le prix sur WhatsApp"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-colors shrink-0"
                >
                  <MessageCircle size={16} />
                </a>
              )
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
