'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';
import type { CatalogArticle } from '@/lib/types';

export function AddToCartButton({ article }: { article: CatalogArticle }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      className="px-5 py-2.5 rounded-lg bg-blue-900 text-white font-medium hover:bg-blue-800"
      onClick={() => {
        addItem(article);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? 'Ajoute au panier !' : 'Ajouter au panier'}
    </button>
  );
}
