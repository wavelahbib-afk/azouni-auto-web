import { cache } from 'react';
import { supabaseRest, supabaseRestAll, fetchEquivalencesByCode } from './supabase';
import type { CatalogArticle, VehicleIndexRow } from './types';
import { normalizeReference } from './normalize';
import { articleCategory } from './categories';

/** Les donnees viennent de la synchro AZOUNI AUTO : 5 minutes de cache suffisent (voir supabaseRest). */
export const CATALOGUE_REVALIDATE = 300;

/**
 * Tout le catalogue (articles en stock, deja filtres par la synchro), mis en forme pour le navigateur : seul ce que le catalogue affiche ou cherche part vers le
 * client (pas l'emplacement de rayon, ni la date de mise a jour) ; les references d'origine (92 000 lignes) ne partent que sous forme d'index de recherche compact.
 * `select=*` : le site continue de fonctionner meme si la base n'a pas encore les colonnes ajoutees plus tard (designation_correcte, categorie, en_vedette, prix_promo).
 * cache() : l'accueil, le catalogue et le plan du site lisent les memes donnees sans les recharger.
 */
export const getCatalogue = cache(async (): Promise<CatalogArticle[]> => {
  const [data, equivByCode] = await Promise.all([
    supabaseRestAll('articles_catalogue?select=*&order=designation', CATALOGUE_REVALIDATE),
    fetchEquivalencesByCode(CATALOGUE_REVALIDATE),
  ]);
  return (data as CatalogArticle[]).map((a) => ({
    code: a.code,
    reference: a.reference,
    designation: a.designation,
    designation_correcte: a.designation_correcte ?? null,
    vehicules_compatibles: a.vehicules_compatibles ?? null,
    marque: a.marque,
    famille: a.famille,
    sous_famille: a.sous_famille,
    prix_vente_ttc: a.prix_vente_ttc,
    stock_qty: a.stock_qty,
    photo_url: a.photo_url,
    categorie: articleCategory(a),
    en_vedette: a.en_vedette ?? false,
    prix_promo: a.prix_promo ?? null,
    refsIndex: [a.reference ?? '', a.code, ...(equivByCode.get(a.code) ?? [])].map(normalizeReference).join('|'),
  })) as CatalogArticle[];
});

/**
 * Constructeurs et modeles pour le selecteur de vehicule (table vehicules_catalogue, alimentee par la synchro). Vide tant que la table n'existe pas ou n'a pas ete
 * synchronisee : le selecteur est alors simplement masque.
 */
export const getVehicleIndex = cache(async (): Promise<VehicleIndexRow[]> => {
  const rows = (await supabaseRestAll('vehicules_catalogue?select=make,model,nb&order=make,model', 3600)) as VehicleIndexRow[];
  return rows.filter((r) => r.make && r.model);
});

/** Y a-t-il au moins un article en promotion ? (affiche ou masque le lien "Promotions" du menu). Faux si la colonne prix_promo n'existe pas encore. */
export const hasPromotions = cache(async (): Promise<boolean> => {
  const rows = await supabaseRest('articles_catalogue?select=code&prix_promo=gt.0&limit=1', CATALOGUE_REVALIDATE);
  return Array.isArray(rows) && rows.length > 0;
});
