import type { SearchInterpretation } from './searchInterpret';

export type SmartSearchResult = SearchInterpretation & { url: string };

/**
 * Appelle la recherche intelligente du site (route /api/recherche) depuis le navigateur. Renvoie null si le serveur ne repond pas a temps : l'appelant fait alors la
 * recherche simple, le client n'est jamais bloque.
 */
export async function smartSearch(text: string, timeoutMs = 7000): Promise<SmartSearchResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/recherche', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as SmartSearchResult;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
