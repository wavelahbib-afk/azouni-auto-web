import type { CatalogArticle } from './types';

/**
 * Mise en forme des textes d'un article pour l'affichage. AZOUNI AUTO enregistre tout en MAJUSCULES et sans accents ("ROTULE DE DIRECTION DROITE",
 * "BOITE DE VITESSES ARRIERE") : sur le site on affiche une casse francaise normale ("Rotule de direction droite") avec les accents des mots courants.
 */

type Mode = 'sentence' | 'title';

/** Sigles et abreviations qui restent en majuscules. */
const ACRONYMS = new Set([
  'ABS', 'ESP', 'TDI', 'HDI', 'DCI', 'JTD', 'CDTI', 'CRDI', 'TDCI', 'TCE', 'THP', 'VTI', 'GTI', 'GPL', 'LED', 'FAP', 'EGR', 'PSA', 'SUV', 'OE', 'OEM', 'USB',
  'VW', 'BMW', 'MG', 'AV', 'AR', 'DS', 'GM', 'KIA', 'MAN', 'DAF', 'TVA', 'HT', 'TTC', 'ML', 'KM', 'MM', 'XL', 'XS', 'NT',
]);

/** Mots de 2 lettres qui sont de vrais mots francais (pas des sigles). */
const SHORT_WORDS = new Set(['DE', 'DU', 'LA', 'LE', 'EN', 'ET', 'AU', 'UN', 'SI', 'OU', 'ES', 'À']);

/** Accents des mots courants du catalogue (le dictionnaire de l'application ecrit sans accents). */
const ACCENTS: Record<string, string> = {
  ARRIERE: 'arrière', SUPERIEUR: 'supérieur', SUPERIEURE: 'supérieure', INFERIEUR: 'inférieur', INFERIEURE: 'inférieure', INTERIEUR: 'intérieur', INTERIEURE: 'intérieure',
  EXTERIEUR: 'extérieur', EXTERIEURE: 'extérieure', BOITE: 'boîte', ECROU: 'écrou',
  ETRIER: 'étrier', DEMARREUR: 'démarreur', REGULATEUR: 'régulateur', RESERVOIR: 'réservoir', ECHAPPEMENT: 'échappement', RETROVISEUR: 'rétroviseur',
  ELECTRIQUE: 'électrique', MAITRE: 'maître', TETE: 'tête', CABLE: 'câble', CREMAILLERE: 'crémaillère', POIGNEE: 'poignée', VERIN: 'vérin', CHARNIERE: 'charnière',
  MACHOIRE: 'mâchoire', BUTEE: 'butée', CLE: 'clé', RESISTANCE: 'résistance', ECHANGEUR: 'échangeur', PEDALE: 'pédale', ACCELERATEUR: 'accélérateur',
  DEPRESSION: 'dépression', REGLAGE: 'réglage', MECANISME: 'mécanisme', ELEMENT: 'élément', ETANCHEITE: 'étanchéité', ECUSSON: 'écusson', EVAPORATEUR: 'évaporateur',
  DESHYDRATEUR: 'déshydrateur', DEBITMETRE: 'débitmètre', REFRIGERANT: 'réfrigérant', GENERATEUR: 'générateur', PIECE: 'pièce', PIECES: 'pièces',
  RECUPERATEUR: 'récupérateur', REPARATION: 'réparation', LEGER: 'léger', LEGERE: 'légère',
  // modeles et marques de vehicules
  CITROEN: 'citroën', MEGANE: 'mégane', SCENIC: 'scénic', SKODA: 'škoda',
};

function keepUpper(up: string): boolean {
  if (SHORT_WORDS.has(up)) return false; // "À" seul = preposition, pas une lettre de modele
  if (ACRONYMS.has(up)) return true;
  if (/^[IVX]{1,4}$/.test(up)) return true; // chiffres romains : Megane II, Clio III
  if (up.length === 1) return true; // lettre seule : "Astra G H", "Corsa C"
  return up.length === 2 && !SHORT_WORDS.has(up);
}

function caseWord(word: string, mode: Mode, first: boolean): string {
  const up = word.toUpperCase();
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  // "D'AMORTISSEUR" -> "d'amortisseur" (majuscule seulement en tete de phrase ou en mode titre)
  const apos = up.indexOf("'");
  if (apos > 0) {
    const head = up.slice(0, apos);
    const tail = up.slice(apos + 1);
    const headOut = head.length === 1 ? (mode === 'title' || first ? head : head.toLowerCase()) : caseWord(head, mode, first);
    return `${headOut}'${caseWord(tail, 'sentence', false)}`;
  }
  if (keepUpper(up)) return up;
  const base = ACCENTS[up] ?? up.toLowerCase();
  // en mode titre aussi, les petits mots de liaison restent en minuscules ("Barre de connexion") sauf en debut de texte
  return first || (mode === 'title' && !SHORT_WORDS.has(up)) ? cap(base) : base;
}

