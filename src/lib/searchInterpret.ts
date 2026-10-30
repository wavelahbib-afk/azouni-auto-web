import { makeKey, vehicleParam, type VehicleMake } from './vehicles';

/**
 * Recherche "intelligente" : transforme une phrase de client ("plaquettes avant clio 2 2004") en filtres du catalogue (pieces, voiture, constructeur, reference).
 * Ce fichier est la partie SANS IA : des regles, le vocabulaire du catalogue et la liste des voitures du site -- gratuit, instantane, et c'est lui qui repond a la
 * grande majorite des recherches. Quand il y a des mots qu'il ne comprend pas (langue etrangere, faute lourde), le serveur peut demander de l'aide a une IA (searchAi.ts),
 * dont la reponse repasse ensuite par les memes verifications : rien de ce qui n'existe pas dans le catalogue n'est jamais accepte.
 * Fonctions pures : aucun acces reseau ni base de donnees.
 */

export interface SearchInterpretation {
  /** mots-cles de la piece, separes par une espace ("plaquette avant") ; vide si aucun */
  q: string;
  /** modele choisi (constructeur + modele tels qu'ils sont dans le selecteur de vehicule du site) */
  vehicule: { make: string; model: string } | null;
  /** constructeur seul, quand le modele n'est pas precise ou pas reconnu */
  constructeur: string | null;
  /** annee citee (information : le catalogue ne filtre pas par annee) */
  annee: number | null;
  /** reference d'article trouvee dans la phrase (remplace les autres filtres) */
  reference: string | null;
  /** mots du client qui ne sont ni dans le catalogue ni une voiture */
  inconnus: string[];
  source: 'regles' | 'ia';
}

interface ModelEntry {
  make: string;
  model: string;
  /** mots du nom du modele, "II" ecrit "2" */
  tokens: string[];
  nb: number;
}

/** Ce que l'interpreteur connait : voitures du site et mots des titres du catalogue. */
export interface SearchLexicon {
  makes: VehicleMake[];
  /** mot normalise -> nombre d'articles ou il apparait */
  vocab: Map<string, number>;
  /** mots tries (recherche par prefixe) */
  words: string[];
  models: ModelEntry[];
  /** nom normalise d'un constructeur ("mercedes benz", "vw"...) -> constructeur du site */
  makeNames: Map<string, string>;
}

/** Minuscules, sans accents, mots separes par une espace (tout ce qui n'est ni lettre latine ni chiffre disparait). */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const ROMAN: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };

const MAKE_ALIASES: Record<string, string> = { vw: 'VOLKSWAGEN', volks: 'VOLKSWAGEN', merco: 'MERCEDES-BENZ', mercedes: 'MERCEDES-BENZ', mb: 'MERCEDES-BENZ', vauxhall: 'OPEL', land: 'LAND ROVER' };

const STOPWORDS = new Set(
  (
    'le la les l de du des d un une pour avec et ou sur sous mon ma mes ton ta votre je j jai cherche cherch recherche veux voudrais besoin avez vous svp merci bonjour salut bonsoir ' +
    'piece pieces voiture vehicule auto a au aux en est ce que qui il y s t si possible stock disponible prix combien achat acheter pour mon ma pas cher neuf neuve original'
  ).split(' '),
);

/** Mots anglais courants -> mot francais du catalogue. */
const SYNONYMS: Record<string, string> = {
  pad: 'plaquette', pads: 'plaquette', brake: 'frein', brakes: 'frein', oil: 'huile', filter: 'filtre', spark: 'bougie', plug: 'bougie', plugs: 'bougie', battery: 'batterie',
  shock: 'amortisseur', shocks: 'amortisseur', absorber: 'amortisseur', clutch: 'embrayage', belt: 'courroie', timing: 'distribution', wiper: 'balai', headlight: 'phare',
  disc: 'disque', disk: 'disque', bearing: 'roulement', gasket: 'joint', radiator: 'radiateur', starter: 'demarreur', alternator: 'alternateur', front: 'avant', rear: 'arriere',
  left: 'gauche', right: 'droite',
};

