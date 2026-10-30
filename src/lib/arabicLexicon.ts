/**
 * Dictionnaire arabe et darija (ecrit en arabe ou en lettres latines) -> mots du catalogue, pour que la recherche comprenne les clients qui ecrivent comme ils parlent, SANS IA :
 * gratuit, instantane, et rien ne quitte le site. C'est une liste de depart : un mot absent est simplement confie a l'IA (si elle est activee), et la liste des "recherches
 * sans resultat" de l'application montre les mots a ajouter ici.
 *
 * Les mots arabes sont compares sous une forme simplifiee (voir normalizeArabic : sans voyelles breves, alef/ya/ta marbuta unifies, sans l'article "ال").
 */

/** Forme comparee d'un mot arabe : sans signes de voyelles ni allongement, lettres variantes unifiees. */
export function normalizeArabic(word: string): string {
  return word
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي');
}

/** Chiffres arabes-indiens (٠-٩) et persans (۰-۹) -> chiffres latins. */
export function latinDigits(text: string): string {
  return text.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) & 0xf));
}

/** [mot ou expression, mot(s) du catalogue]. Ecritures multiples d'un meme mot : une ligne chacune. */
const ENTRIES: [string, string][] = [
  // ---- freinage ----
  ['فرامل', 'frein'], ['فرملة', 'frein'], ['فرين', 'frein'], ['فران', 'frein'], ['فرانة', 'frein'], ['فرايل', 'frein'],
  ['بلاكات', 'plaquette'], ['بلاكة', 'plaquette'], ['بلاكيت', 'plaquette'], ['بلاكيط', 'plaquette'], ['لوحات فرامل', 'plaquette frein'], ['ديسك', 'disque'], ['اقراص', 'disque'], ['قرص', 'disque'],
  ['طمبور', 'tambour'], ['طامبور', 'tambour'], ['ماشوار', 'machoire'], ['مشوار', 'machoire'], ['ماسترسيلندر', 'maitre cylindre'],
  // ---- huiles, filtres ----
  ['زيت', 'huile'], ['زيوت', 'huile'], ['زيت محرك', 'huile moteur'], ['زيت موتور', 'huile moteur'], ['زيت بوات', 'huile boite'], ['زيت فيتاس', 'huile boite'], ['ماء تبريد', 'liquide refroidissement'], ['مبرد سائل', 'liquide refroidissement'],
  ['فلتر', 'filtre'], ['فيلتر', 'filtre'], ['فلاتر', 'filtre'], ['فلتر زيت', 'filtre huile'], ['فيلتر زيت', 'filtre huile'], ['فلتر هواء', 'filtre air'], ['فيلتر هواء', 'filtre air'], ['فلتر مازوط', 'filtre gasoil'], ['فلتر ديزل', 'filtre gasoil'],
  ['فلتر بنزين', 'filtre essence'], ['فلتر كابين', 'filtre habitacle'], ['فلتر مكيف', 'filtre habitacle'], ['مصفاه', 'filtre'], ['مصفي', 'filtre'],
  // ---- moteur, distribution ----
  ['محرك', 'moteur'], ['موتور', 'moteur'], ['مازوط', 'gasoil'], ['ديزل', 'gasoil'], ['بنزين', 'essence'],
  ['سير', 'courroie'], ['حزام', 'courroie'], ['كورواه', 'courroie'], ['كوروا', 'courroie'], ['سير توزيع', 'kit distribution'], ['كيت توزيع', 'kit distribution'], ['توزيع', 'distribution'], ['كيت', 'kit'],
  ['جوان', 'joint'], ['جوان كولاس', 'joint culasse'], ['كولاس', 'culasse'], ['مضخه', 'pompe'], ['بومبه', 'pompe'], ['بومب', 'pompe'], ['بومبه ماء', 'pompe eau'], ['مضخه ماء', 'pompe eau'], ['بومبه زيت', 'pompe huile'],
  ['رادياتور', 'radiateur'], ['راديتور', 'radiateur'], ['مبرد', 'radiateur'], ['ثرموستات', 'thermostat'], ['ترموستات', 'thermostat'], ['تورو', 'turbo'], ['توربو', 'turbo'], ['دوريت', 'durite'], ['خرطوم', 'durite'],
  ['صدام', 'pare choc'], ['اشكمان', 'echappement'], ['شكمان', 'echappement'], ['كاتاليزور', 'catalyseur'],
  // ---- suspension, direction ----
  ['مساعد', 'amortisseur'], ['مساعدات', 'amortisseur'], ['امورتيسور', 'amortisseur'], ['اموتيسور', 'amortisseur'], ['امورتيزور', 'amortisseur'], ['روتول', 'rotule'], ['روتيل', 'rotule'], ['روتوله', 'rotule'],
  ['بييات', 'biellette'], ['بيات', 'biellette'], ['بييت', 'biellette'], ['ترونجل', 'triangle'], ['مثلث', 'triangle'], ['سيلانبلوك', 'silentbloc'], ['سيلونبلو', 'silentbloc'], ['سيلونبلوك', 'silentbloc'],
  ['رولمان', 'roulement'], ['رولمو', 'roulement'], ['رولمون', 'roulement'], ['جنط', 'jante'], ['شاسي', 'chassis'], ['كريماير', 'cremaillere'], ['كرمايار', 'cremaillere'], ['مقود', 'direction'], ['دركسيون', 'direction'],
  // ---- transmission ----
  ['دبرياج', 'embrayage'], ['دبريياج', 'embrayage'], ['ابرياج', 'embrayage'], ['كلاتش', 'embrayage'], ['كيت دبرياج', 'kit embrayage'], ['كارданه', 'cardan'], ['كاردان', 'cardan'], ['كردان', 'cardan'],
  ['صندوق سرعه', 'boite vitesse'], ['بوات', 'boite'], ['بواط', 'boite'], ['فولون', 'volant'], ['فولان', 'volant'],
  // ---- electricite, allumage ----
  ['بوجي', 'bougie'], ['بوجيه', 'bougie'], ['بوجيات', 'bougie'], ['شمعه', 'bougie'], ['شموع', 'bougie'], ['بوبينه', 'bobine'], ['بوبين', 'bobine'], ['بطاريه', 'batterie'], ['باتري', 'batterie'], ['باتريه', 'batterie'],
  ['دينامو', 'alternateur'], ['الترناتور', 'alternateur'], ['التيرناتور', 'alternateur'], ['ديمارور', 'demarreur'], ['ديماره', 'demarreur'], ['دمارور', 'demarreur'], ['مارش', 'demarreur'],
  ['لمبه', 'ampoule'], ['لمبات', 'ampoule'], ['ضو', 'feu'], ['اضواء', 'feu'], ['فانوس', 'feu'], ['فار', 'phare'], ['فارات', 'phare'], ['ريلي', 'relais'], ['ريليه', 'relais'], ['حساس', 'capteur'], ['سوند', 'sonde'],
  // ---- carrosserie, accessoires ----
  ['جناح', 'aile'], ['كابو', 'capot'], ['رتروفيزور', 'retroviseur'], ['مراه', 'retroviseur'], ['مرايه', 'retroviseur'], ['مساحه', 'essuie glace'], ['مساحات', 'essuie glace'],
  // ---- positions ----
  ['امامي', 'avant'], ['قدام', 'avant'], ['اماميه', 'avant'], ['خلفي', 'arriere'], ['ورا', 'arriere'], ['وراء', 'arriere'], ['خلفيه', 'arriere'], ['يمين', 'droite'], ['يمنى', 'droite'], ['يسار', 'gauche'], ['يسرى', 'gauche'],
  // ---- constructeurs et modeles courants ----
  ['رونو', 'renault'], ['رينو', 'renault'], ['بيجو', 'peugeot'], ['سيتروان', 'citroen'], ['ستروين', 'citroen'], ['فولكسفاجن', 'volkswagen'], ['فولكسفاغن', 'volkswagen'], ['فولكس', 'volkswagen'], ['داسيا', 'dacia'],
  ['هيونداي', 'hyundai'], ['هيوندي', 'hyundai'], ['كيا', 'kia'], ['تويوتا', 'toyota'], ['نيسان', 'nissan'], ['فيات', 'fiat'], ['اوبل', 'opel'], ['فورد', 'ford'], ['مرسيدس', 'mercedes'], ['بي ام', 'bmw'], ['اودي', 'audi'],
  ['سيات', 'seat'], ['سكودا', 'skoda'], ['سوزوكي', 'suzuki'], ['ميتسوبيشي', 'mitsubishi'], ['مازدا', 'mazda'], ['شيفروليه', 'chevrolet'], ['شيفرولي', 'chevrolet'], ['هوندا', 'honda'], ['فولفو', 'volvo'], ['جيب', 'jeep'],
  ['كليو', 'clio'], ['ميجان', 'megane'], ['ميغان', 'megane'], ['سيمبول', 'symbol'], ['سامبول', 'symbol'], ['لوجان', 'logan'], ['ساندرو', 'sandero'], ['ديستر', 'duster'], ['كانغو', 'kangoo'], ['كونقو', 'kangoo'],
  ['بولو', 'polo'], ['قولف', 'golf'], ['غولف', 'golf'], ['جولف', 'golf'], ['باسات', 'passat'], ['كادي', 'caddy'], ['تيجوان', 'tiguan'], ['جيتا', 'jetta'],
  ['بارتنر', 'partner'], ['برلنقو', 'berlingo'], ['بيرلينقو', 'berlingo'], ['ابيكس', 'expert'], ['كورسا', 'corsa'], ['استرا', 'astra'], ['بونتو', 'punto'], ['ديبلو', 'doblo'], ['بيبر', 'bipper'], ['فييستا', 'fiesta'], ['فيستا', 'fiesta'], ['فوكس', 'focus'],
  ['كاديت', 'cadet'], ['ياريس', 'yaris'], ['كورولا', 'corolla'], ['هيلوكس', 'hilux'], ['بيكانتو', 'picanto'], ['ريو', 'rio'], ['سيراتو', 'cerato'], ['اكسنت', 'accent'],
];

