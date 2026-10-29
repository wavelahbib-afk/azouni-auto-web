/**
 * Recherches du catalogue SANS RESULTAT : enregistrees (terme seulement, jamais de donnee personnelle) dans la table recherches_web pour que le magasin sache quelles
 * pieces les clients cherchent sans les trouver (page "Commandes web > Recherches sans resultat" d'AZOUNI AUTO). Une seule fois par terme et par visite ; sans effet
 * si la table n'existe pas encore.
 */
const sent = new Set<string>();

export function logEmptySearch(term: string): void {
  const t = term.trim().toLowerCase().replace(/\s+/g, ' ');
  if (t.length < 3 || t.length > 80 || sent.has(t)) return;
  sent.add(t);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  fetch(`${url}/rest/v1/recherches_web`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ terme: t, nb_resultats: 0 }),
    keepalive: true,
  }).catch(() => {});
}
