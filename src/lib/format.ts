/** Meme convention d'affichage que AZOUNI AUTO (Dinar tunisien, 3 decimales). */
export function formatMoney(value: number): string {
  return `${value.toFixed(3)} DT`;
}