/** Modeles a un seul mot qui sont aussi des mots courants : jamais reconnus sans constructeur. */
const GENERIC_MODEL_WORDS = new Set(['kit', 'jeu', 'huile', 'filtre', 'air', 'mini', 'one', 'up', 'go', 'max', 'plus', 'sport', 'van', 'pick', 'base', 'new', 'classe', 'serie', 'series', 'cross', 'city']);

/** Construit le lexique : voitures du site (selecteur) et mots des titres d'articles (designation + vehicules cites). */
export function buildLexicon(makes: VehicleMake[], titles: string[]): SearchLexicon {
  const vocab = new Map<string, number>();
  for (const title of titles) {
    for (const w of new Set(fold(title).split(' '))) if (w.length >= 2) vocab.set(w, (vocab.get(w) ?? 0) + 1);
  }
  const makeNames = new Map<string, string>();
  const models: ModelEntry[] = [];
  for (const m of makes) {
    makeNames.set(fold(m.label), m.make);
    makeNames.set(makeKey(m.make), m.make);
    for (const mod of m.models) {
      const tokens = fold(mod.model)
        .split(' ')
        .filter(Boolean)
        .map((t) => ROMAN[t] ?? t);
      if (tokens.length > 0) models.push({ make: m.make, model: mod.model, tokens, nb: mod.nb });
    }
  }
  for (const [alias, canonical] of Object.entries(MAKE_ALIASES)) {
    const found = makes.find((m) => m.make === canonical);
    if (found) makeNames.set(alias, found.make);
  }
  return { makes, vocab, words: Array.from(vocab.keys()).sort(), models, makeNames };
}

/** Y a-t-il un mot du catalogue qui commence par `prefix` ? (recherche dichotomique dans la liste triee) */
function hasPrefix(words: string[], prefix: string): boolean {
  let lo = 0;
  let hi = words.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid] < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo < words.length && words[lo].startsWith(prefix);
}

function distance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Mot (ou debut de mot) du catalogue le plus proche d'un mot mal ecrit ("plakette" -> "plaquette", debut de "plaquettes"). On compare aussi avec des DEBUTS de mots, parce que
 * la recherche du site compare des debuts de mots : "plaquette" retrouve "plaquettes".
 */
function correctWord(lex: SearchLexicon, word: string): string | null {
  if (word.length < 4) return null;
  const max = word.length <= 5 ? 1 : 2;
  let best: { w: string; d: number; n: number } | null = null;
  for (const full of lex.words) {
    if (full.length < 4 || full.length < word.length - max) continue;
    for (let len = word.length - 1; len <= word.length + 1; len++) {
      if (len > full.length || len < 4) continue;
      const cand = full.slice(0, len);
      const d = distance(word, cand, max);
      if (d > max) continue;
      const n = lex.vocab.get(full) ?? 0;
      if (!best || d < best.d || (d === best.d && n > best.n)) best = { w: cand, d, n };
    }
  }
  return best ? best.w : null;
}

/** Forme du mot cherchee dans le catalogue : synonyme anglais, pluriel retire ("plaquettes" -> "plaquette", la recherche du site compare des debuts de mots). */
function normalizeKeyword(word: string): string {
  const syn = SYNONYMS[word];
  if (syn) return syn;
  return word.length >= 5 && /[sx]$/.test(word) ? word.slice(0, -1) : word;
}

/** Constructeur cite dans la phrase (un ou deux mots), et les mots utilises. */
function findMake(lex: SearchLexicon, tokens: string[]): { make: string; used: Set<number> } | null {
  for (let i = 0; i < tokens.length; i++) {
    if (i + 1 < tokens.length) {
      const two = lex.makeNames.get(`${tokens[i]} ${tokens[i + 1]}`);
      if (two) return { make: two, used: new Set([i, i + 1]) };
    }
  }
  for (let i = 0; i < tokens.length; i++) {
    const one = lex.makeNames.get(tokens[i]);
    // "land" seul (alias de Land Rover) n'est un constructeur que suivi de "rover" : deja traite plus haut
    if (one && tokens[i] !== 'land') return { make: one, used: new Set([i]) };
  }
  return null;
}

