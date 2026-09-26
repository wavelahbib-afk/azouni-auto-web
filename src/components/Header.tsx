'use client';

import { useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';

export function Header() {
  const { totalQty } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
  // Sur l'accueil, la recherche vit deja dans Catalogue.tsx (filtrage en direct, sans recharger la
  // page) : la dupliquer ici preterait a confusion. Sur les autres pages (fiche article, panier),
  // il n'existait AUCUN moyen de relancer une recherche sans revenir manuellement a l'accueil.
  const isHome = pathname === '/';

  function submitSearch() {
    const q = query.trim();
    router.push(q ? `/?q=${encodeURIComponent(q)}` : '/');
  }

  // Pas de <form> : un <form> a un seul champ texte se soumet implicitement
  // sur certains evenements clavier/autocompletion (comportement HTML natif),
  // ce qui redirigeait vers l'accueil avant meme la fin de la saisie.
  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') submitSearch();
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className={`max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3 ${isHome ? 'justify-between' : ''}`}>
        <Link href="/" className="font-bold text-lg text-blue-900 shrink-0">
          {shopName}
        </Link>
        {!isHome && (
          <input
            className="flex-1 min-w-[180px] order-3 sm:order-none border border-slate-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Rechercher une piece, une reference, une marque..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
        )}
        <Link
          href="/panier"
          className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium shrink-0"
        >
          Panier
          {totalQty > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white text-blue-900 text-xs font-bold">
              {totalQty}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
