'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';

export function Header() {
  const { totalQty } = useCart();
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-blue-900">
          {shopName}
        </Link>
        <Link href="/panier" className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-900 text-white text-sm font-medium">
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
