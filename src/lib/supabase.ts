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
