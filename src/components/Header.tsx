'use client';

import { useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, MessageCircle, Search } from 'lucide-react';
import { useCart } from '@/lib/cart';

export function Header() {
  const { totalQty } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
  const shopWhatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || '';
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
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image src="/logo.png" alt={shopName} width={40} height={40} className="rounded-lg" priority />
          <div className="leading-tight">
            <div className="font-extrabold text-brand tracking-tight">{shopName}</div>
            <div className="text-[11px] text-slate-400 -mt-0.5">Pièces détachées automobiles</div>
          </div>
        </Link>

        {!isHome && (
          <div className="relative flex-1 min-w-[180px] order-3 sm:order-none">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full border border-slate-300 rounded-full pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Rechercher une pièce, une référence, une marque..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
            />
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {shopWhatsapp && (
            <a
              href={`https://wa.me/${shopWhatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          )}
          <Link
            href="/panier"
            className="relative inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-light transition-colors"
          >
            <ShoppingCart size={16} />
            Panier
            {totalQty > 0 && (
              <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-white text-brand text-xs font-bold shadow">
                {totalQty}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
