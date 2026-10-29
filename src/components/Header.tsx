'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShoppingCart, Search, Phone, Menu, X, ChevronDown, LayoutGrid, Truck } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { CATEGORIES } from '@/lib/categories';
import { DELIVERY, SHOP } from '@/lib/shop';
import { formatDt } from '@/lib/format';
import { CategoryIcon } from './CategoryIcon';

const NAV = [
  { href: '/', label: 'Accueil' },
  { href: '/catalogue', label: 'Catalogue' },
  { href: '/livraison-paiement', label: 'Livraison & paiement' },
  { href: '/contact', label: 'Nous trouver' },
];

/** Nom du magasin en lettres du logo : AZOUNI en chrome, AUTO en bleu entre deux traits de vitesse. */
function Wordmark() {
  const [first, ...rest] = SHOP.name.split(' ');
  return (
    <span className="leading-none">
      <span className="block font-display font-extrabold text-[26px] tracking-[0.06em] uppercase chrome-text">{first}</span>
      {rest.length > 0 && (
        <span className="mt-1 flex items-center gap-1.5 text-volt" aria-hidden="true">
          <span className="block h-[2px] w-3 -skew-x-[30deg] bg-current" />
          <span className="font-display font-bold text-[13px] tracking-[0.42em] uppercase">{rest.join(' ')}</span>
          <span className="block h-[2px] w-3 -skew-x-[30deg] bg-current" />
        </span>
      )}
    </span>
  );
}