/** Modele cite dans la phrase : tous les mots du modele doivent s'y trouver ("clio 2" ou "clio ii" -> CLIO II) ; le plus precis (le plus de mots) puis le plus courant l'emporte. */
function findModel(lex: SearchLexicon, tokens: string[], make: string | null): ModelEntry | null {
  const query = new Set<string>();
  for (const t of tokens) {
    query.add(t);
    if (ROMAN[t]) query.add(ROMAN[t]);
  }
  let best: ModelEntry | null = null;
  for (const m of lex.models) {
    if (make && m.make !== make) continue;
    if (!m.tokens.every((t) => query.has(t))) continue;
    if (!make && m.tokens.length === 1) {
      // sans constructeur, un modele a un seul mot doit etre assez distinctif
      const t = m.tokens[0];
      if (t.length < 3 || GENERIC_MODEL_WORDS.has(t)) continue;
    }
    if (!best || m.tokens.length > best.tokens.length || (m.tokens.length === best.tokens.length && m.nb > best.nb)) best = m;
  }
  return best;
}

const YEAR = /^(19[89]\d|20[0-3]\d)$/;
const REFERENCE = /^(?=.*\d)[a-z0-9]{5,}$/;

/** Interpretation par regles d'une phrase de client. */
export function interpretWithRules(text: string, lex: SearchLexicon): SearchInterpretation {
  const rawTokens = fold(text).split(' ').filter(Boolean);
  const result: SearchInterpretation = { q: '', vehicule: null, constructeur: null, annee: null, reference: null, inconnus: [], source: 'regles' };
  // texte sans lettres latines (arabe...) : rien n'est compris sans aide
  if (rawTokens.length === 0) {
    if (text.trim()) result.inconnus.push(text.trim().slice(0, 60));
    return result;
  }

  // lettres d'une autre ecriture (arabe...) : fold() les efface, mais elles veulent dire quelque chose -> a confier a l'IA
  const foreign = text.replace(/[\p{Script=Latin}\P{L}]/gu, '');
  if (foreign) result.inconnus.push(foreign.slice(0, 60));

  const consumed = new Set<number>();

  // annee
  rawTokens.forEach((t, i) => {
    if (YEAR.test(t) && result.annee === null) {
      result.annee = Number(t);
      consumed.add(i);
    }
  });

  // reference d'article : un mot de 5 caracteres ou plus avec au moins un chiffre
  const refIndex = rawTokens.findIndex((t, i) => !consumed.has(i) && REFERENCE.test(t));
  if (refIndex >= 0) {
    result.reference = rawTokens[refIndex];
    result.q = rawTokens[refIndex];
    return result;
  }

  // constructeur puis modele
  const make = findMake(lex, rawTokens);
  if (make) for (const i of make.used) consumed.add(i);
  const model = findModel(lex, rawTokens, make?.make ?? null);
  // "golf" ou "clio" seul : le nom existe, mais il couvre plusieurs generations (Golf IV, V, VI...) -> on filtre sur le constructeur et on garde le nom comme mot-cle
  // (ambigu = il existe le meme nom suivi d'un numero de generation : "GOLF" -> "GOLF 5", mais pas "GOLF V" -> "GOLF V PLUS")
  const ambiguous = model
    ? lex.models.some(
        (m) =>
          m.make === model.make &&
          m !== model &&
          m.tokens.length > model.tokens.length &&
          model.tokens.every((t) => m.tokens.includes(t)) &&
          m.tokens.filter((t) => !model.tokens.includes(t)).every((t) => /^\d+$/.test(t)),
      )
    : false;
  if (model && ambiguous) {
    result.constructeur = model.make;
  } else if (model) {
    result.vehicule = { make: model.make, model: model.model };
    const modelWords = new Set(model.tokens);
    rawTokens.forEach((t, i) => {
      if (modelWords.has(t) || (ROMAN[t] && modelWords.has(ROMAN[t]))) consumed.add(i);
    });
  } else if (make) {
    result.constructeur = make.make;
  } else {
    // pas de constructeur cite et pas de modele complet ("clio") : si ce mot ouvre le nom de modeles d'un seul constructeur, c'est lui
    const first = new Set(rawTokens.filter((t) => t.length >= 4 && !STOPWORDS.has(t) && !GENERIC_MODEL_WORDS.has(t)));
    const owners = new Set(lex.models.filter((m) => first.has(m.tokens[0])).map((m) => m.make));
    if (owners.size === 1) result.constructeur = Array.from(owners)[0];
  }

  // mots de la piece
  const keywords: string[] = [];
  rawTokens.forEach((t, i) => {
    if (consumed.has(i) || STOPWORDS.has(t)) return;
    const word = normalizeKeyword(t);
    if (word.length < 2) return;
    if (hasPrefix(lex.words, word)) {
      keywords.push(word);
      return;
    }
    const fixed = correctWord(lex, word);
    if (fixed) {
      keywords.push(fixed);
      return;
    }
    result.inconnus.push(t);
    keywords.push(t);
  });
  result.q = keywords.join(' ');
  return result;
}

