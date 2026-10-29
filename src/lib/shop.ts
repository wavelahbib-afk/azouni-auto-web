/**
 * Informations de la boutique, utilisees partout (en-tete, pied de page, pages Contact et Livraison, panier, message WhatsApp, referencement).
 * Les valeurs par defaut sont celles du magasin ; chacune peut etre remplacee par une variable d'environnement (Vercel > Settings > Environment Variables)
 * sans toucher au code. Les variables NEXT_PUBLIC_* existantes (NEXT_PUBLIC_SHOP_NAME, NEXT_PUBLIC_SHOP_WHATSAPP) continuent de fonctionner telles quelles.
 */

const digits = (s: string): string => s.replace(/[^\d]/g, '');

/** Numero au format international sans "+" (21656456124) : "56 456 124" -> 21656456124 ; deja international -> inchange. */
export function toInternational(phone: string): string {
  const d = digits(phone);
  return d.length === 8 ? `216${d}` : d;
}

/** "56 456 124" (groupes de 2-3 chiffres) a partir de 8 chiffres ; sinon tel quel. */
export function formatLocalPhone(phone: string): string {
  const d = digits(phone);
  const local = d.length === 11 && d.startsWith('216') ? d.slice(3) : d;
  return local.length === 8 ? `${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5)}` : phone;
}

const name = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
const phone = process.env.NEXT_PUBLIC_SHOP_PHONE || '56 456 124'; // Hamdi
const whatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || toInternational(phone);

const mapsQuery = process.env.NEXT_PUBLIC_SHOP_MAPS_QUERY || 'Route Hizamia, El Alia, Bizerte, Tunisie';

export const SHOP = {
  name,
  tagline: 'Pièces détachées automobiles',
  phone: formatLocalPhone(phone),
  /** lien tel: international */
  phoneHref: `tel:+${toInternational(phone)}`,
  /** numero WhatsApp (format international, sans "+") */
  whatsapp,
  contactPerson: 'Hamdi',
  address: {
    street: 'Rte Hizamia',
    city: 'El Alia',
    region: 'Bizerte',
    country: 'Tunisie',
    /** adresse sur une ligne */
    oneLine: 'Rte Hizamia, El Alia, Bizerte',
  },
  /** horaires d'ouverture, affiches seulement s'ils sont renseignes (NEXT_PUBLIC_SHOP_HOURS, ex. "Lun - Sam : 8h - 18h") */
  hours: process.env.NEXT_PUBLIC_SHOP_HOURS || '',
  mapsEmbedUrl: `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery)}&output=embed`,
  mapsViewUrl: process.env.NEXT_PUBLIC_SHOP_MAPS_URL || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`,
  mapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery)}`,
} as const;

/** Livraison : frais fixes, gratuite a partir d'un montant d'achat (demande du magasin : 8 DT, gratuite des 300 DT). */
export const DELIVERY = {
  fee: Number(process.env.NEXT_PUBLIC_DELIVERY_FEE ?? 8),
  freeFrom: Number(process.env.NEXT_PUBLIC_DELIVERY_FREE_FROM ?? 300),
} as const;

/** Frais de livraison pour un sous-total d'articles (TTC) : 0 des `freeFrom` DT d'achat. */
export function deliveryFee(subtotal: number): number {
  return subtotal >= DELIVERY.freeFrom ? 0 : DELIVERY.fee;
}

/** Adresse publique du site (referencement : plan du site, liens canoniques). Vercel la fournit au moment du build ; NEXT_PUBLIC_SITE_URL a priorite. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
