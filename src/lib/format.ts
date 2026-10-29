/** Meme convention d'affichage que AZOUNI AUTO (Dinar tunisien, 3 decimales). */
export function formatMoney(value: number): string {
  return `${value.toFixed(3)} DT`;
}

/** Montant "rond" pour un texte courant : "8 DT" (frais, seuils) ; 3 decimales seulement s'il en faut. */
export function formatDt(value: number): string {
  return Number.isInteger(value) ? `${value} DT` : formatMoney(value);
}

/** Entier avec espaces insecables entre milliers ("5 778") : meme rendu partout, y compris dans les polices sans l'espace fine du francais. */
export function formatInt(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
