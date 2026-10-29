'use client';

import Link from 'next/link';
import { Plus, Check, Car, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/lib/cart';
import { articleRef, articleTitle, articleVehicles, hasPrice, promoPercent, promoPrice } from '@/lib/display';
import { buildArticleQuestionMessage, buildWhatsAppLink } from '@/lib/whatsapp';
import { SHOP } from '@/lib/shop';
import type { CatalogArticle } from '@/lib/types';
import { ArticleImage } from './ArticleImage';

/** Prix en gros chiffres condenses : "128" en grand, ".520 DT" en petit (les millimes restent lisibles sans prendre la place). */
function Price({ value, className }: { value: number; className: string }) {
  const [int, dec] = value.toFixed(3).split('.');
  return (
    <span className={`font-display font-extrabold leading-none ${className}`}>
      <span className="text-[1.7rem]">{int}</span>
      <span className="text-sm">.{dec}</span>
      <span className="text-sm ml-1 font-bold">DT</span>
    </span>
  );
}

export function ArticleCard({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const title = articleTitle(article);
  const vehicles = articleVehicles(article);
  const ref = articleRef(article);
  const priced = hasPrice(article);
  const promo = promoPrice(article);
  const percent = promoPercent(article);
  const href = `/article/${encodeURIComponent(article.code)}`;

  function handleAdd() {
    addItem(article);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <article className="group relative w-full border border-slate-200 rounded-lg overflow-hidden flex flex-col bg-white hover:border-brand hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
      <span className="absolute inset-x-0 top-0 h-[3px] bg-brand scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300 z-10" aria-hidden="true" />
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden="true">
        <ArticleImage photoUrl={article.photo_url} alt="" className="w-full aspect-[4/3]" />
        {percent !== null && (
          <span className="chamfer-sm absolute top-0 left-0 bg-amber-400 text-ink font-display font-extrabold text-lg leading-none pl-2.5 pr-3.5 py-1.5">−{percent}%</span>
        )}
        {!article.photo_url && <span className="absolute bottom-2 left-2 font-mono text-[10px] uppercase tracking-wider text-slate-500 bg-white/90 px-1.5 py-0.5 rounded-sm">photo à venir</span>}
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-display font-bold text-[13px] tracking-[0.12em] uppercase text-brand truncate">{article.marque ?? ' '}</span>
          <span className="font-mono text-[10.5px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-sm truncate max-w-[55%]" title={ref}>
            {ref}
          </span>
        </div>

        <h3 className="min-h-[2.5rem]">
          <Link href={href} className="text-[15px] font-semibold leading-snug text-ink line-clamp-2 group-hover:text-brand transition-colors">
            {title}
          </Link>
        </h3>

        {vehicles && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-500" title={vehicles}>
            <Car size={13} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="line-clamp-2">{vehicles}</span>
          </p>
        )}

        <div className="mt-auto pt-3">
          <p className="flex items-center gap-1.5 font-display font-semibold text-[12px] tracking-[0.14em] uppercase text-green-700 mb-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" aria-hidden="true" />
            En stock
          </p>
          <div className="flex items-end justify-between gap-2">
            {priced ? (
              <span className="flex flex-col gap-1">
                <Price value={promo ?? article.prix_vente_ttc} className={promo !== null ? 'text-red-600' : 'text-ink'} />
                {promo !== null && <span className="text-[11px] text-slate-400 line-through leading-none">{article.prix_vente_ttc.toFixed(3)} DT</span>}
              </span>
            ) : (
              <span className="font-display font-bold text-base tracking-wide uppercase text-slate-500">Prix sur demande</span>
            )}
            {priced ? (
              <button
                onClick={handleAdd}
                aria-label={`Ajouter au panier : ${title}`}
                className={`inline-flex items-center justify-center w-10 h-10 rounded transition-colors shrink-0 ${added ? 'bg-green-600 text-white' : 'bg-ink text-white hover:bg-brand'}`}
              >
                {added ? <Check size={18} /> : <Plus size={18} />}
              </button>
            ) : (
              <a
                href={buildWhatsAppLink(SHOP.whatsapp, buildArticleQuestionMessage(SHOP.name, title, ref, article.marque))}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Demander le prix sur WhatsApp : ${title}`}
                title="Demander le prix sur WhatsApp"
                className="inline-flex items-center justify-center w-10 h-10 rounded bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition-colors shrink-0"
              >
                <MessageCircle size={18} />
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
