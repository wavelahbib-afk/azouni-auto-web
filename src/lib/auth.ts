/**
 * Comptes clients : appels directs a l'API d'authentification de Supabase (GoTrue) et a l'API REST, en fetch() natif -- comme le reste du site, PAS le SDK
 * @supabase/supabase-js (voir supabase.ts). Seule la cle publique (anon) est utilisee ici : la cle service_role n'existe que cote serveur (src/lib/orderServer.ts).
 *
 * Le compte (e-mail, mot de passe, liens de confirmation) est gere par Supabase Auth ; le profil (nom, telephone, adresse, remise de fidelite) est dans la table
 * comptes_clients, protegee par Row Level Security : un client ne lit et ne modifie que SON profil, jamais sa remise (voir supabase/ajout_comptes_clients.sql).
 */
import { normalizePhone } from './orders';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Faux tant que la base du site n'est pas configuree : la page « Mon compte » dit alors que les comptes ne sont pas encore ouverts. */
export const authConfigured = Boolean(SUPABASE_URL && ANON_KEY);

export interface AuthUser {
  id: string;
  email: string;
}

export interface Session {
  access_token: string;
  refresh_token: string;
  /** secondes depuis 1970 */
  expires_at: number;
  user: AuthUser;
}

export interface Profile {
  id: string;
  email: string;
  nom: string;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
  /** remise de fidelite en % -- fixee par le magasin, en lecture seule ici */
  remise_pct: number;
  email_confirme: boolean;
}

export interface MyOrder {
  ref: string;
  created_at: string;
  statut: 'nouvelle' | 'confirmee' | 'livree' | 'annulee';
  mode: 'retrait' | 'livraison';
  total: number;
  remise_pct: number;
  remise_montant: number;
  lignes: { code: string; designation: string; reference: string | null; marque: string | null; prix: number; qty: number }[];
}

export type AuthResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

const fail = <T>(code: string, message: string): AuthResult<T> => ({ ok: false, code, message });

/** Message en francais pour un code d'erreur de Supabase Auth (les messages d'origine sont en anglais). */
export function frenchAuthError(code: string | undefined, status: number): string {
  switch (code) {
    case 'invalid_credentials':
      return 'E-mail ou mot de passe incorrect.';
    case 'email_not_confirmed':
      return "Cette adresse n'est pas encore confirmée. Ouvrez l'e-mail de confirmation reçu, ou demandez-en un nouveau ci-dessous.";
    case 'user_already_exists':
    case 'email_exists':
      return 'Un compte existe déjà avec cette adresse e-mail. Connectez-vous, ou utilisez « Mot de passe oublié ».';
    case 'weak_password':
      return 'Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.';
    case 'same_password':
      return "Choisissez un mot de passe différent de l'ancien.";
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
    case 'over_sms_send_rate_limit':
      return 'Trop de demandes pour le moment. Réessayez dans quelques minutes.';
    case 'captcha_failed':
      return "La vérification anti-robot a échoué. Rechargez la page et réessayez.";
    case 'validation_failed':
    case 'email_address_invalid':
      return 'Adresse e-mail invalide.';
    case 'otp_expired':
    case 'flow_state_expired':
    case 'bad_jwt':
      return 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'Les inscriptions sont fermées pour le moment.';
    case 'user_banned':
      return "Ce compte est suspendu. Contactez le magasin.";
    default:
      return status === 429 ? 'Trop de demandes pour le moment. Réessayez dans quelques minutes.' : "Une erreur est survenue. Réessayez, ou contactez le magasin.";
  }
}

interface CallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
  token?: string;
  prefer?: string;
}

