import type { CatalogArticle } from './types';
import { articleTitle, effectivePrice, hasPrice, promoPercent, promoPrice } from './display';
import { CATEGORY_SLUGS, normCategoryText, type CategorySlug } from './categoryRules';

/**
 * Vitrine animee de l'accueil : vraies photos d'articles en stock (avec leur prix) qui defilent dans le bandeau d'accueil, et quelques photos choisies par rayon dans
 * chaque carreau de categorie (bougies et bobines pour l'electricite, bidons d'huile et filtres pour l'entretien...). Le choix est fait cote serveur, une fois par
 * regeneration de la page ; il est deterministe (pas de hasard) : meme catalogue, memes photos.
 */
export interface ShowcaseItem {
  code: string;
  title: string;
  price: number;
  /** ancien prix si l'article est en promotion */
  oldPrice: number | null;
  percent: number | null;
  photo: string;
}

function toItem(a: CatalogArticle): ShowcaseItem {
  return {
    code: a.code,
    title: articleTitle(a),
    price: effectivePrice(a),
    oldPrice: promoPrice(a) !== null ? a.prix_vente_ttc : null,
    percent: promoPercent(a),
    photo: a.photo_url as string,
  };
}

/** Articles utilisables dans la vitrine : une photo, un prix, du stock. */
function withPhoto(articles: CatalogArticle[]): CatalogArticle[] {
  return articles.filter((a) => a.photo_url && hasPrice(a) && a.stock_qty > 0);
}

