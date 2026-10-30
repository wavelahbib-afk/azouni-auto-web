/**
 * Numero de chassis (VIN, 17 caracteres) : lu entierement dans le navigateur, rien n'est envoye a un serveur.
 *
 * Ce qu'un VIN permet de lire SANS base de donnees payante : le constructeur (les 3 premiers caracteres, "WMI") et, pour beaucoup de marques, l'annee-modele (10e caractere).
 * Le MODELE exact et la motorisation, eux, ne se lisent pas sans une base de donnees de constructeur : le client choisit le modele dans la liste, et le magasin peut verifier
 * la compatibilite a partir du VIN complet (bouton "envoyer mon VIN par WhatsApp"). Le constructeur et l'annee sont donc donnes comme des indications a confirmer.
 */

/** Majuscules, sans espace ni tiret ; les erreurs de frappe classiques sont corrigees (un VIN ne contient jamais I, O ni Q : "O" -> 0, "I" -> 1, "Q" -> 0). */
export function normalizeVin(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s\-_.]/g, '')
    .replace(/I/g, '1')
    .replace(/[OQ]/g, '0');
}

/** 17 caracteres, lettres (sans I, O, Q) et chiffres. La cle de controle n'est PAS verifiee : elle n'existe que sur les VIN nord-americains. */
export function isValidVinFormat(vin: string): boolean {
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(vin);
}

/**
 * Debut de VIN (3 premiers caracteres) -> constructeur, ecrit comme dans le selecteur de vehicule du site (voir shared/vehicleClean.ts de l'application).
 * Seuls les codes les plus courants en Tunisie sont listes ; un code absent donne simplement "constructeur non reconnu".
 */
const WMI: Record<string, string> = {
  // Renault / Dacia
  VF1: 'RENAULT', UU1: 'DACIA',
  // PSA
  VF3: 'PEUGEOT', VR3: 'PEUGEOT', VF7: 'CITROEN', VR7: 'CITROEN', VR1: 'DS',
  // Volkswagen, Audi, Seat, Skoda
  WVW: 'VOLKSWAGEN', WV1: 'VOLKSWAGEN', WV2: 'VOLKSWAGEN', WV3: 'VOLKSWAGEN', WVG: 'VOLKSWAGEN', VWV: 'VOLKSWAGEN',
  WAU: 'AUDI', WA1: 'AUDI', TRU: 'AUDI', VSS: 'SEAT', TMB: 'SKODA',
  // Allemands
  WBA: 'BMW', WBS: 'BMW', WBY: 'BMW', WMW: 'MINI', WME: 'SMART', WP0: 'PORSCHE',
  WDB: 'MERCEDES-BENZ', WDC: 'MERCEDES-BENZ', WDD: 'MERCEDES-BENZ', WDF: 'MERCEDES-BENZ', W1K: 'MERCEDES-BENZ', W1N: 'MERCEDES-BENZ', W1V: 'MERCEDES-BENZ',
  W0L: 'OPEL', W0V: 'OPEL',
  // Italiens
  ZFA: 'FIAT', ZFC: 'FIAT', ZAR: 'ALFA ROMEO', ZLA: 'LANCIA',
  // Ford
  WF0: 'FORD', WF1: 'FORD', SFA: 'FORD', VS6: 'FORD', NM0: 'FORD',
  // Japonais et coreens
  VNK: 'TOYOTA', SB1: 'TOYOTA', JTD: 'TOYOTA', JT2: 'TOYOTA', JTE: 'TOYOTA', JTM: 'TOYOTA', MR0: 'TOYOTA',
  SJN: 'NISSAN', JN1: 'NISSAN', JN8: 'NISSAN', VSK: 'NISSAN', MNT: 'NISSAN',
  KMH: 'HYUNDAI', KMF: 'HYUNDAI', TMA: 'HYUNDAI', NLH: 'HYUNDAI', KNA: 'KIA', KND: 'KIA', KNE: 'KIA', U5Y: 'KIA',
  TSM: 'SUZUKI', JS2: 'SUZUKI', JS3: 'SUZUKI', MA3: 'SUZUKI',
  JMZ: 'MAZDA', JM1: 'MAZDA', JMB: 'MITSUBISHI', JMY: 'MITSUBISHI', MMC: 'MITSUBISHI',
  JHM: 'HONDA', SHH: 'HONDA', JF1: 'SUBARU', JF2: 'SUBARU', JDA: 'DAIHATSU',
  // Autres
  YV1: 'VOLVO', YV4: 'VOLVO', SAJ: 'JAGUAR', SAL: 'LAND ROVER', XTA: 'LADA', KL1: 'CHEVROLET', KLA: 'DAEWOO',
};

/** Annee-modele d'apres le 10e caractere (cycle de 30 ans : "A" = 1980 ou 2010 -> on prend la date la plus recente qui n'est pas dans le futur). */
function modelYear(char: string, today: Date): number | null {
  const LETTERS = 'ABCDEFGHJKLMNPRSTVWXY'; // A=2010 ... Y=2030 (sans I, O, Q, U, Z)
  if (/[1-9]/.test(char)) return 2000 + Number(char);
  const i = LETTERS.indexOf(char);
  if (i < 0) return null;
  const recent = 2010 + i;
  return recent <= today.getFullYear() + 1 ? recent : recent - 30;
}

export interface VinInfo {
  vin: string;
  /** constructeur d'apres les 3 premiers caracteres, ou null s'il n'est pas dans la liste */
  make: string | null;
  /** annee-modele indicative (beaucoup de constructeurs europeens ne respectent pas cette regle) */
  year: number | null;
}

/** Lit le VIN : null si ce n'est pas un VIN de 17 caracteres. */
export function decodeVin(raw: string, today: Date = new Date()): VinInfo | null {
  const vin = normalizeVin(raw);
  if (!isValidVinFormat(vin)) return null;
  const year = modelYear(vin[9], today);
  return { vin, make: WMI[vin.slice(0, 3)] ?? null, year: year !== null && year >= 1990 ? year : null };
}

const STORAGE_KEY = 'azouni_vin';

/** Garde le dernier VIN saisi dans ce navigateur (il preremplit le formulaire de commande) ; sans effet si le stockage est bloque. */
export function saveVin(vin: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, vin);
  } catch {
    // stockage indisponible : le VIN reste simplement a ressaisir
  }
}

/** Dernier VIN saisi dans ce navigateur, ou "". */
export function readSavedVin(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}