/** Mots de liaison, de politesse et d'intention (arabe et darija) : ignores, ils ne disent rien sur la piece. */
const STOPWORDS_AR = new Set(
  [
    'نحب', 'نحوس', 'نبحث', 'نجم', 'نحتاج', 'نريد', 'اريد', 'ابحث', 'محتاج', 'محتاجه', 'عندكم', 'عندك', 'هل', 'يوجد', 'فما', 'فمه', 'في', 'من', 'على', 'علي', 'الى', 'ال', 'و', 'ل', 'ب', 'عن', 'ديال', 'متاع', 'باش', 'شنو', 'كيفاش',
    'ممكن', 'برك', 'توا', 'لو', 'سمحت', 'لوسمحت', 'من فضلك', 'شكرا', 'مرحبا', 'سلام', 'عسلامه', 'عسلامة', 'سيارة', 'سياره', 'كرهبه', 'كرهبة', 'طونوبيل', 'طموبيل', 'اوتو', 'قطعه', 'قطع', 'غيار', 'بيس', 'بيسة', 'سعر', 'ثمن', 'قداش', 'بقداش',
  ].map(normalizeArabic),
);

/** Mots darija ecrits en lettres latines -> mot du catalogue ("zit" = huile, "frana" = frein...). */
const LATIN_DARIJA: Record<string, string> = {
  zit: 'huile', ziit: 'huile', zayt: 'huile', frana: 'frein', fran: 'frein', frayn: 'frein', frain: 'frein', frin: 'frein', fren: 'frein', filtr: 'filtre', filtar: 'filtre',
  bouji: 'bougie', bougi: 'bougie', boujiya: 'bougie', batri: 'batterie', batteri: 'batterie', amortissor: 'amortisseur', amortisor: 'amortisseur', mosaed: 'amortisseur',
  debriyaj: 'embrayage', debrayaj: 'embrayage', dibriyaj: 'embrayage', kourwa: 'courroie', kourroi: 'courroie', courwa: 'courroie', kardan: 'cardan', rotoul: 'rotule', rotul: 'rotule',
  radiator: 'radiateur', radiatar: 'radiateur', demarour: 'demarreur', dimarour: 'demarreur', dinamo: 'alternateur', alternator: 'alternateur', joint: 'joint', jouan: 'joint', roulman: 'roulement',
  qodem: 'avant', goddam: 'avant', wara: 'arriere', yamin: 'droite', yassar: 'gauche',
};