/** Empreinte stable d'un texte (ordre de melange reproductible). */
function hash(text: string): number {
  let h = 7;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

const byHash = (a: CatalogArticle, b: CatalogArticle): number => hash(a.code) - hash(b.code);

/** Une seule fois chaque piece : "JEU DE MACHOIRES" ne doit pas apparaitre cinq fois. */
function distinctByTitle(list: CatalogArticle[], limit: number): CatalogArticle[] {
  const seen = new Set<string>();
  const out: CatalogArticle[] = [];
  for (const a of list) {
    const key = normCategoryText(articleTitle(a));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(a);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Photos du bandeau d'accueil : les promotions et les articles mis en avant d'abord, puis une piece de chaque rayon tour a tour, pour que le defilement montre
 * des pieces variees (et non vingt amortisseurs).
 */
export function pickHeroItems(articles: CatalogArticle[], count = 18): ShowcaseItem[] {
  const pool = withPhoto(articles).sort(byHash);
  const picked: CatalogArticle[] = [];
  const taken = new Set<string>();
  const add = (a: CatalogArticle) => {
    if (taken.has(a.code)) return;
    taken.add(a.code);
    picked.push(a);
  };
  distinctByTitle(pool.filter((a) => promoPrice(a) !== null), 4).forEach(add);
  distinctByTitle(pool.filter((a) => a.en_vedette), 4).forEach(add);

  const byCategory = new Map<string, CatalogArticle[]>();
  for (const slug of CATEGORY_SLUGS) byCategory.set(slug, distinctByTitle(pool.filter((a) => a.categorie === slug), 12));
  for (let round = 0; picked.length < count && round < 12; round++) {
    for (const slug of CATEGORY_SLUGS) {
      if (slug === 'autres' && round > 1) continue; // les "autres pieces" ne dominent pas le defilement
      const a = byCategory.get(slug)?.[round];
      if (a) add(a);
      if (picked.length >= count) break;
    }
  }
  return picked.map(toItem);
}

type Pred = (title: string) => boolean;
const re =
  (r: RegExp): Pred =>
  (t) =>
    r.test(t);

/**
 * Ce qu'on veut voir dans chaque carreau : des groupes de pieces typiques du rayon, tires tour a tour (un bidon, puis un filtre, puis une bougie...). Les textes
 * sont compares sous la forme normalisee des regles de categories (minuscules, sans accent, mots separes par une espace).
 */
const TILE_GROUPS: Record<CategorySlug, Pred[]> = {
  filtration: [re(/filtre (a |d |de )?huile/), re(/filtre (a |d |de )?air/), re(/filtre (a |d |de )?(gasoil|gazoil|carburant|essence)/), re(/filtre (d |de )?(habitacle|pollen)/)],
  freinage: [re(/ disques? /), re(/ plaquettes? /), re(/ (etriers?|machoires?|tambours?) /), re(/ (flexibles?|maitre cylindre|cylindre de roue) /)],
  'suspension-direction': [re(/ amortisseurs? /), re(/ rotules? /), re(/ (biellettes?|barre stabilisatrice) /), re(/ (triangles?|bras de suspension) /), re(/ (roulements?|silent ?blocs?) /)],
  transmission: [re(/ (cardans?|soufflets?) /), re(/ (kit d embrayage|embrayage|butee|volant moteur) /), re(/ (boite|pignon|engrenage|synchro) /), re(/ (arbre|transmission) /)],
  'electricite-allumage': [re(/ bougies? /), re(/ bobines? /), re(/ (ampoules?|lampes?) /), re(/ (alternateurs?|demarreurs?) /), re(/ (relais|capteurs?|sondes?) /)],
  'huiles-entretien': [
    (t) => /\d{1,2}w ?\d{2}/.test(t) || (/ huile /.test(t) && !/pare huile|filtre/.test(t)),
    re(/ (liquide|lave glace|refrigerant|antigel|graisse|nettoyant) /),
  ],
  'moteur-distribution': [re(/ (courroies?|kit de distribution|chaines? de distribution) /), re(/ pompes? /), re(/ (joint de culasse|culasse|joints?) /), re(/ (radiateurs?|thermostats?|durites?) /), re(/ (echappement|silencieux|catalyseur) /)],
  autres: [re(/ (ailes?|spoilers?|pare chocs?|capots?|retroviseurs?) /), re(/ (phares?|feux) /), re(/ (balais?|essuie) /)],
};

const OIL_FILTER: Pred = re(/filtre (a |d |de )?huile/);

/** Photos de chaque carreau de categorie (jusqu'a `perTile`), choisies par type de piece ; a defaut de piece typique, n'importe quelle photo du rayon. */
export function pickTileItems(articles: CatalogArticle[], perTile = 6): Record<string, ShowcaseItem[]> {
  const pool = withPhoto(articles).sort(byHash);
  const titles = new Map<string, string>();
  for (const a of pool) titles.set(a.code, normCategoryText(articleTitle(a)));
  const text = (a: CatalogArticle) => titles.get(a.code) ?? '';

  const out: Record<string, ShowcaseItem[]> = {};
  for (const slug of CATEGORY_SLUGS) {
    const inCategory = pool.filter((a) => a.categorie === slug);
    const groups = TILE_GROUPS[slug].map((pred) => distinctByTitle(inCategory.filter((a) => pred(text(a))), perTile));
    // "huiles & entretien" : des bidons ET quelques filtres a huile (rangés dans Filtration)
    if (slug === 'huiles-entretien') groups.splice(1, 0, distinctByTitle(pool.filter((a) => OIL_FILTER(text(a))), 3));

    const picked: CatalogArticle[] = [];
    const taken = new Set<string>();
    for (let round = 0; picked.length < perTile && round < perTile; round++) {
      for (const g of groups) {
        const a = g[round];
        if (a && !taken.has(a.code)) {
          taken.add(a.code);
          picked.push(a);
          if (picked.length >= perTile) break;
        }
      }
    }
    // complete avec d'autres pieces du rayon si les groupes n'ont pas fourni assez de photos
    if (picked.length < 4) for (const a of distinctByTitle(inCategory, perTile)) if (!taken.has(a.code) && picked.length < perTile) picked.push(a);
    out[slug] = picked.map(toItem);
  }
  return out;
}

/**
 * Ecarte les "photos" qui sont en fait un logo de fournisseur ou une image generique reutilisee sur plusieurs articles : des articles differents dont l'image a exactement
 * la meme taille en octets partagent le meme fichier (ex. le logo d'un fournisseur sur des dizaines de tetes de cardan). Pour les reperer on lit la taille d'un echantillon
 * de tout le catalogue (un article sur dix) par de simples requetes HEAD, mises en cache un jour : une taille vue au moins 3 fois est un fichier partage. Si le serveur d'images
 * ne repond pas, l'article est garde. Les listes recues sont des candidats classes par ordre de preference : on garde les `heroCount` / `tileCount` premiers qui passent.
 */
export async function vetShowcase(
  articles: CatalogArticle[],
  hero: ShowcaseItem[],
  tiles: Record<string, ShowcaseItem[]>,
  heroCount = 18,
  tileCount = 6,
): Promise<{ hero: ShowcaseItem[]; tiles: Record<string, ShowcaseItem[]> }> {
  const sample = withPhoto(articles)
    .sort(byHash)
    .filter((_, i) => i % 10 === 0)
    .map((a) => a.photo_url as string);
  const urls = Array.from(new Set([...sample, ...hero.map((i) => i.photo), ...Object.values(tiles).flat().map((i) => i.photo)]));
  const sizes = new Map<string, number>();
  for (let i = 0; i < urls.length; i += 25) {
    await Promise.all(
      urls.slice(i, i + 25).map(async (url) => {
        try {
          const res = await fetch(url, { method: 'HEAD', next: { revalidate: 86400 } });
          const n = Number(res.headers.get('content-length'));
          if (res.ok && n > 0) sizes.set(url, n);
        } catch {
          // image injoignable : l'article reste dans la vitrine
        }
      }),
    );
  }
  const countBySize = new Map<number, number>();
  for (const n of sizes.values()) countBySize.set(n, (countBySize.get(n) ?? 0) + 1);
  const isShared = (url: string): boolean => (countBySize.get(sizes.get(url) ?? -1) ?? 0) >= 3;
  const keep = (list: ShowcaseItem[], n: number) => list.filter((i) => !isShared(i.photo)).slice(0, n);
  return { hero: keep(hero, heroCount), tiles: Object.fromEntries(Object.entries(tiles).map(([slug, list]) => [slug, keep(list, tileCount)])) };
}
