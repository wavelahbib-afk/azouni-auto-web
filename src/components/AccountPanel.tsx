'use client';

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { BadgePercent, CheckCircle2, Loader2, LogOut, MailCheck, PackageSearch, UserRound } from 'lucide-react';
import { acceptSession, getFreshSession, logout, saveProfile, useAccount } from '@/lib/account';
import {
  authConfigured,
  changePassword,
  EMAIL_RE,
  fetchMyOrders,
  MIN_PASSWORD,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signUp,
  type MyOrder,
  type Profile,
} from '@/lib/auth';
import { formatMoney } from '@/lib/format';
import { normalizePhone } from '@/lib/orders';
import { SHOP } from '@/lib/shop';
import { Captcha, captchaEnabled } from '@/components/Captcha';

const inputClass =
  'w-full border border-slate-300 rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';
const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded bg-brand text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-brand-light disabled:opacity-60 transition-colors';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {hint && <span className="font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Notice({ tone, children }: { tone: 'error' | 'ok' | 'info'; children: ReactNode }) {
  const style = tone === 'error' ? 'text-red-700 bg-red-50' : tone === 'ok' ? 'text-green-700 bg-green-50' : 'text-slate-600 bg-slate-50';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`text-sm rounded-lg px-3 py-2 ${style}`}>
      {children}
    </p>
  );
}

type Mode = 'connexion' | 'inscription' | 'oubli';

/** Page « Mon compte » : formulaires (connexion, inscription, mot de passe oublie) quand personne n'est connecte, sinon profil et historique des commandes. */
export function AccountPanel() {
  const account = useAccount();

  if (!account.ready) return <p className="py-16 text-center text-sm text-slate-400">Chargement…</p>;
  if (!authConfigured) return <Notice tone="info">Les comptes clients ne sont pas encore ouverts sur ce site. Vous pouvez commander sans compte : le panier reste disponible.</Notice>;
  if (!account.loggedIn) return <AuthForms />;
  if (!account.profile) {
    return account.profileTried ? (
      <Notice tone="error">Votre profil est momentanément indisponible. Rechargez la page dans un instant.</Notice>
    ) : (
      <p className="py-16 text-center text-sm text-slate-400">Chargement de votre compte…</p>
    );
  }
  return <Dashboard key={account.profile.id} profile={account.profile} />;
}

/* ---------------------------------------------------------------- connexion / inscription / mot de passe oublie */

