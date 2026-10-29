import type { CartLine } from './types';
import { formatMoney } from './format';
import type { OrderForm, OrderTotals } from './orders';

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
 * Message de commande (meme convention que azouni-auto/src/services/whatsapp.ts : titre en gras, une ligne par article, total en gras) : reference de la
 * commande, coordonnees du client, mode de retrait/livraison et frais, puis le detail. C'est une base de discussion : le stock et le prix sont confirmes par le magasin.
 */
export function buildCheckoutMessage(shopName: string, ref: string, form: OrderForm, lines: CartLine[], totals: OrderTotals): string {
  const body = [
    `*Nouvelle commande ${ref} - ${shopName}*`,
    '',
    `*Client :* ${form.name.trim()} - ${form.phone.trim()}`,
    form.mode === 'livraison' ? `*Livraison :* ${form.address.trim()}, ${form.city.trim()}` : '*Retrait au magasin*',
    '',
    ...lines.map((l) => `- ${l.designation}${l.marque ? ` (${l.marque})` : ''}${l.reference ? ` - Réf. ${l.reference}` : ''} x${l.qty} - ${formatMoney(l.prix_vente_ttc * l.qty)}`),
    '',
    `Sous-total : ${formatMoney(totals.subtotal)}`,
    form.mode === 'livraison' ? `Livraison : ${totals.delivery > 0 ? formatMoney(totals.delivery) : 'gratuite'}` : '',
    `*Total estimatif : ${formatMoney(totals.total)}*`,
    form.note.trim() ? `\nNote : ${form.note.trim()}` : '',
    '',
    'Merci de confirmer la disponibilité et le délai.',
  ];
  return body.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

/** Message pour demander le prix ou une precision sur UN article (articles sans prix, bouton "Poser une question"). */
export function buildArticleQuestionMessage(shopName: string, title: string, reference: string, marque: string | null): string {
  return [`Bonjour ${shopName},`, `Je souhaite connaitre le prix et la disponibilite de : ${title}${marque ? ` (${marque})` : ''} - Réf. ${reference}.`, 'Merci !'].join('\n');
}