/** Appel d'une route de l'API de Supabase ; ne leve jamais d'exception (erreur reseau = resultat en echec). */
async function call<T>(path: string, { method = 'GET', body, token, prefer }: CallOptions = {}): Promise<AuthResult<T>> {
  if (!SUPABASE_URL || !ANON_KEY) return fail('non_configure', 'Les comptes clients ne sont pas encore ouverts sur ce site.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      method,
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token ?? ANON_KEY}`,
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(prefer ? { Prefer: prefer } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }
    if (!res.ok) {
      const e = (json ?? {}) as { error_code?: string; code?: string | number; msg?: string; message?: string };
      // 401 = jeton refuse (expire, invalide) : l'API REST le dit avec un code PGRST30x, GoTrue avec bad_jwt -- dans tous les cas la session n'est plus valable
      const code = res.status === 401 ? 'bad_jwt' : (e.error_code ?? (typeof e.code === 'string' ? e.code : undefined) ?? 'erreur');
      return fail(code, frenchAuthError(code, res.status));
    }
    return { ok: true, data: json as T };
  } catch {
    return fail('reseau', 'Connexion impossible. Vérifiez votre connexion Internet et réessayez.');
  } finally {
    clearTimeout(timer);
  }
}

interface RawSession {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  user?: { id?: string; email?: string };
}

function toSession(raw: RawSession | null): Session | null {
  if (!raw?.access_token || !raw.refresh_token || !raw.user?.id) return null;
  const expiresAt = raw.expires_at ?? Math.floor(Date.now() / 1000) + (raw.expires_in ?? 3600);
  return { access_token: raw.access_token, refresh_token: raw.refresh_token, expires_at: expiresAt, user: { id: raw.user.id, email: raw.user.email ?? '' } };
}

const securityMeta = (captchaToken?: string) => (captchaToken ? { gotrue_meta_security: { captcha_token: captchaToken } } : {});

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const MIN_PASSWORD = 8;

/**
 * Inscription. Avec la confirmation par e-mail (reglage de Supabase), aucune session n'est ouverte : `confirmationSent` est vrai et le client doit cliquer sur le lien recu.
 * (Si Supabase confirme automatiquement, la session est ouverte directement.)
 */
export async function signUp(input: { email: string; password: string; nom: string; telephone: string; captchaToken?: string }): Promise<AuthResult<{ session: Session | null }>> {
  const res = await call<RawSession & { id?: string }>('/auth/v1/signup', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      data: { nom: input.nom.trim(), telephone: normalizePhone(input.telephone) ?? '' },
      ...securityMeta(input.captchaToken),
    },
  });
  if (!res.ok) return res;
  return { ok: true, data: { session: toSession(res.data) } };
}

export async function signIn(email: string, password: string, captchaToken?: string): Promise<AuthResult<Session>> {
  const res = await call<RawSession>('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email: email.trim().toLowerCase(), password, ...securityMeta(captchaToken) },
  });
  if (!res.ok) return res;
  const session = toSession(res.data);
  return session ? { ok: true, data: session } : fail('erreur', frenchAuthError(undefined, 500));
}

export async function refreshSession(refreshToken: string): Promise<AuthResult<Session>> {
  const res = await call<RawSession>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: refreshToken } });
  if (!res.ok) return res;
  const session = toSession(res.data);
  return session ? { ok: true, data: session } : fail('erreur', frenchAuthError(undefined, 500));
}

/** Lien recu par e-mail : `type` = 'signup' (confirmation) ou 'recovery' (mot de passe oublie). Ouvre une session. */
export async function verifyEmailLink(tokenHash: string, type: 'signup' | 'recovery' | 'email'): Promise<AuthResult<Session>> {
  const res = await call<RawSession>('/auth/v1/verify', { method: 'POST', body: { type, token_hash: tokenHash } });
  if (!res.ok) return res;
  const session = toSession(res.data);
  return session ? { ok: true, data: session } : fail('erreur', frenchAuthError(undefined, 500));
}

export async function resendConfirmation(email: string, captchaToken?: string): Promise<AuthResult<null>> {
  const res = await call<unknown>('/auth/v1/resend', { method: 'POST', body: { type: 'signup', email: email.trim().toLowerCase(), ...securityMeta(captchaToken) } });
  return res.ok ? { ok: true, data: null } : res;
}

export async function requestPasswordReset(email: string, captchaToken?: string): Promise<AuthResult<null>> {
  const res = await call<unknown>('/auth/v1/recover', { method: 'POST', body: { email: email.trim().toLowerCase(), ...securityMeta(captchaToken) } });
  return res.ok ? { ok: true, data: null } : res;
}

export async function changePassword(accessToken: string, password: string): Promise<AuthResult<null>> {
  const res = await call<unknown>('/auth/v1/user', { method: 'PUT', token: accessToken, body: { password } });
  return res.ok ? { ok: true, data: null } : res;
}

export async function signOutRemote(accessToken: string): Promise<void> {
  await call<unknown>('/auth/v1/logout', { method: 'POST', token: accessToken });
}

const PROFILE_COLUMNS = 'id,email,nom,telephone,adresse,ville,remise_pct,email_confirme';

/** Profil du client connecte (null si la table n'existe pas encore ou si le profil est introuvable). */
export async function fetchProfile(session: Session): Promise<AuthResult<Profile | null>> {
  const res = await call<Profile[]>(`/rest/v1/comptes_clients?select=${PROFILE_COLUMNS}&id=eq.${encodeURIComponent(session.user.id)}`, { token: session.access_token });
  if (!res.ok) return res;
  const row = Array.isArray(res.data) ? res.data[0] : null;
  return { ok: true, data: row ? { ...row, remise_pct: Number(row.remise_pct) || 0 } : null };
}

/** Met a jour nom, telephone, adresse, ville -- les seules colonnes que la base laisse modifier au client (la remise n'en fait pas partie). */
export async function updateProfile(session: Session, patch: { nom: string; telephone: string; adresse: string; ville: string }): Promise<AuthResult<Profile | null>> {
  const phone = patch.telephone.trim() ? normalizePhone(patch.telephone) : null;
  if (patch.telephone.trim() && !phone) return fail('telephone', 'Téléphone invalide : 8 chiffres attendus.');
  const res = await call<Profile[]>(`/rest/v1/comptes_clients?id=eq.${encodeURIComponent(session.user.id)}&select=${PROFILE_COLUMNS}`, {
    method: 'PATCH',
    token: session.access_token,
    prefer: 'return=representation',
    body: { nom: patch.nom.trim().slice(0, 120), telephone: phone, adresse: patch.adresse.trim().slice(0, 300) || null, ville: patch.ville.trim().slice(0, 100) || null },
  });
  if (!res.ok) return res;
  const row = Array.isArray(res.data) ? res.data[0] : null;
  return { ok: true, data: row ? { ...row, remise_pct: Number(row.remise_pct) || 0 } : null };
}

/** Commandes du client connecte (les plus recentes d'abord) : la base ne renvoie que les siennes. */
export async function fetchMyOrders(session: Session): Promise<AuthResult<MyOrder[]>> {
  const res = await call<MyOrder[]>('/rest/v1/commandes_web?select=ref,created_at,statut,mode,total,remise_pct,remise_montant,lignes&order=created_at.desc&limit=50', { token: session.access_token });
  return res.ok ? { ok: true, data: Array.isArray(res.data) ? res.data : [] } : res;
}
