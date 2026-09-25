/**
 * Forme d'une ligne de la table Supabase "articles_catalogue" -- alimentee
 * par AZOUNI AUTO (electron/services/webSyncService.ts), jamais modifiee ici.
 * Voir supabase/schema.sql pour la definition de la table.
 */
export interface CatalogArticle {
  code: string;
  reference: string | null;
  designation: string;
  marque: string | null;
  famille: string | null;
  sous_famille: string | null;
  prix_vente_ttc: number;
  stock_qty: number;
  rayon: string | null;
  updated_at: string;
  /** References equivalentes/d'origine (article_equivalences_catalogue) -- absent tant que non chargees. */
  equivalences?: string[];
}

export interface CartLine {
  code: string;
  designation: string;
  marque: string | null;
  prix_vente_ttc: number;
  qty: number;
}
