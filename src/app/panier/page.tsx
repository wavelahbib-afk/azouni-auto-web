'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag, Trash2, MessageCircle, Store, Truck, Loader2 } from 'lucide-react';
import { useCart } from '@/lib/cart';
import { formatDt, formatMoney } from '@/lib/format';
import { DELIVERY, SHOP } from '@/lib/shop';
import { buildCheckoutMessage, openWhatsApp } from '@/lib/whatsapp';
import { EMPTY_FORM, newOrderRef, orderTotals, rememberOrder, saveOrder, validateOrder, type DeliveryMode, type OrderForm } from '@/lib/orders';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { readSavedVin } from '@/lib/vin';

const inputClass =
  'w-full border border-slate-300 rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

export default function PanierPage() {
  const router = useRouter();
  const { lines, updateQty, removeItem, clear } = useCart();
  // le VIN saisi plus tot dans le selecteur de vehicule preremplit la commande (lu dans ce navigateur, au premier affichage)
  const [form, setForm] = useState<OrderForm>(() => ({ ...EMPTY_FORM, vin: readSavedVin() }));
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const totals = orderTotals(lines, form.mode);
  const missingForFree = Math.max(0, DELIVERY.freeFrom - totals.subtotal);

  function set<K extends keyof OrderForm>(key: K, value: OrderForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function commander(e: FormEvent) {
    e.preventDefault();
    if (sending) return;
    const problem = validateOrder(form, lines);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSending(true);

    const ref = newOrderRef();
    const message = buildCheckoutMessage(SHOP.name, ref, form, lines, totals);
    // L'enregistrement part tout de suite (keepalive) ET WhatsApp s'ouvre dans le meme geste du client, sinon le navigateur bloquerait la fenetre : on attend
    // ensuite seulement de savoir si l'enregistrement a abouti.
    const saving = saveOrder(ref, form, lines, totals);
    openWhatsApp(SHOP.whatsapp, message);
    const saved = await saving;

    rememberOrder({ ref, saved, mode: form.mode, total: totals.total, message });
    setSent(true);
    clear();
    router.push(`/commande/merci?ref=${ref}`);
  }

  // panier vide parce que la commande vient de partir : pas de message "panier vide" pendant le passage a la page de remerciement
  if (sent) return <p className="max-w-6xl mx-auto px-4 py-24 text-center text-slate-400 text-sm">Commande envoyée…</p>;

  if (lines.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-24 text-center">
        <ShoppingBag size={40} className="mx-auto text-slate-300 mb-4" />
        <p className="font-semibold text-slate-600 mb-2">Votre panier est vide.</p>
        <Link href="/catalogue" className="text-brand font-medium hover:underline">
          Parcourir le catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: 'Accueil', href: '/' }, { label: 'Panier' }]} className="mb-4" />
      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-6">Votre panier</h1>

      <form onSubmit={commander} className="grid lg:grid-cols-[minmax(0,1fr)_22rem] gap-8 items-start">
        <div className="space-y-6 min-w-0">
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
            {lines.map((l) => (
              <div key={l.code} className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/article/${encodeURIComponent(l.code)}`} className="block text-sm font-semibold text-slate-800 hover:text-brand transition-colors line-clamp-2">
                    {l.designation}
                  </Link>
                  <p className="text-xs text-slate-500 truncate">
                    {l.marque && <span className="font-semibold uppercase tracking-wide">{l.marque}</span>}
                    {l.marque && l.reference && ' · '}
                    {l.reference && <span className="font-mono">Réf. {l.reference}</span>}
                  </p>
                  <p className="text-xs text-slate-400">{formatMoney(l.prix_vente_ttc)} l&apos;unité</p>
                </div>
                <input
                  type="number"
                  min={1}
                  className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                  value={l.qty}
                  onChange={(e) => updateQty(l.code, parseInt(e.target.value, 10) || 0)}
                  aria-label={`Quantité : ${l.designation}`}
                />
                <span className="w-24 text-right text-sm font-bold text-brand">{formatMoney(l.prix_vente_ttc * l.qty)}</span>
                <button type="button" className="text-slate-300 hover:text-red-600 transition-colors" onClick={() => removeItem(l.code)} aria-label={`Retirer : ${l.designation}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <fieldset className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <legend className="sr-only">Mode de réception</legend>
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Comment souhaitez-vous recevoir vos pièces ?</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {(
                [
                  { mode: 'retrait', icon: Store, title: 'Retrait au magasin', desc: `${SHOP.address.street}, ${SHOP.address.city} · gratuit` },
                  {
                    mode: 'livraison',
                    icon: Truck,
                    title: 'Livraison',
                    desc: `${formatDt(DELIVERY.fee)} · gratuite dès ${DELIVERY.freeFrom} DT d'achat`,
                  },
                ] as { mode: DeliveryMode; icon: typeof Store; title: string; desc: string }[]
              ).map(({ mode, icon: Icon, title, desc }) => (
                <label
                  key={mode}
                  className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                    form.mode === mode ? 'border-brand bg-brand-soft' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input type="radio" name="mode" className="sr-only" checked={form.mode === mode} onChange={() => set('mode', mode)} />
                  <Icon size={22} className={form.mode === mode ? 'text-brand' : 'text-slate-400'} aria-hidden="true" />
                  <span className="leading-tight">
                    <span className="block text-sm font-bold text-slate-900">{title}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
            {form.mode === 'livraison' && missingForFree > 0 && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                Plus que <strong>{formatMoney(missingForFree)}</strong> d&apos;achats pour profiter de la livraison gratuite.
              </p>
            )}
            {form.mode === 'livraison' && missingForFree === 0 && <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">Livraison offerte pour cette commande.</p>}
          </fieldset>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
            <h2 className="text-lg font-extrabold text-slate-900 mb-4">Vos coordonnées</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Nom et prénom</span>
                <input className={inputClass} autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Ex. Ahmed Ben Salah" />
              </label>
              <label className="block">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">Téléphone</span>
                <input
                  className={inputClass}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="Ex. 56 456 124"
                />
              </label>
              {form.mode === 'livraison' && (
                <>
                  <label className="block">
                    <span className="block text-xs font-semibold text-slate-600 mb-1.5">Ville</span>
                    <input className={inputClass} autoComplete="address-level2" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ex. Bizerte" />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="block text-xs font-semibold text-slate-600 mb-1.5">Adresse de livraison</span>
                    <input
                      className={inputClass}
                      autoComplete="street-address"
                      value={form.address}
                      onChange={(e) => set('address', e.target.value)}
                      placeholder="Rue, quartier, repère..."
                    />
                  </label>
                </>
              )}
              <label className="block sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Numéro de châssis (VIN) <span className="font-normal text-slate-400">(facultatif, 17 caractères, carte grise case E)</span>
                </span>
                <input
                  className={`${inputClass} font-mono uppercase tracking-wider placeholder:font-sans placeholder:normal-case placeholder:tracking-normal`}
                  value={form.vin}
                  onChange={(e) => set('vin', e.target.value)}
                  maxLength={24}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Permet de vérifier que les pièces vont sur votre voiture"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Remarque <span className="font-normal text-slate-400">(facultatif)</span>
                </span>
                <textarea
                  className={`${inputClass} resize-none`}
                  maxLength={400}
                  rows={2}
                  value={form.note}
                  onChange={(e) => set('note', e.target.value)}
                  placeholder="Marque, modèle et année de votre véhicule, précision sur la pièce..."
                />
              </label>
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-40 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm" aria-label="Récapitulatif">
          <h2 className="text-lg font-extrabold text-slate-900 mb-4">Récapitulatif</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Sous-total</dt>
              <dd className="font-semibold text-slate-800">{formatMoney(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>{form.mode === 'livraison' ? 'Livraison' : 'Retrait au magasin'}</dt>
              <dd className="font-semibold text-slate-800">{form.mode === 'livraison' ? (totals.delivery > 0 ? formatMoney(totals.delivery) : 'Gratuite') : 'Gratuit'}</dd>
            </div>
            <div className="flex justify-between items-baseline pt-3 border-t border-slate-100">
              <dt className="font-bold text-slate-900">Total TTC</dt>
              <dd className="text-2xl font-extrabold text-brand">{formatMoney(totals.total)}</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors shadow-sm"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} />}
            {sending ? 'Envoi en cours…' : 'Envoyer ma commande'}
          </button>
          <p className="text-xs text-slate-400 text-center mt-3 leading-relaxed">
            Aucun paiement en ligne. Votre commande est transmise au magasin et s&apos;ouvre dans WhatsApp : {SHOP.contactPerson} confirme la disponibilité, le prix et le délai, puis vous réglez
            à la réception.
          </p>
          <button type="button" className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600 transition-colors" onClick={clear}>
            Vider le panier
          </button>
        </aside>
      </form>
    </div>
  );
}
