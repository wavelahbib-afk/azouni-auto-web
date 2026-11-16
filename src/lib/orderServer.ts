/**
 * « Porte » serveur des commandes du site (route POST /api/commande). Ce que le navigateur envoie n'est JAMAIS cru :
 *   1. limite d'appels par visiteur et par numero de telephone ;
 *   2. anti-robot Cloudflare Turnstile verifie cote serveur (si la cle secrete est configuree) ;
 *   3. compte du client verifie aupres de Supabase Auth (jeton Bearer) -> sa remise de fidelite est LUE dans la base, pas dans la requete ;
 *   4. prix recalcules depuis le catalogue (articles_catalogue) : le navigateur n'envoie que des codes et des quantites ;
 *   5. enregistrement dans commandes_web avec la cle service_role, qui n'existe que sur le serveur (variable privee Vercel SUPABASE_SERVICE_ROLE_KEY).
 *
 * Quand la cle service_role n'est pas configuree, la porte repond « non_configure » (503) et le site reprend son ancien fonctionnement (enregistrement direct avec la
 * cle publique) : rien ne casse pendant la mise en place. Une fois la porte en service, supabase/durcir_commandes.sql ferme l'ancien chemin.
 *
 * Module sans dependance a Next.js : l'environnement et fetch sont passes en parametres pour pouvoir le tester.
 */
import type { CatalogArticle } from './types';
import { articleRef, articleTitle, effectivePrice, hasPrice } from './display';
import { cleanPercent, finalUnitPrice } from './loyalty';
import { deliveryFee } from './shop';
import { normalizePhone, orderNote } from './orders';
import { isValidVinFormat, normalizeVin } from './vin';
import { allow } from './rateLimit';

export interface OrderEnv {
  supabaseUrl?: string;
  anonKey?: string;
  serviceKey?: string;
  turnstileSecret?: string;
}

export interface OrderContext {
  ip: string;
  /** en-tete Authorization de la requete (« Bearer <jeton> ») si le client est connecte */
  authorization: string | null;
  env: OrderEnv;
  fetchFn?: typeof fetch;
}

export interface OrderLineOut {
  code: string;
  designation: string;
  reference: string | null;
  marque: string | null;
  prix: number;
  qty: number;
}

export type OrderOutcome =
  | {
      status: 200;
      body: { ok: true; ref: string; lignes: OrderLineOut[]; sous_total: number; frais_livraison: number; total: number; remise_pct: number; remise_montant: number; compte: boolean };
    }
  | { status: 400 | 401 | 403 | 409 | 413 | 429 | 500 | 502 | 503; body: { ok: false; erreur: string; message: string; codes?: string[] } };

