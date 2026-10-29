import type { CatalogArticle } from './types';
import { categorySlugOfText, type CategorySlug } from './categoryRules';

/**
 * Categories du site (tuiles de l'accueil, menu "Toutes les pieces", filtre du catalogue). Les "familles" de l'application de bureau ne servent pas ici
 * (trop disparates) : la categorie se deduit du NOM de la piece ("Plaquettes de frein avant" -> Freinage). L'application la calcule a la synchro et l'envoie
 * dans la colonne `categorie` ; tant que cette colonne n'existe pas, le site la deduit lui-meme du titre (memes regles : categoryRules.ts).
 */
export type CategoryIcon = 'filter' | 'brake' | 'suspension' | 'transmission' | 'electric' | 'oil' | 'engine' | 'other';

export interface Category {
  slug: CategorySlug;
  label: string;
  icon: CategoryIcon;
  /** Phrase d'accroche (page du catalogue filtre sur la categorie). */
  blurb: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'filtration', label: 'Filtration', icon: 'filter', blurb: "Filtres à huile, à air, à carburant et d'habitacle." },
  { slug: 'freinage', label: 'Freinage', icon: 'brake', blurb: 'Plaquettes, disques, étriers, tambours, flexibles et liquide de frein.' },
  { slug: 'suspension-direction', label: 'Suspension & direction', icon: 'suspension', blurb: 'Amortisseurs, rotules, silentblocs, biellettes, triangles et roulements de roue.' },
  { slug: 'transmission', label: 'Transmission', icon: 'transmission', blurb: 'Cardans, soufflets, embrayage, volant moteur et boîte de vitesses.' },
  { slug: 'electricite-allumage', label: 'Électricité & allumage', icon: 'electric', blurb: 'Bougies, bobines, alternateurs, démarreurs, ampoules, capteurs et relais.' },
  { slug: 'huiles-entretien', label: 'Huiles & entretien', icon: 'oil', blurb: "Huiles moteur et de boîte, liquides, lave-glace, graisses et produits d'entretien." },
  { slug: 'moteur-distribution', label: 'Moteur & distribution', icon: 'engine', blurb: 'Courroies, kits de distribution, pompes, joints, thermostats, durites et échappement.' },
  { slug: 'autres', label: 'Autres pièces', icon: 'other', blurb: 'Carrosserie, accessoires et pièces diverses.' },
];

const BY_SLUG = new Map<string, Category>(CATEGORIES.map((c) => [c.slug, c]));

export function categoryBySlug(slug: string | null | undefined): Category | null {
  return slug ? (BY_SLUG.get(slug) ?? null) : null;
}

/** Slug de la categorie d'un article : la colonne `categorie` de la base du site, a defaut deduit du nom de la piece. */
export function articleCategory(article: Pick<CatalogArticle, 'designation' | 'designation_correcte' | 'categorie'>): CategorySlug {
  if (article.categorie && BY_SLUG.has(article.categorie)) return article.categorie as CategorySlug;
  return categorySlugOfText(article.designation_correcte || article.designation || '');
}
