/**
 * Memoire des numeros de chassis (cote serveur) : "ces 8 premiers caracteres de VIN = ce modele de voiture", appris des clients du site.
 * Tables creees par supabase/ajout_vin_appris.sql : la vue vin_modeles_appris (lecture) et la table vin_associations (ajout seulement). Sans elles, rien ne casse :
 * il n'y a simplement pas de suggestion.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Un modele n'est propose que si au moins 2 clients l'ont choisi pour ce debut de VIN et que 60 % au moins des choix sont les memes. */
const MIN_VOTES = 2;
const MIN_SHARE = 0.6;

export interface VinSuggestion {
  make: string;
  model: string;
  votes: number;
}

/** Modele le plus probable pour un debut de VIN (8 caracteres), ou null. */
export async function getVinSuggestion(prefix: string): Promise<VinSuggestion | null> {
  if (!url || !key) return null;
  try {
    const res = await fetch(`${url}/rest/v1/vin_modeles_appris?select=make,model,votes&prefix=eq.${encodeURIComponent(prefix)}&order=votes.desc&limit=5`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store', // requete tres legere et appelee seulement quand un client donne son VIN : toujours a jour
    });
    if (!res.ok) return null; // table absente (script pas encore execute) ou erreur : pas de suggestion
    const rows = (await res.json()) as VinSuggestion[];
    const total = rows.reduce((sum, r) => sum + r.votes, 0);
    const top = rows[0];
    return top && total >= MIN_VOTES && top.votes / total >= MIN_SHARE ? top : null;
  } catch {
    return null;
  }
}

/** Enregistre le choix d'un client (ajout seulement). Retourne vrai si la base l'a accepte. */
export async function recordVinAssociation(prefix: string, make: string, model: string): Promise<boolean> {
  if (!url || !key) return false;
  try {
    const res = await fetch(`${url}/rest/v1/vin_associations`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ prefix, make, model }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
