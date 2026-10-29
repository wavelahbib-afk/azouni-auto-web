import type { VehicleIndexRow } from './types';

/**
 * Constructeurs et modeles du selecteur de vehicule. La base du site (table vehicules_catalogue) est deja NETTOYEE par l'application a la synchro (noms de constructeurs
 * canoniques, modeles sans code de chassis ni type de carrosserie) : ici on ne fait que regrouper et mettre en forme pour l'affichage.
 */

/** Cle de comparaison d'un constructeur : minuscules, sans accents ni ponctuation ("CITROËN" -> "citroen", "MERCEDES-BENZ" -> "mercedesbenz"). */
export function makeKey(make: string): string {
  return make
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

const LABELS: Record<string, string> = {
  volkswagen: 'Volkswagen',
  citroen: 'Citroën',
  mercedesbenz: 'Mercedes-Benz',
  alfaromeo: 'Alfa Romeo',
  landrover: 'Land Rover',
  ds: 'DS',
  bmw: 'BMW',
  mg: 'MG',
  seat: 'Seat',
  skoda: 'Škoda',
  ssangyong: 'SsangYong',
  greatwall: 'Great Wall',
  daihatsu: 'Daihatsu',
  gaz: 'GAZ',
  jac: 'JAC',
  byd: 'BYD',
  kia: 'Kia',
};

/** Nom d'un constructeur tel qu'on l'ecrit ("VOLKSWAGEN" -> "Volkswagen", "CITROEN" -> "Citroën"). */
export function makeLabel(make: string): string {
  const key = makeKey(make);
  if (LABELS[key]) return LABELS[key];
  return make
    .toLowerCase()
    .split(/(\s+|-)/)
    .map((w) => (/^[\s-]+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join('');
}

/** Nom d'un modele : "GOLF V" -> "Golf V" (chiffres romains et sigles conserves en majuscules). */
export function modelLabel(model: string): string {
  return model
    .split(' ')
    .map((w) => {
      if (/\d/.test(w) || /^[IVX]{1,4}$/.test(w) || (w.length <= 3 && w === w.toUpperCase() && !/^(LE|LA|DE|DU)$/.test(w))) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
}

export interface VehicleMake {
  /** valeur stockee dans la base (utilisee pour filtrer) */
  make: string;
  key: string;
  label: string;
  /** nombre d'articles de ce constructeur (somme approximative sur ses modeles) */
  nb: number;
  models: { model: string; label: string; nb: number }[];
}

/** Regroupe les lignes (constructeur, modele) par constructeur ; modeles par nombre d'articles decroissant. */
export function groupVehicles(rows: VehicleIndexRow[]): VehicleMake[] {
  const map = new Map<string, VehicleMake>();
  for (const r of rows) {
    if (!r.make || !r.model) continue;
    let m = map.get(r.make);
    if (!m) {
      m = { make: r.make, key: makeKey(r.make), label: makeLabel(r.make), nb: 0, models: [] };
      map.set(r.make, m);
    }
    m.models.push({ model: r.model, label: modelLabel(r.model), nb: r.nb });
    m.nb += r.nb;
  }
  const makes = Array.from(map.values());
  for (const m of makes) m.models.sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true }));
  return makes.sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

/** Valeur du filtre de vehicule dans l'adresse du catalogue : "KIA|PICANTO". */
export function vehicleParam(make: string, model: string): string {
  return `${make}|${model}`;
}

export function parseVehicleParam(value: string | null | undefined): { make: string; model: string } | null {
  if (!value) return null;
  const i = value.indexOf('|');
  if (i <= 0 || i === value.length - 1) return null;
  return { make: value.slice(0, i), model: value.slice(i + 1) };
}
