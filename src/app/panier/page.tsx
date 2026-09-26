'use client';

import Link from 'next/link';
import { ShoppingBag, Trash2, MessageCircle } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import { buildOrderMessage, openWhatsApp } from '@/lib/whatsapp';

export default function PanierPage() {
  const { lines, updateQty, removeItem, clear, totalAmount } = useCart();
  const shopName = process.env.NEXT_PUBLIC_SHOP_NAME || 'AZOUNI AUTO';
  const shopWhatsapp = process.env.NEXT_PUBLIC_SHOP_WHATSAPP || '';

  function commander() {
    if (!shopWhatsapp) {
      alert("Numero WhatsApp du magasin non configure (NEXT_PUBLIC_SHOP_WHATSAPP).");
      return;
    }
    openWhatsApp(shopWhatsapp, buildOrderMessage(shopName, lines));
  }

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={40} className="mx-auto text-slate-300 mb-4" />
        <p className="font-semibold text-slate-600 mb-2">Votre panier est vide.</p>
        <Link href="/" className="text-brand font-medium hover:underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-extrabold text-slate-900 mb-5">Votre panier</h1>
      <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        {lines.map((l) => (
          <div key={l.code} className="flex items-center gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{l.designation}</p>
              {l.marque && <p className="text-xs text-slate-500">{l.marque}</p>}
            </div>
            <input
              type="number"
              min={1}
              className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              value={l.qty}
              onChange={(e) => updateQty(l.code, parseInt(e.target.value, 10) || 0)}
            />
            <span className="w-24 text-right text-sm font-bold text-brand">{formatMoney(l.prix_vente_ttc * l.qty)}</span>
            <button className="text-slate-300 hover:text-red-600 transition-colors" onClick={() => removeItem(l.code)} aria-label="Retirer">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-5 mb-6">
        <button className="text-sm text-slate-400 hover:text-slate-600 transition-colors" onClick={clear}>
          Vider le panier
        </button>
        <span className="text-lg font-extrabold text-slate-900">Total : {formatMoney(totalAmount)}</span>
      </div>

      <button
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors shadow-sm"
        onClick={commander}
      >
        <MessageCircle size={18} />
        Commander via WhatsApp
      </button>
      <p className="text-xs text-slate-400 text-center mt-3">
        La commande n&apos;est pas payée en ligne : elle ouvre WhatsApp avec le détail, à confirmer avec le magasin.
      </p>
    </div>
  );
}
