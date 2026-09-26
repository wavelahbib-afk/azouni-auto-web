'use client';

import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart';
import type { CatalogArticle } from '@/lib/types';

export function AddToCartButton({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm shadow-sm transition-colors ${
        added ? 'bg-green-600 text-white' : 'bg-brand text-white hover:bg-brand-light'
      }`}
      onClick={() => {
        addItem(article);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? <Check size={16} /> : <ShoppingCart size={16} />}
      {added ? 'Ajouté au panier !' : 'Ajouter au panier'}
    </button>
  );
}
