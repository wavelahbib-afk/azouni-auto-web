import { supabaseRestAll } from './supabase';
import { getVehicleIndex } from './catalogue-data';
import { groupVehicles } from './vehicles';
import { buildLexicon, type SearchLexicon } from './searchInterpret';
import type { CatalogArticle } from './types';

/**
 * Lexique de la recherche intelligente (voitures du site + mots des titres d'articles), construit cote serveur et garde en memoire dix minutes.
 * Les donnees viennent des memes lectures Supabase (mises en cache par Next.js) que le reste du site.
 */
const TTL_MS = 10 * 60 * 1000;
let cached: { at: number; lexicon: SearchLexicon } | null = null;
let building: Promise<SearchLexicon> | null = null;

async function build(): Promise<SearchLexicon> {
  const [rows, vehicleRows] = await Promise.all([
    supabaseRestAll('articles_catalogue?select=*&order=code', 3600) as Promise<CatalogArticle[]>,
    getVehicleIndex(),
  ]);
  const titles = rows.map((a) => `${a.designation_correcte ?? ''} ${a.designation ?? ''} ${a.vehicules_compatibles ?? ''} ${a.marque ?? ''}`);
  return buildLexicon(groupVehicles(vehicleRows), titles);
}

export async function getSearchLexicon(): Promise<SearchLexicon> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.lexicon;
  building ??= build()
    .then((lexicon) => {
      cached = { at: Date.now(), lexicon };
      return lexicon;
    })
    .finally(() => {
      building = null;
    });
  return building;
}
