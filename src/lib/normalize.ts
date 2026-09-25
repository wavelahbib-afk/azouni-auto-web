/**
 * Meme normalisation que azouni-auto/shared/references.ts::normalizeEquivalentReference :
 * majuscules + separateurs courants retires, pour que deux formats du meme
 * code ("6Q0 407 183" / "6Q0-407-183" / "6Q0407183") se matchent entre eux.
 */
export function normalizeReference(s: string): string {
  return s.trim().toUpperCase().replace(/[\s\-/._]+/g, '');
}
