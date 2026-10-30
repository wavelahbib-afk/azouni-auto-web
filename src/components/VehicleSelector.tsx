'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, MessageCircle, ScanLine, Search } from 'lucide-react';
import type { VehicleMake } from '@/lib/vehicles';
import { makeLabel, modelLabel, vehicleParam } from '@/lib/vehicles';
import { decodeVin, saveVin, vinPrefix, type VinInfo } from '@/lib/vin';
import { fetchVinSuggestion, reportVinModel, type VinSuggestion } from '@/lib/vinClient';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { SHOP } from '@/lib/shop';

/**
 * Selecteur de vehicule : constructeur puis modele -> le catalogue ne montre que les pieces compatibles (donnees de compatibilite synchronisees depuis AZOUNI AUTO).
 * `initialMake` / `initialModel` : vehicule deja choisi (page Catalogue). `onSelect` : utilise par le catalogue pour filtrer sans quitter la page.
 * `variant="bar"` : trois champs sur une ligne, sans cadre (bandeau d'accueil) ; `card` (par defaut) : encart vertical avec titre (colonne de filtres).
 * Sous les champs : saisie du numero de chassis (VIN), lu dans le navigateur -- il propose le constructeur et l'annee, le client choisit le modele (voir lib/vin.ts).
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
  const [vinOpen, setVinOpen] = useState(false);
  const [vinText, setVinText] = useState('');
  const [vin, setVin] = useState<(VinInfo & { known: boolean }) | { error: string } | null>(null);
  // modele appris des clients pour ce debut de VIN (memoire des VIN, voir lib/vinLearning.ts), quand il a ete applique
  const [learned, setLearned] = useState<VinSuggestion | null>(null);
  // le modele affiche vient de la memoire et le client ne l'a pas change : accepter une proposition sans la verifier ne compte pas comme un vote (sinon une erreur se renforcerait toute seule)
  const [modelFromMemory, setModelFromMemory] = useState(false);
  const modelRef = useRef<HTMLSelectElement>(null);
  const models = makes.find((m) => m.make === make)?.models ?? [];
  const bar = variant === 'bar';

  const selectClass =
    'w-full appearance-none border border-slate-300 rounded-md bg-white pl-12 pr-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand disabled:bg-slate-100 disabled:text-slate-400';
  const stepClass = 'absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-sm bg-ink text-white font-display font-bold text-sm inline-flex items-center justify-center';

  function submit() {
    if (!make) return;
    // le client a donne un VIN puis choisi son modele : le site s'en souvient pour reconnaitre ce type de voiture ensuite (8 premiers caracteres seulement)
    if (vin && 'vin' in vin && model && !modelFromMemory) reportVinModel(vinPrefix(vin.vin), make, model);
    if (onSelect) onSelect(make, model);
    else router.push(model ? `/catalogue?vehicule=${encodeURIComponent(vehicleParam(make, model))}` : `/catalogue?constructeur=${encodeURIComponent(make)}`);
  }

  /** Lit le numero de chassis : propose le constructeur (liste du site) et l'annee ; le modele reste a choisir. */
  function identifyVin() {
    const info = decodeVin(vinText);
    if (!info) {
      setVin({ error: 'Un numéro de châssis (VIN) fait 17 caractères : des lettres (sans I, O ni Q) et des chiffres. Vérifiez-le sur la carte grise (case E).' });
      return;
    }
    saveVin(info.vin);
    const found = info.make ? makes.find((m) => m.make === info.make) : undefined;
    setVin({ ...info, known: Boolean(found) });
    setLearned(null);
    setModelFromMemory(false);
    if (found) {
      setMake(found.make);
      setModel('');
      setTimeout(() => modelRef.current?.focus(), 0);
    }
    // modele deja appris pour ce type de voiture : applique tout de suite (le client le verifie, puis lance la recherche)
    void fetchVinSuggestion(vinPrefix(info.vin)).then((s) => {
      const known = s ? makes.find((m) => m.make === s.make)?.models.some((x) => x.model === s.model) : false;
      if (s && known) {
        setMake(s.make);
        setModel(s.model);
        setLearned(s);
        setModelFromMemory(true);
      }
    });
  }

  const vinMessage =
    vin && 'vin' in vin
      ? `Bonjour ${SHOP.name}, voici le numéro de châssis (VIN) de ma voiture : ${vin.vin}.${make ? ` Constructeur : ${makeLabel(make)}${model ? ` ${modelLabel(model)}` : ''}.` : ''} Pouvez-vous me confirmer les pièces compatibles ?`
      : '';

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
            setModelFromMemory(false);
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
        <select ref={modelRef} className={selectClass} value={model} disabled={!make} onChange={(e) => {
            setModel(e.target.value);
            setModelFromMemory(false);
          }}>
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

  const vinSection = (
    <div className={bar ? 'mt-3' : 'mt-4 pt-4 border-t border-slate-200'}>
      {!vinOpen ? (
        <button type="button" onClick={() => setVinOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
          <ScanLine size={15} aria-hidden="true" />
          J&apos;ai mon numéro de châssis (VIN)
        </button>
      ) : (
        <div>
          <label htmlFor={`vin-${variant}`} className="block text-xs font-semibold text-slate-600 mb-1.5">
            Numéro de châssis (VIN), 17 caractères
          </label>
          <div className="flex gap-2">
            <input
              id={`vin-${variant}`}
              className="min-w-0 flex-1 border border-slate-300 rounded-md bg-white px-3 py-2.5 text-sm font-mono uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
              placeholder="Ex. VF1XXXXXXXXXXXXXX"
              maxLength={24}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={vinText}
              onChange={(e) => setVinText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  identifyVin();
                }
              }}
            />
            <button type="button" onClick={identifyVin} className="shrink-0 rounded-md bg-ink px-4 py-2.5 font-display font-bold text-sm tracking-[0.1em] uppercase text-white hover:bg-brand transition-colors">
              Identifier
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            Seuls les 8 premiers caractères (le type de voiture, pas la vôtre) servent à reconnaître le modèle ; le numéro complet reste dans votre navigateur et n&apos;est envoyé que si vous choisissez
            WhatsApp.
          </p>

          {vin && 'error' in vin && (
            <p role="alert" className="mt-2 text-xs text-red-700 bg-red-50 rounded px-2.5 py-2">
              {vin.error}
            </p>
          )}
          {vin && 'vin' in vin && (
            <div className="mt-2 rounded bg-brand-soft px-3 py-2.5 text-xs text-slate-700 space-y-1.5" aria-live="polite">
              {learned ? (
                <p>
                  <strong className="text-ink">
                    Modèle probable : {makeLabel(learned.make)} {modelLabel(learned.model)}
                  </strong>{' '}
                  (déjà vu sur {learned.votes} voiture{learned.votes > 1 ? 's' : ''} du même type). Vérifiez-le sur votre carte grise : si c&apos;est bien le vôtre, cliquez sur la recherche ; sinon choisissez le bon modèle.
                </p>
              ) : vin.known && vin.make ? (
                <p>
                  <strong className="text-ink">Constructeur reconnu : {makeLabel(vin.make)}</strong>
                  {vin.year ? ` · année indicative ${vin.year}` : ''}. <strong>Choisissez maintenant le modèle</strong> dans la liste.
                </p>
              ) : (
                <p>
                  Le constructeur n&apos;est pas reconnu automatiquement : choisissez-le dans la liste, ou envoyez ce numéro à {SHOP.contactPerson} pour qu&apos;il vérifie.
                </p>
              )}
              <p className="text-slate-500">
                Le constructeur et l&apos;année sont lus dans le numéro à titre indicatif ; le modèle se choisit dans la liste. Quand vous le choisissez, le site s&apos;en souvient pour proposer ce modèle aux clients
                suivants.
              </p>
              <a
                href={buildWhatsAppLink(SHOP.whatsapp, vinMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-semibold text-green-700 hover:text-green-800"
              >
                <MessageCircle size={14} />
                Envoyer mon VIN à {SHOP.contactPerson} sur WhatsApp
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (bar) {
    return (
      <div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">{fields}</div>
        {vinSection}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-t-[3px] border-t-brand shadow-sm ${compact ? 'p-4' : 'p-5 sm:p-6'}`}>
      <h2 className="flex items-center gap-2 text-base font-bold text-ink tracking-[0.1em] mb-4">
        <Car size={17} className="text-brand" aria-hidden="true" />
        Ma voiture
      </h2>
      <div className="space-y-3">{fields}</div>
      <p className="mt-3 text-xs text-slate-500">Seules les pièces qui citent votre voiture s&apos;affichent.</p>
      {vinSection}
    </div>
  );
}