function AuthForms() {
  const [mode, setMode] = useState<Mode>('connexion');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [nom, setNom] = useState('');
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setSentTo(null);
    setUnconfirmed(false);
  }

  /** Un jeton anti-robot ne sert qu'une fois : apres chaque envoi on repart d'un nouveau widget. */
  function renewCaptcha() {
    setCaptcha(null);
    setCaptchaKey((k) => k + 1);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setInfo(null);
    setUnconfirmed(false);
    if (!EMAIL_RE.test(email.trim())) return setError('Indiquez une adresse e-mail valide.');
    if (captchaEnabled && !captcha) return setError('Patientez un instant : la vérification anti-robot doit se terminer.');

    if (mode === 'inscription') {
      if (nom.trim().length < 2) return setError('Indiquez votre nom.');
      if (!normalizePhone(phone)) return setError('Indiquez un numéro de téléphone valide (8 chiffres), pour que le magasin vous rappelle.');
      if (password.length < MIN_PASSWORD) return setError(`Choisissez un mot de passe d'au moins ${MIN_PASSWORD} caractères.`);
      if (password !== password2) return setError('Les deux mots de passe ne sont pas identiques.');
    } else if (mode === 'connexion' && !password) {
      return setError('Indiquez votre mot de passe.');
    }

    setBusy(true);
    try {
      if (mode === 'connexion') {
        const res = await signIn(email, password, captcha ?? undefined);
        if (res.ok) acceptSession(res.data);
        else {
          setError(res.message);
          setUnconfirmed(res.code === 'email_not_confirmed');
        }
      } else if (mode === 'inscription') {
        const res = await signUp({ email, password, nom, telephone: phone, captchaToken: captcha ?? undefined });
        if (!res.ok) setError(res.message);
        else if (res.data.session) acceptSession(res.data.session);
        else setSentTo(email.trim().toLowerCase());
      } else {
        const res = await requestPasswordReset(email, captcha ?? undefined);
        if (res.ok) setInfo(`Si un compte existe pour ${email.trim()}, un e-mail avec un lien pour choisir un nouveau mot de passe vient d'être envoyé. Pensez à regarder dans les courriers indésirables.`);
        else setError(res.message);
      }
    } finally {
      setBusy(false);
      renewCaptcha();
    }
  }

  async function resend() {
    if (busy) return;
    if (captchaEnabled && !captcha) return setError('Patientez un instant : la vérification anti-robot doit se terminer.');
    setBusy(true);
    setError(null);
    const target = sentTo ?? email;
    const res = await resendConfirmation(target, captcha ?? undefined);
    setBusy(false);
    renewCaptcha();
    if (res.ok) {
      setInfo(`Un nouvel e-mail de confirmation vient d'être envoyé à ${target.trim()}.`);
      setUnconfirmed(false);
    } else setError(res.message);
  }

  if (sentTo) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm text-center">
        <MailCheck size={44} className="mx-auto text-brand mb-4" aria-hidden="true" />
        <h2 className="text-xl font-extrabold text-slate-900">Vérifiez votre boîte e-mail</h2>
        <p className="mt-2 text-sm text-slate-600">
          Nous venons d&apos;envoyer un e-mail de confirmation à <strong className="text-slate-800">{sentTo}</strong>. Cliquez sur le lien qu&apos;il contient pour activer votre compte
          (regardez aussi dans les courriers indésirables).
        </p>
        <div className="mt-5 space-y-3 max-w-xs mx-auto">
          {captchaEnabled && <Captcha onToken={setCaptcha} resetKey={captchaKey} />}
          {error && <Notice tone="error">{error}</Notice>}
          {info && <Notice tone="ok">{info}</Notice>}
          <button type="button" onClick={resend} disabled={busy} className="text-sm font-semibold text-brand hover:underline disabled:opacity-60">
            Je n&apos;ai rien reçu : renvoyer l&apos;e-mail
          </button>
        </div>
        <button type="button" onClick={() => switchMode('connexion')} className="mt-6 block mx-auto text-xs text-slate-400 hover:text-slate-600">
          Retour à la connexion
        </button>
      </div>
    );
  }

  const title = mode === 'connexion' ? 'Se connecter' : mode === 'inscription' ? 'Créer mon compte' : 'Mot de passe oublié';
  return (
    <div className="grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-8 items-start">
      <form onSubmit={submit} noValidate className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {mode !== 'oubli' && (
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 text-sm font-semibold" role="tablist">
            {(['connexion', 'inscription'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`rounded-lg py-2 transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {m === 'connexion' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>
        )}
        <h2 className="text-lg font-extrabold text-slate-900">{title}</h2>
        {mode === 'oubli' && <p className="text-sm text-slate-500 -mt-2">Indiquez votre adresse e-mail : vous recevrez un lien pour choisir un nouveau mot de passe.</p>}

        {mode === 'inscription' && (
          <>
            <Field label="Nom et prénom">
              <input className={inputClass} autoComplete="name" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex. Ahmed Ben Salah" />
            </Field>
            <Field label="Téléphone">
              <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. 56 456 124" />
            </Field>
          </>
        )}
        <Field label="Adresse e-mail">
          <input className={inputClass} type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
        </Field>
        {mode !== 'oubli' && (
          <Field label="Mot de passe" hint={mode === 'inscription' ? `(${MIN_PASSWORD} caractères minimum)` : undefined}>
            <input
              className={inputClass}
              type="password"
              autoComplete={mode === 'inscription' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {mode === 'inscription' && (
          <Field label="Confirmer le mot de passe">
            <input className={inputClass} type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </Field>
        )}

        {captchaEnabled && <Captcha onToken={setCaptcha} resetKey={captchaKey} />}
        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="ok">{info}</Notice>}
        {unconfirmed && (
          <button type="button" onClick={resend} disabled={busy} className="text-sm font-semibold text-brand hover:underline disabled:opacity-60">
            Renvoyer l&apos;e-mail de confirmation
          </button>
        )}

        <button type="submit" disabled={busy} className={`${primaryButton} w-full`}>
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {mode === 'connexion' ? 'Me connecter' : mode === 'inscription' ? 'Créer mon compte' : 'Envoyer le lien'}
        </button>

        <div className="text-center text-sm">
          {mode === 'connexion' && (
            <button type="button" onClick={() => switchMode('oubli')} className="text-slate-500 hover:text-brand">
              Mot de passe oublié ?
            </button>
          )}
          {mode === 'oubli' && (
            <button type="button" onClick={() => switchMode('connexion')} className="text-slate-500 hover:text-brand">
              Retour à la connexion
            </button>
          )}
        </div>
      </form>

      <aside className="text-sm text-slate-600 space-y-4 lg:pt-2">
        <h2 className="text-lg font-extrabold text-slate-900">Pourquoi créer un compte ?</h2>
        <ul className="space-y-3">
          {[
            'Vos coordonnées sont déjà remplies à chaque commande.',
            'Vous retrouvez toutes vos commandes et leur état au même endroit.',
            `Le magasin peut vous accorder une remise de fidélité, appliquée automatiquement.`,
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <CheckCircle2 size={18} className="text-brand shrink-0 mt-0.5" aria-hidden="true" />
              {t}
            </li>
          ))}
        </ul>
        <p className="text-slate-500">
          Le compte est facultatif : vous pouvez aussi <Link href="/catalogue" className="font-semibold text-brand hover:underline">commander sans compte</Link>. Besoin d&apos;aide ? {SHOP.contactPerson} : {SHOP.phone}.
        </p>
      </aside>
    </div>
  );
}

/* ---------------------------------------------------------------- compte connecte */

function Dashboard({ profile }: { profile: Profile }) {
  const [busyOut, setBusyOut] = useState(false);

  async function doLogout() {
    setBusyOut(true);
    await logout();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4 bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm">
        <span className="w-12 h-12 rounded-full bg-brand-soft text-brand inline-flex items-center justify-center shrink-0">
          <UserRound size={24} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-slate-900 truncate">{profile.nom || 'Mon compte'}</p>
          <p className="text-sm text-slate-500 truncate">{profile.email}</p>
        </div>
        <button
          type="button"
          onClick={doLogout}
          disabled={busyOut}
          className="inline-flex items-center gap-2 rounded border border-slate-300 text-slate-600 text-sm font-semibold px-4 py-2 hover:border-brand hover:text-brand disabled:opacity-60 transition-colors"
        >
          <LogOut size={15} aria-hidden="true" />
          Se déconnecter
        </button>
      </div>

      {profile.remise_pct > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
          <BadgePercent size={22} className="shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            <strong>Votre remise de fidélité : {profile.remise_pct} %.</strong> Elle est appliquée automatiquement à vos commandes passées avec ce compte, sur le prix normal des pièces. Elle ne s&apos;ajoute
            pas aux promotions : vous payez toujours le prix le plus bas.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <ProfileForm profile={profile} />
        <PasswordForm />
      </div>

      <OrdersList />
    </div>
  );
}

function ProfileForm({ profile }: { profile: Profile }) {
  const [nom, setNom] = useState(profile.nom);
  const [telephone, setTelephone] = useState(profile.telephone ?? '');
  const [ville, setVille] = useState(profile.ville ?? '');
  const [adresse, setAdresse] = useState(profile.adresse ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setSaved(false);
    if (nom.trim().length < 2) return setError('Indiquez votre nom.');
    setBusy(true);
    const res = await saveProfile({ nom, telephone, adresse, ville });
    setBusy(false);
    if (res.ok) setSaved(true);
    else setError(res.message);
  }

  return (
    <form onSubmit={submit} noValidate className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Mes coordonnées</h2>
      <p className="text-sm text-slate-500 -mt-2">Elles sont reprises automatiquement dans votre panier.</p>
      <Field label="Nom et prénom">
        <input className={inputClass} autoComplete="name" value={nom} onChange={(e) => setNom(e.target.value)} />
      </Field>
      <Field label="Téléphone">
        <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Ex. 56 456 124" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Ville" hint="(livraison)">
          <input className={inputClass} autoComplete="address-level2" value={ville} onChange={(e) => setVille(e.target.value)} />
        </Field>
        <Field label="Adresse" hint="(livraison)">
          <input className={inputClass} autoComplete="street-address" value={adresse} onChange={(e) => setAdresse(e.target.value)} />
        </Field>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="ok">Coordonnées enregistrées.</Notice>}
      <button type="submit" disabled={busy} className={primaryButton}>
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Enregistrer
      </button>
    </form>
  );
}

function PasswordForm() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setDone(false);
    if (password.length < MIN_PASSWORD) return setError(`Choisissez un mot de passe d'au moins ${MIN_PASSWORD} caractères.`);
    setBusy(true);
    const session = await getFreshSession();
    const res = session ? await changePassword(session.access_token, password) : null;
    setBusy(false);
    if (res?.ok) {
      setDone(true);
      setPassword('');
    } else setError(res ? res.message : 'Votre session a expiré. Reconnectez-vous.');
  }

  return (
    <form onSubmit={submit} noValidate className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-extrabold text-slate-900">Changer mon mot de passe</h2>
      <Field label="Nouveau mot de passe" hint={`(${MIN_PASSWORD} caractères minimum)`}>
        <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="ok">Mot de passe modifié.</Notice>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded border border-slate-300 text-slate-700 font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:border-brand hover:text-brand disabled:opacity-60 transition-colors">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Modifier
      </button>
    </form>
  );
}

const STATUS: Record<MyOrder['statut'], { label: string; style: string }> = {
  nouvelle: { label: 'Reçue', style: 'bg-blue-50 text-blue-700' },
  confirmee: { label: 'Confirmée', style: 'bg-amber-50 text-amber-700' },
  livree: { label: 'Livrée / remise', style: 'bg-green-50 text-green-700' },
  annulee: { label: 'Annulée', style: 'bg-slate-100 text-slate-500' },
};

function OrdersList() {
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getFreshSession();
      if (!session) return;
      const res = await fetchMyOrders(session);
      if (cancelled) return;
      if (res.ok) setOrders(res.data);
      else setError(res.message);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section aria-labelledby="mes-commandes">
      <h2 id="mes-commandes" className="text-lg font-extrabold text-slate-900 mb-4">
        Mes commandes
      </h2>
      {error && <Notice tone="error">{error}</Notice>}
      {!error && orders === null && <p className="text-sm text-slate-400">Chargement…</p>}
      {orders && orders.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          <PackageSearch size={36} className="mx-auto text-slate-300 mb-3" aria-hidden="true" />
          Vous n&apos;avez pas encore passé de commande avec ce compte.
          <div className="mt-3">
            <Link href="/catalogue" className="font-semibold text-brand hover:underline">
              Parcourir le catalogue
            </Link>
          </div>
        </div>
      )}
      {orders && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.statut] ?? STATUS.nouvelle;
            return (
              <details key={o.ref} className="group bg-white border border-slate-200 rounded-2xl shadow-sm">
                <summary className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4 cursor-pointer list-none">
                  <span className="font-mono font-extrabold tracking-wider text-slate-900">{o.ref}</span>
                  <span className="text-sm text-slate-500">{new Date(o.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                  <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${st.style}`}>{st.label}</span>
                  <span className="ml-auto font-bold text-brand">{formatMoney(Number(o.total))}</span>
                </summary>
                <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600 space-y-1.5">
                  {o.lignes.map((l, i) => (
                    <p key={`${l.code}-${i}`} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        {l.designation}
                        {l.marque ? ` (${l.marque})` : ''} <span className="text-slate-400">× {l.qty}</span>
                      </span>
                      <span className="shrink-0 font-semibold text-slate-700">{formatMoney(Number(l.prix) * l.qty)}</span>
                    </p>
                  ))}
                  {Number(o.remise_montant) > 0 && (
                    <p className="text-green-700">
                      Remise de fidélité {Number(o.remise_pct)} % : -{formatMoney(Number(o.remise_montant))} (déjà déduite)
                    </p>
                  )}
                  <p className="text-xs text-slate-400 pt-1">{o.mode === 'livraison' ? 'Livraison' : 'Retrait au magasin'}</p>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
