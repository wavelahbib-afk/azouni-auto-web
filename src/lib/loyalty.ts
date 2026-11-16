/**
 * Remise de FIDELITE d'un compte client (fixee par le magasin dans AZOUNI AUTO, page « Comptes web ») : meme regle que cote magasin.
 *
 * - PAS DE CUMUL : le client paie le MEILLEUR prix entre le prix du moment (promotion ou remise par palier de prix, deja dans `prix_promo`) et son prix de fidelite
 *   (prix normal moins sa remise) -- jamais les deux l'une sur l'autre ;
 * - le prix de fidelite est arrondi au dixieme de dinar (0,1 DT), comme les remises par palier.
 *
 * Fichier pur, utilise par le navigateur (affichage du panier et message WhatsApp) ET par la « porte » serveur des commandes (qui recalcule tout : les prix envoyes par le
 * navigateur ne sont jamais crus).
 */

export const LOYALTY_MAX_PERCENT = 90;

const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const roundToTenth = (n: number): number => Math.round(n * 10) / 10;

/** Pourcentage de fidelite valide (0 a 90), ou 0 pour toute valeur douteuse. */
export function cleanPercent(value: unknown): number {
  const p = Number(value);
  return Number.isFinite(p) && p > 0 ? Math.min(p, LOYALTY_MAX_PERCENT) : 0;
}

/** Prix de fidelite d'une piece (prix normal moins `percent` %, au dixieme de dinar), ou null s'il n'y a pas de remise a donner. */
export function loyaltyPrice(normalPrice: number, percent: number): number | null {
  const p = cleanPercent(percent);
  if (!(normalPrice > 0) || p <= 0) return null;
  const price = roundToTenth(normalPrice * (1 - p / 100));
  if (!(price > 0) || price >= normalPrice) return null;
  return round3(price);
}

/**
 * Prix unitaire a payer : le plus bas entre `effective` (prix du moment : promotion ou palier) et le prix de fidelite calcule sur `normal`.
 * `normal` absent (ancien panier) : pas de calcul de fidelite possible ici, on garde `effective` (le serveur, lui, connait toujours le prix normal).
 */
export function finalUnitPrice(normal: number | null | undefined, effective: number, percent: number): number {
  const loyalty = normal != null ? loyaltyPrice(normal, percent) : null;
  return loyalty !== null && loyalty < effective ? loyalty : effective;
}

export interface PricedInput {
  qty: number;
  /** prix normal (sans promotion), si connu */
  normal?: number | null;
  /** prix du moment (promotion / palier compris) */
  effective: number;
}

/** Total d'un lot de lignes avec la fidelite, et ce que la fidelite fait gagner en plus du prix du moment (0 si la promotion est deja meilleure). */
export function loyaltyTotals(lines: PricedInput[], percent: number): { subtotal: number; saving: number } {
  let subtotal = 0;
  let saving = 0;
  for (const l of lines) {
    const unit = finalUnitPrice(l.normal, l.effective, percent);
    subtotal += unit * l.qty;
    saving += (l.effective - unit) * l.qty;
  }
  return { subtotal: round3(subtotal), saving: round3(saving) };
}
