/**
 * Limite d'appels par visiteur (adresse IP), en memoire du serveur : protege la route de recherche contre les abus et la facture de l'IA.
 * Chaque instance du serveur compte de son cote (pas de memoire partagee) : c'est une protection de base, le vrai plafond de depense se regle chez le fournisseur d'IA.
 */
const hits = new Map<string, number[]>();

/** Vrai si l'appel est autorise (et le compte), faux si `limit` appels ont deja eu lieu pendant la derniere fenetre. */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    // nettoyage : on oublie les visiteurs sans appel recent
    for (const [k, list] of hits) if (list.every((t) => now - t >= windowMs)) hits.delete(k);
  }
  return true;
}

let daily = { day: '', count: 0 };

/** Plafond de la journee pour les appels a l'IA (tous visiteurs confondus, par instance du serveur). */
export function allowDaily(max: number): boolean {
  const day = new Date().toISOString().slice(0, 10);
  if (daily.day !== day) daily = { day, count: 0 };
  if (daily.count >= max) return false;
  daily.count += 1;
  return true;
}
