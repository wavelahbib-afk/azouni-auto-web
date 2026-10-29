import type { Metadata } from "next";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { SHOP } from "@/lib/shop";

import { Eyebrow } from "@/components/Eyebrow";
export const metadata: Metadata = {
  title: "Contact et accès",
  description: `Contactez ${SHOP.name} : ${SHOP.contactPerson} au ${SHOP.phone}, ${SHOP.address.street}, ${SHOP.address.city}, ${SHOP.address.region}. Appel, WhatsApp ou visite au magasin.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs items={[{ label: "Accueil", href: "/" }, { label: "Contact" }]} className="mb-4" />
      <Eyebrow className="mb-1.5">On vous répond</Eyebrow>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Contact et accès</h1>
      <p className="mt-3 text-slate-500 max-w-2xl">Une référence à vérifier, un prix, un doute sur la compatibilité avec votre véhicule : appelez-nous ou écrivez-nous sur WhatsApp.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-stretch">
        <div className="space-y-4">
          <a href={SHOP.phoneHref} className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand hover:shadow-md transition-all">
            <span className="w-12 h-12 rounded bg-brand-soft text-brand inline-flex items-center justify-center shrink-0">
              <Phone size={22} />
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">Téléphone · {SHOP.contactPerson}</span>
              <span className="block text-xl font-extrabold text-slate-900 group-hover:text-brand transition-colors">{SHOP.phone}</span>
            </span>
          </a>

          <a
            href={`https://wa.me/${SHOP.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 hover:border-green-600 hover:shadow-md transition-all"
          >
            <span className="w-12 h-12 rounded bg-green-50 text-green-700 inline-flex items-center justify-center shrink-0">
              <MessageCircle size={22} />
            </span>
            <span className="leading-tight">
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">WhatsApp</span>
              <span className="block text-xl font-extrabold text-slate-900 group-hover:text-green-700 transition-colors">Écrire à {SHOP.contactPerson}</span>
            </span>
          </a>

          <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5">
            <span className="w-12 h-12 rounded bg-brand-soft text-brand inline-flex items-center justify-center shrink-0">
              <MapPin size={22} />
            </span>
            <div className="leading-snug">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Adresse</p>
              <p className="font-bold text-slate-900">{SHOP.name}</p>
              <p className="text-slate-600">
                {SHOP.address.street}, {SHOP.address.city}
                <br />
                {SHOP.address.region}, {SHOP.address.country}
              </p>
              <a href={SHOP.mapsDirectionsUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand hover:underline">
                Itinéraire
              </a>
            </div>
          </div>

          {SHOP.hours && (
            <div className="flex items-start gap-4 bg-white border border-slate-200 rounded-2xl p-5">
              <span className="w-12 h-12 rounded bg-brand-soft text-brand inline-flex items-center justify-center shrink-0">
                <Clock size={22} />
              </span>
              <div className="leading-snug">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Horaires</p>
                <p className="text-slate-700">{SHOP.hours}</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl overflow-hidden border border-slate-200 bg-slate-100 min-h-[360px]">
          <iframe title={`Plan d'accès à ${SHOP.name}`} src={SHOP.mapsEmbedUrl} className="w-full h-full min-h-[360px] border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
        </div>
      </div>
    </div>
  );
}
