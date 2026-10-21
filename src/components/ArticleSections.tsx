import type { ComponentType, ReactNode } from 'react';
import { Car, ClipboardList, Tags } from 'lucide-react';
import { titleCase } from '@/lib/display';

/**
 * Sections de la fiche article (composants serveur : pas de JavaScript cote navigateur ; les listes longues se deplient avec <details>).
 * Meme style de carte pour toutes les sections : titre avec icone, contenu en dessous.
 */
function Section({ icon: Icon, title, count, children }: { icon: ComponentType<{ size?: number }>; title: string; count?: number; children: ReactNode }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-base font-extrabold text-slate-900 mb-4">
        <span className="w-8 h-8 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
          <Icon size={16} />
        </span>
        {title}
        {count !== undefined && <span className="text-xs font-semibold text-slate-400">({count})</span>}
      </h2>
      {children}
    </section>
  );
}

export interface SpecRow {
  label: string;
  value: ReactNode;
  mono?: boolean;
}

/** Caracteristiques de l'article : liste libelle / valeur (les lignes sans valeur sont deja retirees par l'appelant). */
export function SpecsSection({ rows }: { rows: SpecRow[] }) {
  return (
    <Section icon={ClipboardList} title="Caractéristiques">
      <dl className="text-sm">
        {rows.map((r) => (
          <div key={r.label} className="grid sm:grid-cols-[12rem_1fr] gap-x-6 gap-y-0.5 py-2.5 border-b border-slate-100 last:border-0">
            <dt className="font-medium text-slate-500">{r.label}</dt>
            <dd className={`text-slate-800 ${r.mono ? 'font-mono' : ''}`}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

export interface VehicleGroup {
  make: string;
  models: string[];
}

const MODEL_CHIPS_SHOWN = 10;
const MAKES_SHOWN = 6;

function ModelChips({ models }: { models: string[] }) {
  const first = models.slice(0, MODEL_CHIPS_SHOWN);
  const rest = models.slice(MODEL_CHIPS_SHOWN);
  const chip = (m: string) => (
    <li key={m} className="text-xs text-slate-600 bg-slate-100 rounded-md px-2 py-1">
      {titleCase(m)}
    </li>
  );
  return (
    <>
      <ul className="flex flex-wrap gap-1.5">{first.map(chip)}</ul>
      {rest.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-brand hover:underline">Voir les {rest.length} autres modèles</summary>
          <ul className="flex flex-wrap gap-1.5 mt-2">{rest.map(chip)}</ul>
        </details>
      )}
    </>
  );
}

/** Vehicules compatibles : ceux cites dans la designation du magasin, puis la liste detaillee par marque (fiche constructeur). */
export function VehiclesSection({ cited, groups }: { cited: string | null; groups: VehicleGroup[] }) {
  const shown = groups.slice(0, MAKES_SHOWN);
  const rest = groups.slice(MAKES_SHOWN);
  const renderGroup = (g: VehicleGroup) => (
    <div key={g.make}>
      <h3 className="text-sm font-bold text-slate-800 mb-2">{titleCase(g.make)}</h3>
      <ModelChips models={g.models} />
    </div>
  );
  return (
    <Section icon={Car} title="Véhicules compatibles">
      {cited && (
        <p className="text-sm text-slate-600 mb-4">
          <span className="font-semibold text-slate-800">Indiqué par le magasin : </span>
          {cited}
        </p>
      )}
      {groups.length > 0 && (
        <>
          <div className="grid md:grid-cols-2 gap-x-10 gap-y-5">{shown.map(renderGroup)}</div>
          {rest.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-sm font-semibold text-brand hover:underline">
                Voir {rest.length} autre{rest.length > 1 ? 's' : ''} marque{rest.length > 1 ? 's' : ''}
              </summary>
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-5 mt-4">{rest.map(renderGroup)}</div>
            </details>
          )}
          <p className="text-xs text-slate-400 mt-5">Liste donnée à titre indicatif : vérifiez la compatibilité avec votre véhicule (référence d&apos;origine ou carte grise) avant de commander.</p>
        </>
      )}
    </Section>
  );
}

const REFS_SHOWN = 30;

/** References d'origine (constructeur) et equivalentes : permettent de retrouver la piece avec la reference d'origine du vehicule. */
export function OriginRefsSection({ refs }: { refs: string[] }) {
  const first = refs.slice(0, REFS_SHOWN);
  const rest = refs.slice(REFS_SHOWN);
  const chip = (r: string) => (
    <li key={r} className="text-xs font-mono text-slate-600 bg-slate-100 rounded-md px-2 py-1">
      {r}
    </li>
  );
  return (
    <Section icon={Tags} title="Références d'origine et équivalentes" count={refs.length}>
      <p className="text-sm text-slate-500 mb-4">Numéros constructeur (OE) et références équivalentes : tapez-en un dans la recherche du catalogue pour retrouver cette pièce.</p>
      <ul className="flex flex-wrap gap-1.5">{first.map(chip)}</ul>
      {rest.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-brand hover:underline">Voir les {rest.length} autres références</summary>
          <ul className="flex flex-wrap gap-1.5 mt-3">{rest.map(chip)}</ul>
        </details>
      )}
    </Section>
  );
}
