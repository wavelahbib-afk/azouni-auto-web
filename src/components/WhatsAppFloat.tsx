import { MessageCircle } from 'lucide-react';
import { SHOP } from '@/lib/shop';

/** Bouton WhatsApp flottant, visible sur toutes les pages (en bas a droite). */
export function WhatsAppFloat() {
  const message = `Bonjour ${SHOP.name}, j'ai une question sur une pièce.`;
  return (
    <a
      href={`https://wa.me/${SHOP.whatsapp}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Écrire au magasin sur WhatsApp"
      className="chamfer-sm fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 bg-green-600 text-white hover:bg-green-500 transition-colors pl-4 pr-5 py-3 font-display font-bold text-[15px] tracking-[0.1em] uppercase"
    >
      <MessageCircle size={20} />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
