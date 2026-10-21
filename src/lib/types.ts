/**
 * Forme d'une ligne de la table Supabase "articles_catalogue" -- alimentee
 * par AZOUNI AUTO (electron/services/webSyncService.ts), jamais modifiee ici.
 * Voir supabase/schema.sql pour la definition de la table.
 */
export interface CatalogArticle {
  code: string;
  reference: string | null;
  designation: string;
  /**
   * Nom propre de la piece ("ROTULE DE DIRECTION DROITE"), calcule/valide dans AZOUNI AUTO. Absent (ou null) pour les articles pas encore corriges et tant que la base du
   * site n'a pas la colonne : on affiche alors la designation d'origine -- voir src/lib/display.ts.
   */
  designation_correcte?: string | null;
  /** Vehicules cites dans la designation d'origine ("FIESTA IV PUMA MAZDA 121"). */
  vehicules_compatibles?: string | null;
  marque: string | null;
  famille: string | null;
  sous_famille: string | null;
  prix_vente_ttc: number;
  stock_qty: number;
  rayon: string | null;
  /** URL publique de la photo (bucket Supabase "article-photos"), ou null si pas encore synchronisee -- voir webSyncService.ts. */
  photo_url: string | null;
  updated_at: string;
  /** References equivalentes/d'origine (article_equivalences_catalogue) -- absent tant que non chargees. */
  equivalences?: string[];
  /** Page d'accueil seulement : references propres + equivalentes normalisees et collees par "|" (index de recherche, plus compact que la liste). */
  refsIndex?: string;
  /** Vehicules compatibles (article_vehicle_compat_catalogue), groupes par marque -- absent tant que non charges. */
  vehicleCompat?: { make: string; models: string[] }[];
}

export interface CartLine {
  code: string;
  /** Titre affiche (designation correcte mise en forme) -- voir articleTitle() dans src/lib/display.ts. */
  designation: string;
  /** Reference de l'article, rappelee dans le message WhatsApp (absente des anciens paniers enregistres dans le navigateur). */
  reference?: string;
  marque: string | null;
  prix_vente_ttc: number;
  qty: number;
}
