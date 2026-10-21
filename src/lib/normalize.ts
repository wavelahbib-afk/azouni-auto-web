/**
 * Meme normalisation que azouni-auto/shared/references.ts::normalizeEquivalentReference :
 * majuscules, et tout ce qui n'est pas une lettre ou un chiffre est retire (espaces, tirets,
 * points, slashs, "*"...), pour que deux formats du meme code ("6Q0 407 183" / "6Q0-407-183" /
 * "6Q0407183") se matchent entre eux. Un symbole ne separe jamais deux references.
 */
export function normalizeReference(s: string): string {
  return s.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '');
}