function convert(text: string, mode: Mode): string {
  const tokens = text.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  let firstDone = false;
  return tokens
    .map((tok) => {
      // numeros, modeles, cotes ("C3", "BJ-917", "98--04", "40X52") : inchanges ; seuls les vrais mots d'au moins 4 lettres qu'ils contiennent
      // ("9/ISUZU", "1.3MULTIJET") prennent la casse normale
      if (/\d/.test(tok)) {
        firstDone = true;
        return tok.replace(/[A-Za-z]{4,}/g, (run) => caseWord(run, 'title', false));
      }
      // "A" seul au milieu d'un nom de piece = preposition ("Filtre a air" -> "Filtre à air")
      if (mode === 'sentence' && firstDone && tok.toUpperCase() === 'A') return 'à';
      return tok.replace(/[A-Za-zÀ-ÿ]+(?:['’][A-Za-zÀ-ÿ]+)?/g, (w) => {
        const out = caseWord(w.replace('’', "'"), mode, !firstDone);
        firstDone = true;
        return out;
      });
    })
    .join(' ');
}

/** "ROTULE DE DIRECTION DROITE" -> "Rotule de direction droite" */
export function sentenceCase(text: string): string {
  return convert(text, 'sentence');
}

/** "PALIO FIORINO DOBLO 1.3" -> "Palio Fiorino Doblo 1.3" */
export function titleCase(text: string): string {
  return convert(text, 'title');
}

function clean(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

/** Titre de l'article : la designation correcte (casse francaise) ; a defaut la designation d'origine mise en forme. */
export function articleTitle(a: Pick<CatalogArticle, 'designation' | 'designation_correcte'>): string {
  const corrected = clean(a.designation_correcte);
  if (corrected) return sentenceCase(corrected);
  return titleCase(clean(a.designation));
}

/** Vehicules cites dans la designation d'origine ("Bipper Nemo Doblo"), ou null. */
export function articleVehicles(a: Pick<CatalogArticle, 'vehicules_compatibles'>): string | null {
  const v = clean(a.vehicules_compatibles);
  return v ? titleCase(v) : null;
}

/** Vrai quand le site affiche une designation corrigee (sinon la designation d'origine sert de titre). */
export function hasCorrectedTitle(a: Pick<CatalogArticle, 'designation_correcte'>): boolean {
  return clean(a.designation_correcte).length > 0;
}

/** Designation d'origine telle que saisie dans AZOUNI AUTO (espaces nettoyes) : affichee en information sur la fiche. */
export function rawDesignation(a: Pick<CatalogArticle, 'designation'>): string {
  return clean(a.designation);
}

/** Reference a afficher : la reference de l'article, a defaut son code. */
export function articleRef(a: Pick<CatalogArticle, 'reference' | 'code'>): string {
  return clean(a.reference) || a.code;
}

/** Prix de vente connu ? (les articles a 0 DT sont "sur demande" : pas de prix affiche ni d'ajout au panier). */
export function hasPrice(a: Pick<CatalogArticle, 'prix_vente_ttc'>): boolean {
  return a.prix_vente_ttc > 0;
}

/** Prix promotionnel TTC si l'article est en promotion (prix promo renseigne, positif et inferieur au prix normal), sinon null. */
export function promoPrice(a: Pick<CatalogArticle, 'prix_vente_ttc' | 'prix_promo'>): number | null {
  const promo = Number(a.prix_promo ?? 0);
  return promo > 0 && a.prix_vente_ttc > 0 && promo < a.prix_vente_ttc ? promo : null;
}

/** Prix a payer : le prix promotionnel s'il y en a un, sinon le prix de vente. */
export function effectivePrice(a: Pick<CatalogArticle, 'prix_vente_ttc' | 'prix_promo'>): number {
  return promoPrice(a) ?? a.prix_vente_ttc;
}

/** Pourcentage de remise arrondi (-15 pour 15 %), ou null hors promotion. */
export function promoPercent(a: Pick<CatalogArticle, 'prix_vente_ttc' | 'prix_promo'>): number | null {
  const promo = promoPrice(a);
  return promo === null ? null : Math.max(1, Math.round((1 - promo / a.prix_vente_ttc) * 100));
}