const REF_RE = /^[A-HJKMNP-Z2-9]{4,12}$/;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const clean = (s: unknown, max: number): string => (typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

const error = (status: Exclude<OrderOutcome['status'], 200>, erreur: string, message: string, codes?: string[]): OrderOutcome => ({
  status,
  body: { ok: false, erreur, message, ...(codes ? { codes } : {}) },
});

interface ParsedOrder {
  ref: string;
  name: string;
  phone: string;
  mode: 'retrait' | 'livraison';
  address: string;
  city: string;
  vin: string;
  note: string;
  lines: { code: string; qty: number }[];
  captchaToken: string;
}

/** Lit et valide la requete ; retourne la commande propre, ou le message d'erreur a renvoyer. */
export function parseOrderRequest(input: unknown): { ok: true; order: ParsedOrder } | { ok: false; message: string } {
  if (typeof input !== 'object' || input === null) return { ok: false, message: 'Demande illisible.' };
  const b = input as Record<string, unknown>;
  const ref = clean(b.ref, 12).toUpperCase();
  if (!REF_RE.test(ref)) return { ok: false, message: 'Référence de commande invalide.' };
  const name = clean(b.name, 120);
  if (name.length < 2) return { ok: false, message: 'Indiquez votre nom.' };
  const phone = normalizePhone(clean(b.phone, 30));
  if (!phone) return { ok: false, message: 'Indiquez un numéro de téléphone valide (8 chiffres).' };
  const mode = b.mode === 'livraison' ? 'livraison' : b.mode === 'retrait' ? 'retrait' : null;
  if (!mode) return { ok: false, message: 'Choisissez retrait au magasin ou livraison.' };
  const address = clean(b.address, 300);
  const city = clean(b.city, 100);
  if (mode === 'livraison' && (city.length < 2 || address.length < 5)) return { ok: false, message: 'Indiquez votre ville et votre adresse de livraison.' };
  const vinRaw = clean(b.vin, 40);
  if (vinRaw && !isValidVinFormat(normalizeVin(vinRaw))) return { ok: false, message: 'Numéro de châssis (VIN) invalide.' };
  const note = clean(b.note, 400);

  if (!Array.isArray(b.lignes) || b.lignes.length < 1 || b.lignes.length > 100) return { ok: false, message: 'Votre panier est vide ou trop grand.' };
  const byCode = new Map<string, number>();
  for (const raw of b.lignes) {
    const l = raw as { code?: unknown; qty?: unknown };
    const code = typeof l?.code === 'string' ? l.code.trim() : '';
    const qty = Number(l?.qty);
    if (!code || code.length > 80 || !Number.isInteger(qty) || qty < 1 || qty > 999) return { ok: false, message: 'Une ligne du panier est invalide.' };
    byCode.set(code, (byCode.get(code) ?? 0) + qty);
  }
  const lines = Array.from(byCode, ([code, qty]) => ({ code, qty: Math.min(qty, 999) }));
  return { ok: true, order: { ref, name, phone, mode, address, city, vin: vinRaw, note, lines, captchaToken: clean(b.captcha_token, 4096) } };
}

/** Valeur d'un filtre PostgREST `in.(...)` : chaque code entre guillemets (virgules, parentheses et guillemets dans un code ne cassent rien). */
export function inFilter(codes: string[]): string {
  return `in.(${codes.map((c) => `"${c.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
}

type CatalogRow = Pick<CatalogArticle, 'code' | 'reference' | 'designation' | 'designation_correcte' | 'marque' | 'prix_vente_ttc' | 'prix_promo'>;

export interface PricedOrder {
  lignes: OrderLineOut[];
  sous_total: number;
  frais_livraison: number;
  total: number;
  remise_pct: number;
  remise_montant: number;
}

/**
 * Prix de la commande a partir du catalogue et de la remise du compte : prix unitaire = meilleur de (prix du moment, prix de fidelite), jamais cumules ; livraison offerte
 * des que le sous-total REMISE atteint le seuil. `remise_pct` n'est enregistree que si la fidelite a vraiment fait baisser le prix (sinon la promotion etait meilleure).
 */
export function priceOrder(lines: { code: string; qty: number }[], catalogue: Map<string, CatalogRow>, percent: number, mode: 'retrait' | 'livraison'): { ok: true; priced: PricedOrder } | { ok: false; unknown: string[] } {
  const unknown: string[] = [];
  const out: OrderLineOut[] = [];
  let subtotal = 0;
  let saving = 0;
  for (const l of lines) {
    const row = catalogue.get(l.code);
    if (!row || !hasPrice(row)) {
      unknown.push(l.code);
      continue;
    }
    const effective = effectivePrice(row);
    const unit = finalUnitPrice(row.prix_vente_ttc, effective, percent);
    subtotal += unit * l.qty;
    saving += (effective - unit) * l.qty;
    out.push({ code: row.code, designation: articleTitle(row), reference: articleRef(row), marque: row.marque ?? null, prix: round3(unit), qty: l.qty });
  }
  if (unknown.length > 0) return { ok: false, unknown };
  const sous_total = round3(subtotal);
  const frais_livraison = mode === 'livraison' ? deliveryFee(sous_total) : 0;
  const remise_montant = round3(saving);
  return { ok: true, priced: { lignes: out, sous_total, frais_livraison, total: round3(sous_total + frais_livraison), remise_pct: remise_montant > 0 ? cleanPercent(percent) : 0, remise_montant } };
}

/** Verifie le jeton Turnstile aupres de Cloudflare. Faux si le jeton est absent, refuse ou si Cloudflare ne repond pas (dans le doute, on refuse). */
async function turnstileOk(secret: string, token: string, ip: string, fetchFn: typeof fetch): Promise<boolean> {
  if (!token) return false;
  try {
    const form = new URLSearchParams({ secret, response: token });
    if (ip && ip !== 'local') form.set('remoteip', ip);
    const res = await fetchFn('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return false;
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

interface AuthedAccount {
  id: string;
  email: string;
  percent: number;
  /** faux si le profil (table comptes_clients) est introuvable : la commande n'est alors pas rattachee au compte (cle etrangere) mais garde l'e-mail */
  hasProfile: boolean;
}

/** Compte du client d'apres son jeton (verifie aupres de Supabase Auth), avec sa remise lue dans la base. null = jeton refuse. */
async function accountFromToken(token: string, env: Required<Pick<OrderEnv, 'supabaseUrl' | 'anonKey' | 'serviceKey'>>, fetchFn: typeof fetch): Promise<AuthedAccount | 'invalid' | 'unavailable'> {
  try {
    const res = await fetchFn(`${env.supabaseUrl}/auth/v1/user`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) return 'invalid';
    if (!res.ok) return 'unavailable';
    const user = (await res.json()) as { id?: string; email?: string; email_confirmed_at?: string | null };
    if (!user.id || !user.email_confirmed_at) return 'invalid';
    const p = await fetchFn(`${env.supabaseUrl}/rest/v1/comptes_clients?select=remise_pct&id=eq.${encodeURIComponent(user.id)}`, {
      headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    // profil illisible ou absent (table pas encore creee...) : le client commande quand meme, sans remise
    const rows = p.ok ? ((await p.json()) as { remise_pct?: number }[]) : [];
    return { id: user.id, email: user.email ?? '', percent: cleanPercent(rows[0]?.remise_pct), hasProfile: rows.length > 0 };
  } catch {
    return 'unavailable';
  }
}

export async function processOrder(input: unknown, ctx: OrderContext): Promise<OrderOutcome> {
  const { env } = ctx;
  const fetchFn = ctx.fetchFn ?? fetch;
  if (!env.supabaseUrl || !env.anonKey || !env.serviceKey) return error(503, 'non_configure', "L'enregistrement sécurisé des commandes n'est pas encore configuré.");

  if (!allow(`commande:${ctx.ip}`, 8, 10 * 60_000)) return error(429, 'trop_de_commandes', 'Trop de commandes depuis cette connexion. Réessayez dans quelques minutes, ou appelez le magasin.');

  const parsed = parseOrderRequest(input);
  if (!parsed.ok) return error(400, 'invalide', parsed.message);
  const order = parsed.order;
  if (!allow(`commande-tel:${order.phone}`, 5, 60 * 60_000)) return error(429, 'trop_de_commandes', 'Trop de commandes avec ce numéro. Appelez le magasin.');

  if (env.turnstileSecret && !(await turnstileOk(env.turnstileSecret, order.captchaToken, ctx.ip, fetchFn))) {
    return error(403, 'captcha', "La vérification anti-robot a échoué. Rechargez la page et réessayez, ou appelez le magasin.");
  }

  const url = env.supabaseUrl;
  const scoped = { supabaseUrl: url, anonKey: env.anonKey, serviceKey: env.serviceKey };

  // compte : jeton verifie, remise lue dans la base
  let account: AuthedAccount | null = null;
  const bearer = ctx.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (bearer) {
    const found = await accountFromToken(bearer, scoped, fetchFn);
    if (found === 'invalid') return error(401, 'session', 'Votre session a expiré. Reconnectez-vous, ou déconnectez-vous pour commander sans compte.');
    if (found === 'unavailable') return error(502, 'compte_indisponible', 'Impossible de vérifier votre compte pour le moment. Réessayez dans un instant.');
    account = found;
  }

  // prix du catalogue (lecture publique)
  let catalogue: Map<string, CatalogRow>;
  try {
    const codes = order.lines.map((l) => l.code);
    const res = await fetchFn(`${url}/rest/v1/articles_catalogue?select=code,reference,designation,designation_correcte,marque,prix_vente_ttc,prix_promo&code=${encodeURIComponent(inFilter(codes))}`, {
      headers: { apikey: env.anonKey, Authorization: `Bearer ${env.anonKey}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return error(502, 'catalogue', 'Impossible de lire le catalogue pour le moment. Réessayez dans un instant.');
    catalogue = new Map(((await res.json()) as CatalogRow[]).map((r) => [r.code, r]));
  } catch {
    return error(502, 'catalogue', 'Impossible de lire le catalogue pour le moment. Réessayez dans un instant.');
  }

  const priced = priceOrder(order.lines, catalogue, account?.percent ?? 0, order.mode);
  if (!priced.ok) return error(409, 'article_inconnu', "Une pièce de votre panier n'est plus au catalogue. Retirez-la du panier et recommencez.", priced.unknown);
  const p = priced.priced;

  try {
    const res = await fetchFn(`${url}/rest/v1/commandes_web`, {
      method: 'POST',
      headers: { apikey: env.serviceKey, Authorization: `Bearer ${env.serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        ref: order.ref,
        nom: order.name,
        telephone: order.phone,
        mode: order.mode,
        adresse: order.mode === 'livraison' ? order.address : null,
        ville: order.mode === 'livraison' ? order.city : null,
        note: orderNote({ name: order.name, phone: order.phone, mode: order.mode, address: order.address, city: order.city, vin: order.vin, note: order.note }),
        sous_total: p.sous_total,
        frais_livraison: p.frais_livraison,
        total: p.total,
        lignes: p.lignes,
        compte_id: account?.hasProfile ? account.id : null,
        email: account?.email ?? null,
        remise_pct: p.remise_pct,
        remise_montant: p.remise_montant,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('[commande] enregistrement refuse:', res.status, await res.text().catch(() => ''));
      return error(500, 'enregistrement', "La commande n'a pas pu être enregistrée.");
    }
  } catch (err) {
    console.error('[commande] enregistrement echoue:', err);
    return error(500, 'enregistrement', "La commande n'a pas pu être enregistrée.");
  }

  return { status: 200, body: { ok: true, ref: order.ref, ...p, compte: account?.hasProfile === true } };
}
