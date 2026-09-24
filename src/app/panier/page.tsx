'use client';

import Link from 'next/link';
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
      <div className="text-center py-20 text-slate-500">
        <p className="font-semibold mb-2">Votre panier est vide.</p>
        <Link href="/" className="text-blue-900 font-medium underline">
          Retour au catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-lg font-bold text-slate-800 mb-4">Votre panier</h1>
      <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl bg-white">
        {lines.map((l) => (
          <div key={l.code} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{l.designation}</p>
              {l.marque && <p className="text-xs text-slate-500">{l.marque}</p>}
            </div>
            <input
              type="number"
              min={1}
              className="w-16 border border-slate-300 rounded-lg px-2 py-1 text-sm text-center"
              value={l.qty}
              onChange={(e) => updateQty(l.code, parseInt(e.target.value, 10) || 0)}
            />
            <span className="w-24 text-right text-sm font-semibold text-blue-900">{formatMoney(l.prix_vente_ttc * l.qty)}</span>
            <button className="text-slate-400 hover:text-red-600 text-sm" onClick={() => removeItem(l.code)} aria-label="Retirer">
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 mb-6">
        <button className="text-sm text-slate-500 underline" onClick={clear}>
          Vider le panier
        </button>
        <span className="text-lg font-bold text-slate-800">Total : {formatMoney(totalAmount)}</span>
      </div>

      <button className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700" onClick={commander}>
        Commander via WhatsApp
      </button>
      <p className="text-xs text-slate-400 text-center mt-2">
        La commande n&apos;est pas payee en ligne : elle ouvre WhatsApp avec le detail, a confirmer avec le magasin.
      </p>
    </div>
  );
}
