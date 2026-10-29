import type { Metadata } from "next";
import Link from "next/link";
import { Banknote, MapPin, MessageCircle, PackageCheck, Store, Truck } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { formatDt } from "@/lib/format";
import { DELIVERY, SHOP } from "@/lib/shop";

import { Eyebrow } from "@/components/Eyebrow";
export const metadata: Metadata = {
  title: "Livraison et paiement",
  description: `Livraison possible pour ${DELIVERY.fee} DT, gratuite dès ${DELIVERY.freeFrom} DT d'achat. Retrait gratuit au magasin à ${SHOP.address.city}, ${SHOP.address.region}. Paiement à la réception.`,
  alternates: { canonical: "/livraison-paiement" },
};

const steps = [
  { icon: PackageCheck, title: "1. Choisissez vos pièces", text: "Parcourez le catalogue, par référence ou par véhicule, et ajoutez-les au panier." },
  { icon: MessageCircle, title: "2. Envoyez votre commande", text: `Indiquez vos coordonnées : votre commande part au magasin et s'ouvre dans WhatsApp. ${SHOP.contactPerson} confirme la disponibilité et le prix.` },
  { icon: Truck, title: "3. Recevez ou retirez", text: "Nous vous livrons, ou vous passez la prendre au magasin. Vous réglez à la réception." },
];

export default function LivraisonPaiementPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Accueil", href: "/" }, { label: "Livraison et paiement" }]} className="mb-4" />
      <Eyebrow className="mb-1.5">Commander en confiance</Eyebrow>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Livraison et paiement</h1>
      <p className="mt-3 text-slate-500 max-w-2xl">Pas de paiement en ligne : vous réglez vos pièces à la réception, en magasin ou à la livraison.</p>

      <div className="mt-8 grid sm:grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-2xl p-6" aria-labelledby="livraison-title">
          <Truck size={28} className="text-brand mb-3" aria-hidden="true" />
          <h2 id="livraison-title" className="text-lg font-extrabold text-slate-900">Livraison</h2>
          <p className="mt-2 text-3xl font-extrabold text-brand">{formatDt(DELIVERY.fee)}</p>
          <p className="text-sm text-slate-500 mt-1">
            <strong className="text-green-700">Gratuite</strong> dès {DELIVERY.freeFrom} DT d&apos;achat (pièces, TTC).
          </p>
          <p className="mt-3 text-sm text-slate-500">Indiquez votre ville et votre adresse en validant le panier : le magasin vous rappelle pour confirmer le délai.</p>
        </section>

        <section className="bg-white border border-slate-200 rounded-2xl p-6" aria-labelledby="retrait-title">
          <Store size={28} className="text-brand mb-3" aria-hidden="true" />
          <h2 id="retrait-title" className="text-lg font-extrabold text-slate-900">Retrait au magasin</h2>
          <p className="mt-2 text-3xl font-extrabold text-brand">Gratuit</p>
          <p className="text-sm text-slate-500 mt-1">
            {SHOP.address.street}, {SHOP.address.city} ({SHOP.address.region})
          </p>
          {SHOP.hours && <p className="mt-3 text-sm text-slate-500">{SHOP.hours}</p>}
          <a href={SHOP.mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            <MapPin size={14} />
            Itinéraire
          </a>
        </section>
      </div>

      <section className="mt-4 bg-white border border-slate-200 rounded-2xl p-6" aria-labelledby="paiement-title">
        <Banknote size={28} className="text-brand mb-3" aria-hidden="true" />
        <h2 id="paiement-title" className="text-lg font-extrabold text-slate-900">Paiement</h2>
        <p className="mt-2 text-sm text-slate-600">
          Le règlement se fait <strong>à la réception</strong> : au magasin si vous venez retirer vos pièces, ou au livreur si vous êtes livré. Les prix affichés sont en dinars tunisiens,
          taxes comprises (TTC). Le magasin confirme le prix et la disponibilité avant de préparer votre commande.
        </p>
      </section>

      <h2 className="mt-12 text-2xl font-extrabold text-slate-900 tracking-tight">Comment ça marche ?</h2>
      <ol className="mt-5 grid sm:grid-cols-3 gap-4">
        {steps.map(({ icon: Icon, title, text }) => (
          <li key={title} className="bg-white border border-slate-200 rounded-2xl p-5">
            <Icon size={26} strokeWidth={1.5} className="text-brand mb-3" aria-hidden="true" />
            <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">{text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-2xl bg-brand text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold">Une question avant de commander ?</h2>
          <p className="mt-1 text-sm text-white/80">
            {SHOP.contactPerson} vous répond : {SHOP.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/catalogue" className="inline-flex items-center rounded bg-amber-400 text-slate-900 font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-amber-300 transition-colors">
            Voir le catalogue
          </Link>
          <Link href="/contact" className="inline-flex items-center rounded border border-white/40 font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-white/10 transition-colors">
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  );
}
