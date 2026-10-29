import Link from 'next/link';
import { ArrowRight, ArrowUpRight, MapPin, MessageCircle, Phone, Clock } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';
import { SHOP } from '@/lib/shop';
import { formatInt } from '@/lib/format';
import type { VehicleMake } from '@/lib/vehicles';
import { CategoryIcon } from './CategoryIcon';
import { CarLogo } from './CarLogo';
import { Eyebrow } from './Eyebrow';
import { Gear } from './Gear';

/** Rangee des constructeurs les plus presents dans le catalogue : un logo = ses pieces. Defile sur mobile. */
export function BrandStrip({ makes }: { makes: VehicleMake[] }) {
  const top = [...makes].sort((a, b) => b.nb - a.nb).slice(0, 14);
  if (top.length < 4) return null;
  return (
    <section aria-label="Pièces par constructeur" className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        <div className="shrink-0 lg:w-44">
          <Eyebrow>Par constructeur</Eyebrow>
          <p className="mt-1 font-display font-bold text-2xl uppercase leading-tight text-ink">Ma voiture, c&apos;est une…</p>
        </div>
        <ul className="rail grid grid-flow-col auto-cols-[7.25rem] gap-px bg-slate-200 border border-slate-200 overflow-x-auto flex-1 min-w-0">
          {top.map((m) => (
            <li key={m.make} className="snap-start bg-white">
              <Link
                href={`/catalogue?constructeur=${encodeURIComponent(m.make)}`}
                className="group h-full flex flex-col items-center justify-center gap-2 px-2 py-4 text-slate-600 hover:bg-ink hover:text-white transition-colors"
              >
                <CarLogo make={m.make} size={38} mono className="text-slate-500 group-hover:text-white transition-colors" />
                <span className="font-display font-semibold text-sm tracking-[0.08em] uppercase">{m.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** "Les rayons" : les categories du magasin, la premiere en grand (mise en page asymetrique), avec le nombre de pieces. */
export function CategoryTiles({ counts }: { counts: Record<string, number> }) {
  const pieces = (n: number) => `${formatInt(n)} pièce${n > 1 ? 's' : ''}`;
  return (
    <section aria-labelledby="categories-title" className="max-w-7xl mx-auto px-4 py-14">
      <div className="mb-7 max-w-2xl">
        <Eyebrow>Les rayons</Eyebrow>
        <h2 id="categories-title" className="mt-2 text-4xl sm:text-5xl font-extrabold text-ink leading-[0.95]">
          Un rayon pour chaque panne.
        </h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 lg:grid-rows-3 gap-3">
        {CATEGORIES.map((c, i) => {
          const big = i === 0;
          const n = counts[c.slug] ?? 0;
          const num = String(i + 1).padStart(2, '0');
          if (big) {
            return (
              <Link
                key={c.slug}
                href={`/catalogue?categorie=${c.slug}`}
                className="group relative col-span-2 lg:row-span-2 overflow-hidden rounded-lg bg-ink text-white p-6 sm:p-8 min-h-[16rem] flex flex-col justify-between"
              >
                <div className="absolute inset-0 blueprint" aria-hidden="true" />
                <Gear className="absolute -right-16 -bottom-20 w-72 h-72 text-white/[0.07] group-hover:text-volt/25 transition-colors duration-500" teeth={10} />
                <div className="relative flex items-start justify-between">
                  <span className="font-display font-bold text-sm tracking-[0.2em] uppercase text-volt">Rayon {num}</span>
                  <CategoryIcon icon={c.icon} size={44} className="text-volt" />
                </div>
                <div className="relative">
                  <h3 className="font-display font-extrabold uppercase text-5xl sm:text-6xl leading-[0.95] chrome-text">{c.label}</h3>
                  <p className="mt-3 text-slate-300 max-w-sm text-sm leading-relaxed">{c.blurb}</p>
                  <p className="mt-4 inline-flex items-center gap-3 font-display font-bold tracking-[0.12em] uppercase text-[15px] text-white">
                    {pieces(n)}
                    <span className="inline-flex items-center gap-1 text-volt group-hover:gap-2.5 transition-all">
                      Entrer <ArrowRight size={16} />
                    </span>
                  </p>
                </div>
              </Link>
            );
          }
          return (
            <Link
              key={c.slug}
              href={`/catalogue?categorie=${c.slug}`}
              className="group relative overflow-hidden rounded-lg bg-white border border-slate-200 p-4 sm:p-5 min-h-[9.5rem] flex flex-col justify-between hover:border-brand hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="absolute left-0 top-0 bottom-0 w-1 bg-brand scale-y-0 origin-top group-hover:scale-y-100 transition-transform" aria-hidden="true" />
              <div className="flex items-start justify-between">
                <span className="font-display font-extrabold text-4xl leading-none text-slate-200 group-hover:text-brand transition-colors">{num}</span>
                <CategoryIcon icon={c.icon} size={26} className="text-slate-400 group-hover:text-brand transition-colors" />
              </div>
              <div>
                <h3 className="font-display font-bold uppercase text-xl leading-tight text-ink">{c.label}</h3>
                <p className="mt-1 text-xs text-slate-500">{pieces(n)}</p>
              </div>
            </Link>
          );
        })}
        <Link href="/catalogue" className="group rounded-lg bg-brand text-white p-4 sm:p-5 min-h-[9.5rem] flex flex-col justify-between hover:bg-brand-light transition-colors">
          <ArrowUpRight size={30} className="self-end group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          <span className="font-display font-extrabold uppercase text-2xl leading-tight">
            Tout le
            <br />
            catalogue
          </span>
        </Link>
      </div>
    </section>
  );
}

/** Bandeau d'aide : un doute sur une reference ? Le telephone en grand. */
export function HelpCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="chamfer relative overflow-hidden bg-ink text-white px-6 sm:px-12 py-10 sm:py-12 grid gap-8 md:grid-cols-[1fr_auto] items-center">
        <div className="absolute inset-0 blueprint" aria-hidden="true" />
        <div className="absolute -left-24 -bottom-32 w-96 h-96 rounded-full bg-brand/30 blur-[100px]" aria-hidden="true" />
        <div className="relative">
          <Eyebrow onDark>Un doute ?</Eyebrow>
          <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold chrome-text leading-[0.95]">
            Carte grise en main,
            <br />
            on trouve la bonne pièce.
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl">
            Envoyez-nous une photo de la pièce ou de la carte grise : {SHOP.contactPerson} vérifie la compatibilité avant que vous ne commandiez.
          </p>
        </div>
        <div className="relative flex flex-col gap-3 md:items-end">
          <a href={SHOP.phoneHref} className="group inline-flex items-center gap-3">
            <span className="w-12 h-12 rounded bg-brand inline-flex items-center justify-center group-hover:bg-brand-light transition-colors">
              <Phone size={22} />
            </span>
            <span className="leading-none">
              <span className="block font-display font-semibold text-xs tracking-[0.18em] uppercase text-slate-400">{SHOP.contactPerson}, au comptoir</span>
              <span className="block font-display font-extrabold text-4xl sm:text-5xl tracking-wide mt-1">{SHOP.phone}</span>
            </span>
          </a>
          <a
            href={`https://wa.me/${SHOP.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded bg-green-600 text-white font-semibold px-6 py-3 hover:bg-green-500 transition-colors"
          >
            <MessageCircle size={18} />
            Envoyer une photo sur WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

/** Section boutique : adresse, horaires s'ils sont connus, carte et itineraire. */
export function StoreSection() {
  return (
    <section aria-labelledby="boutique-title" className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-stretch">
        <div className="relative overflow-hidden rounded-lg bg-white border border-slate-200 p-7 sm:p-9 flex flex-col">
          <Gear className="absolute -right-12 -top-12 w-48 h-48 text-slate-200/80" />
          <Eyebrow className="relative">Passez nous voir</Eyebrow>
          <h2 id="boutique-title" className="relative mt-2 text-4xl sm:text-5xl font-extrabold text-ink leading-[0.95]">
            Au comptoir, pièce en main.
          </h2>
          <ul className="relative mt-6 space-y-4 text-sm text-slate-600">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
              <span>
                <span className="font-semibold text-ink">{SHOP.name}</span>
                <br />
                {SHOP.address.street}, {SHOP.address.city}
                <br />
                {SHOP.address.region}, {SHOP.address.country}
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="shrink-0 text-brand" aria-hidden="true" />
              <a href={SHOP.phoneHref} className="font-display font-bold text-xl tracking-wide text-ink hover:text-brand transition-colors">
                {SHOP.phone} <span className="font-sans font-normal text-sm text-slate-500">({SHOP.contactPerson})</span>
              </a>
            </li>
            {SHOP.hours && (
              <li className="flex items-start gap-3">
                <Clock size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                <span>{SHOP.hours}</span>
              </li>
            )}
          </ul>
          <div className="relative mt-auto pt-7 flex flex-wrap gap-3">
            <a
              href={SHOP.mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded bg-brand text-white font-display font-bold tracking-[0.1em] uppercase text-[15px] px-6 py-3 hover:bg-brand-light transition-colors"
            >
              <MapPin size={16} />
              Itinéraire
            </a>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded border border-slate-300 text-slate-700 font-display font-bold tracking-[0.1em] uppercase text-[15px] px-6 py-3 hover:border-brand hover:text-brand transition-colors"
            >
              Nous contacter
            </Link>
          </div>
        </div>
        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100 min-h-[300px]">
          <iframe
            title={`Plan d'accès à ${SHOP.name}`}
            src={SHOP.mapsEmbedUrl}
            className="w-full h-full min-h-[300px] border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