export function Header({ hasPromos = false }: { hasPromos?: boolean }) {
  const { totalQty } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);

  // referme les menus quand on change de page (ajustement pendant le rendu, pas dans un effect), ou quand on clique ailleurs
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
    setCatsOpen(false);
  }
  useEffect(() => {
    if (!catsOpen) return;
    function onClick(e: MouseEvent) {
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) setCatsOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCatsOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [catsOpen]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/catalogue?q=${encodeURIComponent(q)}` : '/catalogue');
  }

  const nav = hasPromos ? [...NAV.slice(0, 2), { href: '/catalogue?promo=1', label: 'Promos' }, ...NAV.slice(2)] : NAV;
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname === href.split('?')[0] && !href.includes('?'));

  return (
    <header className="sticky top-0 z-30 bg-ink text-chrome shadow-[0_6px_24px_-12px_rgba(0,0,0,0.6)]">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 text-chrome/80 hover:text-white"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link href="/" className="flex items-center gap-3 shrink-0" aria-label={`${SHOP.name} - accueil`}>
            <Image src="/logo.png" alt="" width={46} height={46} className="rounded-md ring-1 ring-white/15" priority />
            <span className="hidden sm:block">
              <Wordmark />
            </span>
          </Link>

          <form onSubmit={submitSearch} role="search" className="relative flex-1 min-w-0 max-w-2xl mx-auto">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              className="w-full border border-white/15 rounded-md bg-ink-3 text-chrome placeholder:text-slate-400 pl-10 pr-14 py-2.5 text-sm focus:outline-none focus:border-volt focus:ring-2 focus:ring-volt/30"
              placeholder="Référence, pièce ou voiture : tapez, on cherche"
              aria-label="Rechercher une pièce"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="submit"
              aria-label="Lancer la recherche"
              className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 rounded bg-brand text-white hover:bg-brand-light inline-flex items-center justify-center transition-colors"
            >
              <Search size={16} />
            </button>
          </form>

          <a href={SHOP.phoneHref} className="hidden md:flex items-center gap-3 shrink-0 group" aria-label={`Appeler le ${SHOP.phone}`}>
            <span className="w-9 h-9 rounded border border-volt/50 text-volt inline-flex items-center justify-center group-hover:bg-volt/10 transition-colors">
              <Phone size={17} aria-hidden="true" />
            </span>
            <span className="leading-none">
              <span className="block font-display font-semibold text-[11px] tracking-[0.18em] uppercase text-slate-400">Au comptoir · {SHOP.contactPerson}</span>
              <span className="block font-display font-bold text-[22px] tracking-wide text-white mt-1">{SHOP.phone}</span>
            </span>
          </a>

          <Link
            href="/panier"
            className="relative inline-flex flex-col items-center shrink-0 px-2 text-chrome/80 hover:text-white transition-colors"
            aria-label={`Panier : ${totalQty} article${totalQty > 1 ? 's' : ''}`}
          >
            <ShoppingCart size={22} />
            <span className="font-display font-semibold text-[11px] tracking-[0.14em] uppercase mt-0.5 hidden sm:block">Panier</span>
            {totalQty > 0 && (
              <span className="absolute -top-1 -right-0.5 inline-flex items-center justify-center min-w-[1.15rem] h-[1.15rem] px-1 rounded-sm text-[11px] font-bold bg-amber-400 text-ink">{totalQty}</span>
            )}
          </Link>
        </div>
      </div>

      {/* barre de navigation (ordinateur) */}
      <div className="hidden lg:block bg-ink-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2">
          <div className="relative" ref={catsRef}>
            <button
              type="button"
              onClick={() => setCatsOpen((o) => !o)}
              aria-expanded={catsOpen}
              aria-haspopup="true"
              className={`inline-flex items-center gap-2.5 my-1.5 mr-3 px-4 py-2 rounded border font-display font-bold text-[15px] tracking-[0.1em] uppercase transition-colors ${
                catsOpen ? 'bg-brand border-brand text-white' : 'border-volt/50 text-volt hover:bg-volt/10'
              }`}
            >
              <LayoutGrid size={16} />
              Les rayons
              <ChevronDown size={14} className={`transition-transform ${catsOpen ? 'rotate-180' : ''}`} />
            </button>
            {catsOpen && (
              <div className="absolute left-0 top-full w-80 bg-ink-2 border border-white/10 shadow-2xl rounded-b-md py-2 z-40">
                {CATEGORIES.map((c, i) => (
                  <Link key={c.slug} href={`/catalogue?categorie=${c.slug}`} className="flex items-center gap-3 px-4 py-2.5 text-sm text-chrome/85 hover:bg-white/5 hover:text-white transition-colors">
                    <span className="font-display font-bold text-xs text-slate-500 w-5">{String(i + 1).padStart(2, '0')}</span>
                    <CategoryIcon icon={c.icon} size={18} className="text-volt" />
                    {c.label}
                  </Link>
                ))}
                <Link href="/catalogue" className="block px-4 py-2.5 mt-1 border-t border-white/10 font-display font-bold text-sm tracking-[0.1em] uppercase text-volt hover:bg-white/5">
                  Tout le catalogue →
                </Link>
              </div>
            )}
          </div>
          <nav aria-label="Navigation principale" className="flex items-center">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={isActive(n.href) ? 'page' : undefined}
                className={`relative px-3.5 py-3.5 font-display font-semibold text-[15px] tracking-[0.1em] uppercase transition-colors ${
                  n.label === 'Promos' ? 'text-amber-300 hover:text-amber-200' : isActive(n.href) ? 'text-white' : 'text-chrome/70 hover:text-white'
                } ${isActive(n.href) ? 'after:absolute after:left-3.5 after:right-3.5 after:bottom-0 after:h-[3px] after:bg-volt' : ''}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <p className="ml-auto hidden xl:flex items-center gap-2 text-[13px] text-slate-400">
            <Truck size={15} className="text-volt" aria-hidden="true" />
            Livraison {formatDt(DELIVERY.fee)} · offerte dès {DELIVERY.freeFrom} DT
          </p>
        </div>
      </div>

      {/* menu telephone */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-ink-2 max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          <nav aria-label="Navigation principale" className="px-4 py-3">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="block py-3 font-display font-semibold tracking-[0.1em] uppercase text-chrome border-b border-white/10">
                {n.label}
              </Link>
            ))}
            <p className="pt-4 pb-2 font-display font-semibold text-xs tracking-[0.18em] uppercase text-slate-400">Les rayons</p>
            {CATEGORIES.map((c) => (
              <Link key={c.slug} href={`/catalogue?categorie=${c.slug}`} className="flex items-center gap-3 py-2 text-sm text-chrome/85">
                <CategoryIcon icon={c.icon} size={16} className="text-volt" />
                {c.label}
              </Link>
            ))}
            <a href={SHOP.phoneHref} className="mt-4 flex items-center gap-2 rounded bg-brand text-white font-bold px-4 py-3 text-sm">
              <Phone size={16} />
              Appeler {SHOP.contactPerson} : {SHOP.phone}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
