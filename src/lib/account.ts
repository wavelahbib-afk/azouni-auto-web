'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { fetchProfile, refreshSession, signOutRemote, updateProfile, type AuthResult, type Profile, type Session } from './auth';

/**
 * Etat du compte client dans ce navigateur : session (jetons Supabase, gardes dans localStorage) et profil. Meme principe que le panier (cart.tsx) :
 * un petit store externe lu par useSyncExternalStore, donc partage par toutes les pages (en-tete, panier, « Mon compte ») sans Provider.
 *
 * Le jeton d'acces vit une heure : getFreshSession() le renouvelle (jeton de renouvellement) avant chaque appel important.
 */
const STORAGE_KEY = 'pieceoz_session';

export interface AccountState {
  /** faux pendant le rendu serveur et l'hydratation : on ne sait pas encore si un client est connecte */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  profileLoading: boolean;
  /** vrai une fois le chargement du profil tente pour cette session (evite de reessayer en boucle si le profil est introuvable) */
  profileTried: boolean;
}

const SERVER_STATE: AccountState = { ready: false, session: null, profile: null, profileLoading: false, profileTried: false };

let state: AccountState = SERVER_STATE;
let initialized = false;
const listeners = new Set<() => void>();

function readSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s?.access_token && s.refresh_token && s.user?.id ? s : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // stockage bloque (navigation privee) : la connexion dure le temps de la page seulement
  }
}

function emit(next: AccountState): void {
  state = next;
  listeners.forEach((l) => l());
}

function ensureInitialized(): void {
  if (!initialized && typeof window !== 'undefined') {
    initialized = true;
    state = { ready: true, session: readSession(), profile: null, profileLoading: false, profileTried: false };
    // une autre fenetre se connecte ou se deconnecte : on suit
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY) return;
      const session = readSession();
      const same = session !== null && state.session?.user.id === session.user.id;
      emit({ ...state, session, profile: same ? state.profile : null, profileTried: same ? state.profileTried : false });
    });
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AccountState {
  ensureInitialized();
  return state;
}

function getServerSnapshot(): AccountState {
  return SERVER_STATE;
}

/** Garde la session (connexion, lien de confirmation, renouvellement) et recharge le profil. */
export function acceptSession(session: Session): void {
  ensureInitialized();
  writeSession(session);
  const same = state.session?.user.id === session.user.id;
  emit({ ready: true, session, profile: same ? state.profile : null, profileLoading: false, profileTried: false });
  void loadProfile();
}

function clearSession(): void {
  writeSession(null);
  emit({ ready: true, session: null, profile: null, profileLoading: false, profileTried: false });
}

/**
 * Session valide (jeton renouvele s'il expire dans moins d'une minute), ou null si personne n'est connecte ou si la session a ete refusee.
 * Une simple coupure reseau ne deconnecte pas : on garde la session et on rend l'ancienne.
 */
export async function getFreshSession(): Promise<Session | null> {
  ensureInitialized();
  const s = state.session;
  if (!s) return null;
  if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return s;
  const res = await refreshSession(s.refresh_token);
  if (res.ok) {
    writeSession(res.data);
    emit({ ...state, session: res.data });
    return res.data;
  }
  if (res.code === 'reseau') return s;
  clearSession();
  return null;
}

/**
 * Jeton actuel lu SANS attente (pour envoyer une commande dans le geste du clic, sinon le navigateur bloquerait l'ouverture de WhatsApp). `expiring` : il expire dans moins de
 * 30 secondes, il faut alors passer par getFreshSession().
 */
export function peekAccessToken(): { token: string | undefined; expiring: boolean } {
  ensureInitialized();
  const s = state.session;
  return { token: s?.access_token, expiring: s !== null && s.expires_at - 30 <= Math.floor(Date.now() / 1000) };
}

/** Charge le profil du client connecte (une seule requete a la fois). */
export async function loadProfile(): Promise<void> {
  ensureInitialized();
  if (!state.session || state.profileLoading) return;
  emit({ ...state, profileLoading: true });
  const session = await getFreshSession();
  if (!session) {
    emit({ ...state, profileLoading: false, profileTried: true });
    return;
  }
  const res = await fetchProfile(session);
  if (res.ok) emit({ ...state, profile: res.data, profileLoading: false, profileTried: true });
  else if (res.code === 'bad_jwt') clearSession();
  else emit({ ...state, profileLoading: false, profileTried: true });
}

export async function saveProfile(patch: { nom: string; telephone: string; adresse: string; ville: string }): Promise<AuthResult<Profile | null>> {
  const session = await getFreshSession();
  if (!session) return { ok: false, code: 'bad_jwt', message: 'Votre session a expiré. Reconnectez-vous.' };
  const res = await updateProfile(session, patch);
  if (res.ok && res.data) emit({ ...state, profile: res.data });
  return res;
}

export async function logout(): Promise<void> {
  const s = state.session;
  clearSession();
  if (s) await signOutRemote(s.access_token);
}

export function useAccount() {
  const account = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasSession = account.session !== null;
  const needsProfile = hasSession && account.profile === null && !account.profileLoading && !account.profileTried;
  useEffect(() => {
    if (needsProfile) void loadProfile();
  }, [needsProfile]);
  return {
    ...account,
    loggedIn: hasSession,
    /** remise de fidelite (%) du client connecte, 0 si aucune ou profil pas encore charge */
    remisePct: account.profile?.remise_pct ?? 0,
  };
}
