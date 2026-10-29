'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Search } from 'lucide-react';
import type { VehicleMake } from '@/lib/vehicles';
import { vehicleParam } from '@/lib/vehicles';

/**
 * Selecteur de vehicule : constructeur puis modele -> le catalogue ne montre que les pieces compatibles (donnees de compatibilite synchronisees depuis AZOUNI AUTO).
 * `initialMake` / `initialModel` : vehicule deja choisi (page Catalogue). `onSelect` : utilise par le catalogue pour filtrer sans quitter la page.
 * `variant="bar"` : trois champs sur une ligne, sans cadre (bandeau d'accueil) ; `card` (par defaut) : encart vertical avec titre (colonne de filtres).
 */
export function VehicleSelector({
  makes,
  initialMake = '',
  initialModel = '',
  onSelect,
  compact = false,
  variant = 'card',
}: {
  makes: VehicleMake[];
  initialMake?: string;
  initialModel?: string;
  /** Si fourni, appele a la place de la navigation vers /catalogue (make et model vides = filtre retire). */
  onSelect?: (make: string, model: string) => void;
  compact?: boolean;
  variant?: 'card' | 'bar';
}) {
  const router = useRouter();
  const [make, setMake] = useState(initialMake);
  const [model, setModel] = useState(initialModel);
  const models = makes.find((m) => m.make === make)?.models ?? [];
  const bar = variant === 'bar';

  const selectClass =
    'w-full appearance-none border border-slate-300 rounded-md bg-white pl-12 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-slate-100 disabled:text-slate-400';
  const stepClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm bg-ink text-white font-display font-bold text-sm inline-flex items-center justify-center';

  function submit() {
    if (!make) return;
    if (onSelect) onSelect(make, model);
    else router.push(model ? `/catalogue?vehicule=${encodeURIComponent(vehicleParam(make, model))}` : `/catalogue?constructeur=${encodeURIComponent(make)}`);
  }

  const fields = (
    <>
      <label className="relative block">
        <span className="sr-only">Constructeur</span>
        <span className={stepClass}>1</span>
        <select
          className={selectClass}
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel('');
            if (!e.target.value) onSelect?.('', '');
          }}
        >
          <option value="">Marque de la voiture</option>
          {makes.map((m) => (
            <option key={m.make} value={m.make}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <label className="relative block">
        <span className="sr-only">Modèle</span>
        <span className={stepClass}>2</span>
        <select className={selectClass} value={model} disabled={!make} onChange={(e) => setModel(e.target.value)}>
          <option value="">{make ? 'Tous les modèles' : 'Modèle'}</option>
          {models.map((m) => (
            <option key={m.model} value={m.model}>
              {m.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={!make}
        className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-brand hover:bg-brand-light disabled:bg-slate-200 disabled:text-slate-400 text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 transition-colors"
      >
        <Search size={16} />
        {bar ? 'Voir les pièces' : 'Rechercher'}
      </button>
    </>
  );

  if (bar) return <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">{fields}</div>;

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-t-[3px] border-t-brand shadow-sm ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <h2 className="flex items-center gap-2 text-base font-bold text-ink tracking-[0.1em] mb-4">
        <Car size={17} className="text-brand" aria-hidden="true" />
        Ma voiture
      </h2>
      <div className="space-y-3">{fields}</div>
      <p className="mt-3 text-xs text-slate-500">Seules les pièces qui citent votre voiture s&apos;affichent.</p>
    </div>
  );
}
