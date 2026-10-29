'use client';

import { useEffect, useState } from 'react';

const PAGE = 1000;
const cache = new Map<string, Set<string>>();
const inflight = new Map<string, Promise<Set<string>>>();

/**
 * Codes des articles compatibles avec un vehicule (table vehicules_articles_catalogue, lue avec la cle publique depuis le navigateur). `model` vide = tous les modeles
 * du constructeur. Resultat garde en memoire pour la visite : revenir a un vehicule deja choisi est instantane.
 */
function loadCodes(make: string, model: string): Promise<Set<string>> {
  const key = `${make}|${model}`;
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  const running = inflight.get(key);
  if (running) return running;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const promise = (async () => {
    const codes = new Set<string>();
    if (!url || !anon) return codes;
    const filter = `make=eq.${encodeURIComponent(make)}${model ? `&model=eq.${encodeURIComponent(model)}` : ''}`;
    for (let offset = 0; ; offset += PAGE) {
      const res = await fetch(`${url}/rest/v1/vehicules_articles_catalogue?select=code&${filter}&order=code&limit=${PAGE}&offset=${offset}`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      });
      if (!res.ok) break;
      const rows = (await res.json()) as { code: string }[];
      for (const r of rows) codes.add(r.code);
      if (rows.length < PAGE) break;
    }
    cache.set(key, codes);
    return codes;
  })().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Codes compatibles avec le vehicule choisi : `null` = pas de filtre de vehicule ; `loading` tant que la liste n'est pas arrivee. */
export function useVehicleCodes(make: string, model: string): { codes: Set<string> | null; loading: boolean } {
  const key = make ? `${make}|${model}` : '';
  const [loaded, setLoaded] = useState<{ key: string; codes: Set<string> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    loadCodes(make, model)
      .then((codes) => {
        if (!cancelled) setLoaded({ key, codes });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, codes: new Set() });
      });
    return () => {
      cancelled = true;
    };
  }, [key, make, model]);

  if (!key) return { codes: null, loading: false };
  if (loaded && loaded.key === key) return { codes: loaded.codes, loading: false };
  return { codes: null, loading: true };
}
