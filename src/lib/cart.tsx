'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { CartLine, CatalogArticle } from './types';

const STORAGE_KEY = 'azouni_cart';

function readCart(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function writeCart(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // navigation privee / stockage bloque : le panier reste en memoire pour cette session seulement.
  }
}

/**
 * Panier = petit store externe partage par tout le site (localStorage),
 * lu via useSyncExternalStore -- pas de Context/Provider necessaire, et pas
 * de setState() dans un useEffect au montage (la lecture initiale se fait
 * dans getSnapshot, cote client uniquement ; getServerSnapshot renvoie []
 * pour le rendu serveur/l'hydratation).
 */
const EMPTY_CART: CartLine[] = [];

let cartState: CartLine[] = EMPTY_CART;
let initialized = false;
const listeners = new Set<() => void>();

function ensureInitialized(): void {
  if (!initialized && typeof window !== 'undefined') {
    cartState = readCart();
    initialized = true;
  }
}

function setCart(next: CartLine[]): void {
  cartState = next;
  writeCart(cartState);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): CartLine[] {
  ensureInitialized();
  return cartState;
}

function getServerSnapshot(): CartLine[] {
  // Reference stable (meme tableau a chaque appel) : useSyncExternalStore l'exige
  // pour ne pas se re-render en boucle -- un `[]` recree a chaque appel ne suffit pas.
  return EMPTY_CART;
}

export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((article: CatalogArticle, qty = 1) => {
    const existing = cartState.find((l) => l.code === article.code);
    if (existing) {
      setCart(cartState.map((l) => (l.code === article.code ? { ...l, qty: l.qty + qty } : l)));
    } else {
      setCart([...cartState, { code: article.code, designation: article.designation, marque: article.marque, prix_vente_ttc: article.prix_vente_ttc, qty }]);
    }
  }, []);

  const updateQty = useCallback((code: string, qty: number) => {
    setCart(qty <= 0 ? cartState.filter((l) => l.code !== code) : cartState.map((l) => (l.code === code ? { ...l, qty } : l)));
  }, []);

  const removeItem = useCallback((code: string) => {
    setCart(cartState.filter((l) => l.code !== code));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const totalQty = lines.reduce((sum, l) => sum + l.qty, 0);
  const totalAmount = lines.reduce((sum, l) => sum + l.qty * l.prix_vente_ttc, 0);

  return { lines, addItem, updateQty, removeItem, clear, totalQty, totalAmount };
}
