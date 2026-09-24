import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Client cote navigateur/serveur Next.js, avec la cle publique "anon" (lecture
 * seule sur articles_catalogue, voir supabase/schema.sql). Jamais la cle
 * service_role : celle-ci reste uniquement dans AZOUNI AUTO (poste de
 * caisse), qui est la seule a ecrire dans cette table.
 *
 * `null` tant que les variables d'environnement ne sont pas renseignees (voir
 * .env.example) -- createClient() leve sinon une exception au chargement du
 * module, meme si l'appelant compte ne jamais l'utiliser.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
