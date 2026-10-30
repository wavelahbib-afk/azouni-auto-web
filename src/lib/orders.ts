import type { CartLine } from './types';
import { deliveryFee } from './shop';
import { isValidVinFormat, normalizeVin } from './vin';

/**
 * Commande du site : le client remplit ses coordonnees, la commande est ENREGISTREE dans la base du site (table commandes_web -> visible dans AZOUNI AUTO, page
 * "Commandes web") puis WhatsApp s'ouvre avec le detail pour en discuter avec le magasin. L'enregistrement est un plus : s'il echoue (table pas encore creee, reseau),
 * la commande part quand meme par WhatsApp. Pas de paiement en ligne : paiement au magasin ou a la livraison.
 */
export type DeliveryMode = 'retrait' | 'livraison';

export interface OrderForm {
  name: string;
  phone: string;
  mode: DeliveryMode;
  address: string;
  city: string;
  /** numero de chassis (VIN), facultatif : permet au magasin de verifier la compatibilite des pieces */
  vin: string;
  note: string;
}

export interface OrderTotals {
  subtotal: number;
  /** frais de livraison (0 pour un retrait au magasin, ou une livraison gratuite) */
  delivery: number;
  total: number;
}

export const EMPTY_FORM: OrderForm = { name: '', phone: '', mode: 'retrait', address: '', city: '', vin: '', note: '' };

export function orderTotals(lines: CartLine[], mode: DeliveryMode): OrderTotals {
  const subtotal = Math.round(lines.reduce((s, l) => s + l.prix_vente_ttc * l.qty, 0) * 1000) / 1000;
  const delivery = mode === 'livraison' ? deliveryFee(subtotal) : 0;
  return { subtotal, delivery, total: Math.round((subtotal + delivery) * 1000) / 1000 };
}

const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sans I, L, O, 0, 1 (confusions a l'oral)

/** Reference courte donnee au client ("K7M2QA") pour retrouver sa commande par telephone. */
export function newOrderRef(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
}

/** Numero tunisien a 8 chiffres (avec ou sans +216) ; retourne les 8 chiffres, ou null. */
export function normalizePhone(phone: string): string | null {
  const d = phone.replace(/[^\d]/g, '');
  const local = d.length === 11 && d.startsWith('216') ? d.slice(3) : d;
  return /^\d{8}$/.test(local) ? local : null;
}

/** Premier probleme du formulaire (message pour le client), ou null s'il est valide. */
export function validateOrder(form: OrderForm, lines: CartLine[]): string | null {
  if (lines.length === 0) return 'Votre panier est vide.';
  if (form.name.trim().length < 2) return 'Indiquez votre nom.';
  if (!normalizePhone(form.phone)) return 'Indiquez un numéro de téléphone valide (8 chiffres), pour que le magasin vous rappelle.';
  if (form.mode === 'livraison') {
    if (form.city.trim().length < 2) return 'Indiquez votre ville pour la livraison.';
    if (form.address.trim().length < 5) return 'Indiquez votre adresse de livraison.';
  }
  if (form.vin.trim() && !isValidVinFormat(normalizeVin(form.vin))) return "Le numéro de châssis (VIN) fait 17 caractères : des lettres (sans I, O ni Q) et des chiffres. Laissez la case vide si vous ne l'avez pas.";
  return null;
}

/** Remarque enregistree avec la commande : le VIN (s'il est donne) puis la remarque du client -- la base du site n'a pas de colonne VIN, il voyage dans la remarque. */
export function orderNote(form: OrderForm): string | null {
  const vin = form.vin.trim() ? `VIN : ${normalizeVin(form.vin)}` : '';
  return [vin, form.note.trim()].filter(Boolean).join(' · ') || null;
}

/** Derniere commande passee, gardee dans l'onglet pour la page de remerciement (reference, et message WhatsApp a renvoyer si WhatsApp ne s'est pas ouvert). */
export interface LastOrder {
  ref: string;
  /** vrai si la commande est enregistree chez le magasin (visible dans AZOUNI AUTO) ; faux = elle n'est partie que par WhatsApp */
  saved: boolean;
  mode: DeliveryMode;
  total: number;
  message: string;
}

export const LAST_ORDER_KEY = 'azouni_last_order';

export function rememberOrder(order: LastOrder): void {
  try {
    window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(order));
  } catch {
    // stockage bloque : la page de remerciement s'affiche sans le bouton de renvoi
  }
}

/**
 * Enregistre la commande dans la base du site (API REST Supabase, cle anon : la table n'autorise que l'INSERTION d'une commande "nouvelle", jamais la lecture).
 * Retourne true si elle est enregistree ; false sinon (la commande est alors envoyee par WhatsApp seulement).
 */
export async function saveOrder(ref: string, form: OrderForm, lines: CartLine[], totals: OrderTotals): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${url}/rest/v1/commandes_web`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        ref,
        nom: form.name.trim(),
        telephone: normalizePhone(form.phone),
        mode: form.mode,
        adresse: form.mode === 'livraison' ? form.address.trim() : null,
        ville: form.mode === 'livraison' ? form.city.trim() : null,
        note: orderNote(form),
        sous_total: totals.subtotal,
        frais_livraison: totals.delivery,
        total: totals.total,
        lignes: lines.map((l) => ({ code: l.code, designation: l.designation, reference: l.reference ?? null, marque: l.marque, prix: l.prix_vente_ttc, qty: l.qty })),
      }),
      signal: controller.signal,
      // la requete part meme si la page est quittee aussitot (WhatsApp s'ouvre dans la foulee, surtout sur mobile)
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
