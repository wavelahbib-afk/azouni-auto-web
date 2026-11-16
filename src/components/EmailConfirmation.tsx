'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, KeyRound, Loader2, TriangleAlert } from 'lucide-react';
import { acceptSession } from '@/lib/account';
import { changePassword, MIN_PASSWORD, verifyEmailLink, type AuthResult, type Session } from '@/lib/auth';

type LinkType = 'signup' | 'recovery' | 'email';

// Un lien ne vaut qu'une fois : en developpement React lance l'effet deux fois, on ne verifie donc chaque lien qu'une seule fois par chargement de la page.
const checked = new Map<string, Promise<AuthResult<Session>>>();
function verifyOnce(tokenHash: string, type: LinkType): Promise<AuthResult<Session>> {
  let p = checked.get(tokenHash);
  if (!p) {
    p = verifyEmailLink(tokenHash, type);
    checked.set(tokenHash, p);
  }
  return p;
}

const inputClass =
  'w-full border border-slate-300 rounded-xl bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand';

/**
 * Page ouverte depuis le lien des e-mails (confirmation d'inscription, mot de passe oublie) : /compte/confirmation?token_hash=...&type=signup|recovery.
 * La verification se fait ICI, dans le navigateur, et non au simple chargement du lien : les logiciels de securite des boites mail qui « visitent » les liens sans executer
 * la page ne consomment donc pas le lien du client.
 */
export function EmailConfirmation() {
  const params = useSearchParams();
  const tokenHash = params.get('token_hash') ?? '';
  const rawType = params.get('type') ?? '';
  const type: LinkType | null = rawType === 'signup' || rawType === 'recovery' || rawType === 'email' ? rawType : null;
  const usable = tokenHash.length > 0 && type !== null;

  const [result, setResult] = useState<AuthResult<Session> | null>(null);

  useEffect(() => {
    if (!usable || !type) return;
    let cancelled = false;
    verifyOnce(tokenHash, type).then((res) => {
      if (cancelled) return;
      if (res.ok) acceptSession(res.data);
      setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [usable, tokenHash, type]);

  if (!usable) return <Failure message="Ce lien est incomplet. Utilisez le lien reçu par e-mail, ou demandez-en un nouveau." />;
  if (result === null) {
    return (
      <div className="py-16 text-center text-slate-500">
        <Loader2 size={32} className="mx-auto animate-spin text-brand mb-3" aria-hidden="true" />
        Vérification de votre lien…
      </div>
    );
  }
  if (!result.ok) return <Failure message={result.message} />;
  if (type === 'recovery') return <NewPassword accessToken={result.data.access_token} />;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
      <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" aria-hidden="true" />
      <h2 className="text-xl font-extrabold text-slate-900">Votre adresse e-mail est confirmée</h2>
      <p className="mt-2 text-sm text-slate-600">Votre compte est actif et vous êtes connecté.</p>
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link href="/catalogue" className="inline-flex items-center rounded bg-brand text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-brand-light transition-colors">
          Voir le catalogue
        </Link>
        <Link href="/compte" className="text-sm font-semibold text-brand hover:underline">
          Mon compte
        </Link>
      </div>
    </div>
  );
}

function Failure({ message }: { message: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
      <TriangleAlert size={44} className="mx-auto text-amber-500 mb-4" aria-hidden="true" />
      <h2 className="text-xl font-extrabold text-slate-900">Lien non valable</h2>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
      <Link href="/compte" className="inline-block mt-6 text-sm font-semibold text-brand hover:underline">
        Retour à Mon compte
      </Link>
    </div>
  );
}

/** Lien « mot de passe oublie » : le client est connecte par le lien, il choisit son nouveau mot de passe. */
function NewPassword({ accessToken }: { accessToken: string }) {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Choisissez un mot de passe d'au moins ${MIN_PASSWORD} caractères.`);
    if (password !== password2) return setError('Les deux mots de passe ne sont pas identiques.');
    setBusy(true);
    const res = await changePassword(accessToken, password);
    setBusy(false);
    if (res.ok) setDone(true);
    else setError(res.message);
  }

  if (done) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        <CheckCircle2 size={48} className="mx-auto text-green-600 mb-4" aria-hidden="true" />
        <h2 className="text-xl font-extrabold text-slate-900">Mot de passe modifié</h2>
        <p className="mt-2 text-sm text-slate-600">Vous êtes connecté avec votre nouveau mot de passe.</p>
        <Link href="/compte" className="inline-flex mt-6 items-center rounded bg-brand text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-brand-light transition-colors">
          Mon compte
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-brand-soft text-brand inline-flex items-center justify-center">
          <KeyRound size={20} aria-hidden="true" />
        </span>
        <h2 className="text-lg font-extrabold text-slate-900">Choisissez un nouveau mot de passe</h2>
      </div>
      <label className="block">
        <span className="block text-xs font-semibold text-slate-600 mb-1.5">Nouveau mot de passe ({MIN_PASSWORD} caractères minimum)</span>
        <input className={inputClass} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-slate-600 mb-1.5">Confirmer le mot de passe</span>
        <input className={inputClass} type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="text-sm rounded-lg px-3 py-2 text-red-700 bg-red-50">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="inline-flex items-center justify-center gap-2 w-full rounded bg-brand text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-brand-light disabled:opacity-60 transition-colors">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        Enregistrer
      </button>
    </form>
  );
}