/** Garde de la reponse d'une IA : mots-cles connus du catalogue seulement, constructeur/modele verifies dans la liste des voitures du site. */
export function applyAiAnswer(
  ai: { mots_cles: string[]; marque: string | null; modele: string | null; reference: string | null; annee: number | null },
  lex: SearchLexicon,
): SearchInterpretation {
  const result: SearchInterpretation = { q: '', vehicule: null, constructeur: null, annee: null, reference: null, inconnus: [], source: 'ia' };
  if (ai.annee && YEAR.test(String(ai.annee))) result.annee = ai.annee;
  const reference = ai.reference ? fold(ai.reference).replace(/ /g, '') : '';
  if (REFERENCE.test(reference)) {
    result.reference = reference;
    result.q = reference;
    return result;
  }
  // vehicule : on rejoue le texte "marque modele" dans les regles, pour que le modele soit retrouve exactement comme dans le selecteur
  const vehicleText = fold(`${ai.marque ?? ''} ${ai.modele ?? ''}`);
  if (vehicleText) {
    const v = interpretWithRules(vehicleText, lex);
    result.vehicule = v.vehicule;
    result.constructeur = v.constructeur;
  }
  const keywords: string[] = [];
  for (const raw of ai.mots_cles.slice(0, 5)) {
    for (const t of fold(raw).split(' ')) {
      if (!t || STOPWORDS.has(t)) continue;
      const word = normalizeKeyword(t);
      if (hasPrefix(lex.words, word)) keywords.push(word);
      else {
        const fixed = correctWord(lex, word);
        if (fixed) keywords.push(fixed);
      }
    }
  }
  result.q = Array.from(new Set(keywords)).join(' ');
  return result;
}

/** L'interpretation contient-elle quelque chose d'exploitable ? */
export function hasUsefulFilters(r: SearchInterpretation): boolean {
  return Boolean(r.q || r.vehicule || r.constructeur || r.reference);
}

/** Adresse du catalogue correspondant (filtres lus par components/Catalogue.tsx). */
export function catalogueUrlFor(r: SearchInterpretation): string {
  const sp = new URLSearchParams();
  if (r.q) sp.set('q', r.q);
  if (r.vehicule) sp.set('vehicule', vehicleParam(r.vehicule.make, r.vehicule.model));
  else if (r.constructeur) sp.set('constructeur', r.constructeur);
  const qs = sp.toString();
  return qs ? `/catalogue?${qs}` : '/catalogue';
}
