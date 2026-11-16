'use client';

import { useEffect, useRef } from 'react';

/**
 * Verification anti-robot Cloudflare Turnstile (gratuite, sans image a reconnaitre dans la plupart des cas). Le widget n'apparait que si la cle du site est configuree
 * (variable NEXT_PUBLIC_TURNSTILE_SITE_KEY) ; sinon il ne rend rien et `captchaEnabled` est faux : les formulaires fonctionnent comme avant.
 *
 * Le jeton obtenu est a envoyer au serveur, qui le verifie aupres de Cloudflare (route /api/commande pour les commandes ; Supabase Auth pour l'inscription, la connexion et
 * le mot de passe oublie quand « Captcha protection » y est activee).
 */
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
export const captchaEnabled = TURNSTILE_SITE_KEY.length > 0;

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!scriptPromise) {
    scriptPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile absent')));
      script.onerror = () => {
        scriptPromise = null; // permet de reessayer (reseau coupe un instant)
        reject(new Error('turnstile bloque'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * `onToken(jeton)` quand la verification reussit, `onToken(null)` quand le jeton expire ou en cas d'erreur. `resetKey` : changer sa valeur recree le widget (un jeton
 * ne sert qu'une fois : a faire apres chaque envoi du formulaire).
 */
export function Captcha({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  });

  useEffect(() => {
    const el = box.current;
    if (!captchaEnabled || !el) return;
    let widgetId: string | null = null;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId = api.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          language: 'fr',
          theme: 'light',
          callback: (token: string) => callback.current(token),
          'expired-callback': () => callback.current(null),
          'error-callback': () => callback.current(null),
        });
      })
      .catch(() => callback.current(null));
    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [resetKey]);

  if (!captchaEnabled) return null;
  return <div ref={box} className="min-h-[65px]" aria-label="Vérification anti-robot" />;
}