/** Mot arabe ou darija en lettres latines -> mot(s) du catalogue, ou null s'il n'est pas dans le dictionnaire. */
const LOOKUP = new Map<string, string>();
for (const [word, french] of ENTRIES) if (french) LOOKUP.set(normalizeArabic(word), french);

const ARABIC_LETTER = /\p{Script=Arabic}/u;

export interface ForeignTranslation {
  /** texte de la recherche ou les mots arabes connus sont remplaces par leur equivalent du catalogue */
  text: string;
  /** mots arabes que le dictionnaire ne connait pas (a confier a l'IA) */
  unknown: string[];
}

/** Traduit les mots arabes connus (par expressions de deux mots d'abord) et le darija ecrit en lettres latines ; ignore les mots de liaison. */
export function translateForeign(rawText: string): ForeignTranslation {
  const text = latinDigits(rawText);
  const tokens = text.split(/[\s,;:.!?؟،]+/).filter(Boolean);
  const out: string[] = [];
  const unknown: string[] = [];
  const clean = (t: string) => {
    const n = normalizeArabic(t);
    return n.startsWith('ال') && n.length > 3 ? n.slice(2) : n;
  };
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (!ARABIC_LETTER.test(tok)) {
      const latin = LATIN_DARIJA[tok.toLowerCase()];
      out.push(latin ?? tok);
      continue;
    }
    // expression de deux mots ("زيت المحرك")
    if (i + 1 < tokens.length && ARABIC_LETTER.test(tokens[i + 1])) {
      const two = LOOKUP.get(`${clean(tok)} ${clean(tokens[i + 1])}`);
      if (two) {
        out.push(two);
        i += 1;
        continue;
      }
    }
    const word = clean(tok);
    const single = LOOKUP.get(word) ?? LOOKUP.get(normalizeArabic(tok));
    if (single) out.push(single);
    else if (STOPWORDS_AR.has(word) || STOPWORDS_AR.has(normalizeArabic(tok))) continue;
    else unknown.push(tok);
  }
  return { text: out.join(' '), unknown };
}
