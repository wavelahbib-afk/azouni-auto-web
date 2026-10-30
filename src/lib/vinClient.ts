/**
 * Memoire des numeros de chassis, cote navigateur : demande le modele appris pour un debut de VIN, et signale le modele choisi par le client.
 * Seuls les 8 premiers caracteres du VIN (type de voiture, pas numero de serie) quittent le navigateur.
 */
export interface VinSuggestion {
  make: string;
  model: string;
  votes: number;
}

/** Modele appris des clients pour ce debut de VIN, ou null (rien appris, ou serveur injoignable). */
export async function fetchVinSuggestion(prefix: string): Promise<VinSuggestion | null> {
  try {
    const res = await fetch(`/api/vin?prefix=${encodeURIComponent(prefix)}`);
    if (!res.ok) return null;
    return ((await res.json()) as { suggestion: VinSuggestion | null }).suggestion;
  } catch {
    return null;
  }
}

/** Signale au site que ce debut de VIN correspond a ce modele (une seule fois par visite et par combinaison). Sans attente : n'ajoute aucun delai a la recherche. */
export function reportVinModel(prefix: string, make: string, model: string): void {
  const key = `azouni_vin_report:${prefix}|${make}|${model}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, '1');
  } catch {
    // stockage bloque : l'envoi se fait quand meme
  }
  fetch('/api/vin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, make, model }),
    keepalive: true,
  }).catch(() => {});
}
