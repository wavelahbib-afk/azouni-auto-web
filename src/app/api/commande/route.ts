import { NextResponse } from "next/server";
import { processOrder } from "@/lib/orderServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Porte des commandes du site : POST { ref, name, phone, mode, address, city, vin, note, lignes: [{ code, qty }], captcha_token } avec, si le client est connecte,
 * l'en-tete « Authorization: Bearer <jeton> ». Tout est verifie et recalcule cote serveur -- voir src/lib/orderServer.ts.
 *
 * Variables d'environnement (Vercel > Settings > Environment Variables) :
 *   SUPABASE_SERVICE_ROLE_KEY      cle service_role de Supabase, PRIVEE (jamais en NEXT_PUBLIC_) ; sans elle la porte repond « non_configure » et le site garde l'ancien fonctionnement
 *   TURNSTILE_SECRET_KEY           cle secrete Cloudflare Turnstile (anti-robot) ; sans elle, pas de verification anti-robot
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

  const text = await req.text().catch(() => "");
  if (text.length > 60_000) return NextResponse.json({ ok: false, erreur: "trop_gros", message: "Demande trop volumineuse." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ ok: false, erreur: "invalide", message: "Demande illisible." }, { status: 400 });
  }

  const outcome = await processOrder(body, {
    ip,
    authorization: req.headers.get("authorization"),
    env: {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      turnstileSecret: process.env.TURNSTILE_SECRET_KEY,
    },
  });
  return NextResponse.json(outcome.body, { status: outcome.status });
}
