'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, MessageCircle, Phone, AlertTriangle } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { LAST_ORDER_KEY, type LastOrder } from '@/lib/orders';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { SHOP } from '@/lib/shop';

const subscribe = () => () => {};
function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(LAST_ORDER_KEY);
  } catch {
    return null;
  }
}

/** Page de remerciement : reference de la commande, ce qui se passe ensuite, et un bouton pour renvoyer le message si WhatsApp ne s'est pas ouvert. */
export function ThankYou() {
  const ref = useSearchParams().get('ref') ?? '';
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const order = useMemo<LastOrder | null>(() => {
    if (!stored) return null;
    try {
      const o = JSON.parse(stored) as LastOrder;
      return o.ref === ref ? o : null;
    } catch {
      return null;
    }
  }, [stored, ref]);

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      {order && !order.saved ? (
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" aria-hidden="true" />
      ) : (
        <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" aria-hidden="true" />
      )}
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{order && !order.saved ? 'Il reste une étape' : 'Merci pour votre commande !'}</h1>

      {ref && (
        <p className="mt-4 text-slate-500">
          Référence de commande : <span className="font-mono font-extrabold text-slate-900 text-lg tracking-wider">{ref}</span>
        </p>
      )}
      {order && <p className="mt-1 text-sm text-slate-400">Total estimatif : {formatMoney(order.total)}</p>}

      <div className="mt-6 text-left bg-white border border-slate-200 rounded-2xl p-5 text-sm text-slate-600 space-y-2.5">
        {order && !order.saved ? (
          <p>
            <strong className="text-slate-800">Votre commande n&apos;a pas pu être enregistrée automatiquement.</strong> Envoyez-la au magasin par WhatsApp avec le bouton ci-dessous : elle part
            avec tout le détail.
          </p>
        ) : (
          <p>
            <strong className="text-slate-800">Le magasin a bien reçu votre commande.</strong> {SHOP.contactPerson} vérifie la disponibilité et le prix, puis vous rappelle pour
            confirmer le délai {order?.mode === 'livraison' ? 'de livraison' : 'de retrait'}.
          </p>
        )}
        <p>Le règlement se fait à la réception, en magasin ou à la livraison : aucun paiement n&apos;est demandé en ligne.</p>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        {order && (
          <a
            href={buildWhatsAppLink(SHOP.whatsapp, order.message)}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 transition-colors ${
              order.saved ? 'border border-green-600 text-green-700 hover:bg-green-50' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <MessageCircle size={16} />
            {order.saved ? 'Renvoyer le détail sur WhatsApp' : 'Envoyer ma commande sur WhatsApp'}
          </a>
        )}
        <a href={SHOP.phoneHref} className="inline-flex items-center gap-2 rounded border border-slate-300 text-slate-700 font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:border-brand hover:text-brand transition-colors">
          <Phone size={16} />
          {SHOP.contactPerson} : {SHOP.phone}
        </a>
      </div>

      <Link href="/catalogue" className="inline-block mt-8 text-sm font-semibold text-brand hover:underline">
        Continuer mes achats
      </Link>
    </div>
  );
}
