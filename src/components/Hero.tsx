import Link from 'next/link';
import { ArrowRight, Car, Phone } from 'lucide-react';
import { DELIVERY, SHOP } from '@/lib/shop';
import { formatDt, formatInt } from '@/lib/format';
import type { VehicleMake } from '@/lib/vehicles';
import { Eyebrow } from './Eyebrow';
import { Gear } from './Gear';
import { VehicleSelector } from './VehicleSelector';

/** Recherches les plus courantes d'un magasin de pieces : un clic mene au catalogue deja filtre. */
const QUICK = [
  { label: 'Plaquettes de frein', q: 'plaquette' },
  { label: 'Filtre à huile', q: 'filtre huile' },
  { label: 'Amortisseurs', q: 'amortisseur' },
  { label: 'Courroie', q: 'courroie' },
  { label: 'Bougies', q: 'bougie' },
  { label: 'Huile moteur', q: 'huile moteur' },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="chamfer bg-white/[0.04] border-l-2 border-volt px-5 py-4">
      <p className="font-display font-extrabold text-4xl sm:text-5xl leading-none text-white">{value}</p>
      <p className="mt-2 text-[13px] text-slate-400 leading-snug">{label}</p>
    </div>
  );
}

/** Bandeau d'accueil sombre : accroche, "console" de recherche (voiture ou pieces courantes) et trois chiffres du magasin. */
export function Hero({ articleCount, makes }: { articleCount: number; makes: VehicleMake[] }) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="absolute inset-0 blueprint" aria-hidden="true" />
      <div className="absolute -left-40 top-1/3 w-[40rem] h-[40rem] rounded-full bg-brand/25 blur-[120px]" aria-hidden="true" />
      <Gear className="absolute -right-32 -top-40 w-[34rem] h-[34rem] text-white/[0.06] hidden sm:block" teeth={14} />

      <div className="relative max-w-7xl mx-auto px-4 pt-12 sm:pt-16 pb-14 sm:pb-20 grid gap-10 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] items-end">
        <div>
          <Eyebrow onDark>
            {SHOP.address.city} · {SHOP.address.region}
          </Eyebrow>
          <h1 className="mt-4 text-[3.25rem] sm:text-7xl lg:text-[5.6rem] font-extrabold chrome-text leading-[0.92]">
            Votre auto repart.
            <br />
            <span className="text-volt">On a la pièce.</span>
          </h1>
          <p className="mt-5 text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
            {articleCount > 0 ? `${formatInt(articleCount)} références` : 'Des milliers de références'} en rayon à {SHOP.address.city}. Choisissez votre voiture ou tapez une référence :
            on vous montre ce qui s&apos;y monte.
          </p>

          <div className="mt-8 bg-white text-ink rounded-lg border-t-[3px] border-brand p-4 sm:p-5 shadow-2xl">
            <p className="flex items-center gap-2 font-display font-bold text-[15px] tracking-[0.14em] uppercase text-ink mb-3">
              <Car size={17} className="text-brand" aria-hidden="true" />
              {makes.length > 0 ? 'Pour quelle voiture ?' : 'Que cherchez-vous ?'}
            </p>
            {makes.length > 0 && <VehicleSelector makes={makes} variant="bar" />}
            <div className={`flex flex-wrap items-center gap-2 ${makes.length > 0 ? 'mt-4 pt-4 border-t border-slate-200' : ''}`}>
              <span className="text-xs font-semibold text-slate-500 mr-1">Souvent demandé :</span>
              {QUICK.map((c) => (
                <Link
                  key={c.q}
                  href={`/catalogue?q=${encodeURIComponent(c.q)}`}
                  className="rounded-sm bg-slate-100 px-2.5 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-brand hover:text-white transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link href="/catalogue" className="inline-flex items-center gap-2 font-display font-bold tracking-[0.12em] uppercase text-[15px] text-white hover:text-volt transition-colors">
              Parcourir tout le catalogue
              <ArrowRight size={17} />
            </Link>
            <a href={SHOP.phoneHref} className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Phone size={15} className="text-volt" />
              ou appelez {SHOP.contactPerson} : <strong className="font-display tracking-wide text-base text-white">{SHOP.phone}</strong>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-4" aria-label="Le magasin en chiffres">
          <Stat value={articleCount > 0 ? formatInt(articleCount) : '—'} label="références en rayon, prêtes à partir" />
          <Stat value={formatDt(DELIVERY.fee)} label={`la livraison, offerte dès ${DELIVERY.freeFrom} DT d'achat`} />
          <Stat value="0 DT" label="d'avance : on règle à la réception" />
        </div>
      </div>
    </section>
  );
}
