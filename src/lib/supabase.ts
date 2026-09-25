const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Appel direct a l'API REST de Supabase (PostgREST), en fetch() natif --
 * PAS le SDK @supabase/supabase-js : ce dernier initialise systematiquement
 * un client Realtime (WebSocket) des sa construction, qui plante au demarrage
 * sur les runtimes Node sans WebSocket natif (Node 20, utilise par Vercel par
 * defaut) avec "Node.js 20 detected without native WebSocket support" --
 * inutile ici, on ne fait que des lectures ponctuelles, pas de temps reel.
 *
 * `path` est le chemin + query PostgREST apres "/rest/v1/", ex.
 * "articles_catalogue?select=*&order=designation".
 */
export async function supabaseRest(path: string, revalidateSeconds = 300): Promise<unknown[] | null> {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      next: { revalidate: revalidateSeconds },
    });
    if (!res.ok) {
      console.error('[supabase] erreur REST:', res.status, await res.text().catch(() => ''));
      return null;
    }
    return (await res.json()) as unknown[];
  } catch (err) {
    console.error('[supabase] fetch echoue:', err);
    return null;
  }
}

const PAGE_SIZE = 1000; // limite par defaut de l'API REST Supabase (max-rows) : on pagine pour tout recuperer.

/**
 * Comme supabaseRest, mais recupere TOUTES les lignes en paginant (le
 * catalogue peut depasser 1000 articles). La pagination passe par
 * offset/limit DANS L'URL (pas l'en-tete Range) : le cache de fetch() de
 * Next.js/Vercel identifie une requete par son URL, et deux appels a la
 * meme URL avec seulement un en-tete Range different se voyaient renvoyer
 * la meme reponse mise en cache -- offset/limit dans l'URL rend chaque page
 * une requete distincte sans ambiguite.
 */
export async function supabaseRestAll(path: string, revalidateSeconds = 300): Promise<unknown[]> {
  if (!supabaseUrl || !supabaseAnonKey) return [];
  const separator = path.includes('?') ? '&' : '?';
  const all: unknown[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${path}${separator}limit=${PAGE_SIZE}&offset=${offset}`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        next: { revalidate: revalidateSeconds },
      });
      if (!res.ok) {
        console.error('[supabase] erreur REST (page):', res.status, await res.text().catch(() => ''));
        break;
      }
      const page = (await res.json()) as unknown[];
      all.push(...page);
      if (page.length < PAGE_SIZE) break; // derniere page
    } catch (err) {
      console.error('[supabase] fetch echoue (page):', err);
      break;
    }
  }
  return all;
}
