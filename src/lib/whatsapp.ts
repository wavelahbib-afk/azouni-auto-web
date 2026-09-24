import type { CartLine } from './types';
import { formatMoney } from './format';

// wa.me tronque/echoue au-dela de cette longueur -- meme limite que
// azouni-auto/src/services/whatsapp.ts (buildWhatsAppLink), pour rester
// coherent si un jour ce code est refusionne.
const MAX_MESSAGE_LENGTH = 3500;

function digitsOnly(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppLink(phone: string, message: string): string {
  return `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(phone: string, message: string): void {
  const safe = message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH)}...` : message;
  window.open(buildWhatsAppLink(phone, safe), '_blank');
}

/**
 * Meme convention de message que azouni-auto/src/services/whatsapp.ts :
 * titre en gras, une ligne par article, total en gras -- juste une base de
 * discussion (le stock/prix reel est confirme par le magasin, pas une
 * commande engageante).
 */
export function buildOrderMessage(shopName: string, lines: CartLine[]): string {
  const total = lines.reduce((sum, l) => sum + l.prix_vente_ttc * l.qty, 0);
  const body = [
    `*Nouvelle commande - ${shopName}*`,
    ...lines.map((l) => `- ${l.designation}${l.marque ? ` (${l.marque})` : ''} x${l.qty} - ${formatMoney(l.prix_vente_ttc * l.qty)}`),
    '',
    `*Total estimatif : ${formatMoney(total)}*`,
    '',
    'Merci de confirmer la disponibilite et le mode de retrait/livraison.',
  ];
  return body.join('\n');
}
