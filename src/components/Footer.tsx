import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Phone, MapPin, Clock } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { DELIVERY, SHOP } from '@/lib/shop';
import { formatDt } from '@/lib/format';
import { Gear } from './Gear';

const headingClass = 'font-display font-bold text-[15px] tracking-[0.16em] uppercase text-white mb-4 flex items-center gap-2';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-ink text-slate-300 mt-20 border-t-4 border-brand">
      <div className="absolute inset-0 blueprint opacity-70" aria-hidden="true" />
      <Gear className="absolute -right-24 -bottom-32 w-[28rem] h-[28rem] text-white/[0.05]" />

      <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Image src="/logo.png" alt="" width={48} height={48} className="rounded-md ring-1 ring-white/15" />
            <span className="font-display font-extrabold text-2xl tracking-[0.08em] uppercase chrome-text">{SHOP.name}</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
            Des pièces détachées pour toutes les voitures qui roulent autour de {SHOP.address.region}, au comptoir ou chez vous. Une question ? Une photo de la pièce ou de la carte grise nous suffit.
          </p>
          <a
            href={`https://wa.me/${SHOP.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded bg-green-600 hover:bg-green-500 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
          >
            <MessageCircle size={16} />
            Nous écrire sur WhatsApp
          </a>
        </div>

        <div>
          <h3 className={headingClass}>Les rayons</h3>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link href={`/catalogue?categorie=${c.slug}`} className="hover:text-white hover:translate-x-0.5 inline-block transition-all">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className={headingClass}>Pratique</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/catalogue" className="hover:text-white transition-colors">
                Le catalogue complet
              </Link>
            </li>
            <li>
              <Link href="/livraison-paiement" className="hover:text-white transition-colors">
                Livraison &amp; paiement
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Nous trouver
              </Link>
            </li>
            <li>
              <Link href="/panier" className="hover:text-white transition-colors">
                Mon panier
              </Link>
            </li>
          </ul>
          <p className="mt-5 text-xs leading-relaxed text-slate-400 border-l-2 border-volt pl-3">
            Livraison {formatDt(DELIVERY.fee)}, offerte dès {DELIVERY.freeFrom} DT d&apos;achat. Retrait gratuit au magasin. Paiement à la réception.
          </p>
        </div>

        <div>
          <h3 className={headingClass}>Au comptoir</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-volt" aria-hidden="true" />
              <span>
                {SHOP.address.street}
                <br />
                {SHOP.address.city}, {SHOP.address.region}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="shrink-0 text-volt" aria-hidden="true" />
              <a href={SHOP.phoneHref} className="font-display font-bold text-lg tracking-wide text-white hover:text-volt transition-colors">
                {SHOP.phone} <span className="font-sans font-normal text-sm text-slate-400">({SHOP.contactPerson})</span>
              </a>
            </li>
            {SHOP.hours && (
              <li className="flex items-start gap-2.5">
                <Clock size={16} className="mt-0.5 shrink-0 text-volt" aria-hidden="true" />
                <span>{SHOP.hours}</span>
              </li>
            )}
          </ul>
          <a
            href={SHOP.mapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 font-display font-bold text-sm tracking-[0.12em] uppercase text-volt hover:text-white transition-colors"
          >
            Tracer l&apos;itinéraire →
          </a>
        </div>
      </div>

      <div className="relative border-t border-white/10 py-4 px-4 text-center text-xs text-slate-500">
        © {year} {SHOP.name} · Prix en dinars tunisiens (DT), toutes taxes comprises.
      </div>
    </footer>
  );
}
