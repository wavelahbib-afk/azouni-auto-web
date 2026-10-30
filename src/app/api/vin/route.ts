import { NextResponse } from "next/server";
import { allow } from "@/lib/rateLimit";
import { getSearchLexicon } from "@/lib/searchIndex";
import { getVinSuggestion, recordVinAssociation } from "@/lib/vinLearning";
import { isValidVinPrefix, makeFromWmi } from "@/lib/vin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clientIp = (req: Request): string => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

/** Associations deja enregistrees par ce visiteur (meme debut de VIN + meme modele : un seul choix compte). */
const seen = new Set<string>();

/** GET /api/vin?prefix=VF1BB05C -> { suggestion: { make, model, votes } | null } : modele appris des clients pour ce debut de VIN. */
export async function GET(req: Request) {
  if (!allow(`vin:${clientIp(req)}`, 60, 60_000)) return NextResponse.json({ erreur: "trop de demandes" }, { status: 429 });
  const prefix = (new URL(req.url).searchParams.get("prefix") ?? "").toUpperCase();
  if (!isValidVinPrefix(prefix)) return NextResponse.json({ erreur: "debut de VIN invalide" }, { status: 400 });
  return NextResponse.json({ suggestion: await getVinSuggestion(prefix) });
}

/**
 * POST /api/vin { prefix, make, model } : un client a choisi ce modele apres avoir donne un VIN commencant par ces 8 caracteres.
 * Verifications : debut de VIN valide ; constructeur et modele qui existent dans le selecteur de vehicule du site ; constructeur coherent avec le code du VIN quand il est connu ;
 * limites par visiteur. Seuls 8 caracteres de VIN arrivent ici : le numero complet n'est jamais envoye.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!allow(`vinw:${ip}`, 10, 60_000) || !allow(`vinday:${ip}`, 40, 86_400_000)) return NextResponse.json({ erreur: "trop de demandes" }, { status: 429 });

  let body: { prefix?: unknown; make?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erreur: "demande illisible" }, { status: 400 });
  }
  const prefix = typeof body.prefix === "string" ? body.prefix.toUpperCase() : "";
  const make = typeof body.make === "string" ? body.make : "";
  const model = typeof body.model === "string" ? body.model : "";
  if (!isValidVinPrefix(prefix) || !make || !model) return NextResponse.json({ erreur: "donnees invalides" }, { status: 400 });

  const lexicon = await getSearchLexicon();
  if (!lexicon.models.some((m) => m.make === make && m.model === model)) return NextResponse.json({ erreur: "vehicule inconnu" }, { status: 400 });
  const wmiMake = makeFromWmi(prefix);
  if (wmiMake && wmiMake !== make) return NextResponse.json({ erreur: "constructeur incoherent avec le VIN" }, { status: 400 });

  const id = `${ip}|${prefix}|${make}|${model}`;
  if (seen.has(id)) return NextResponse.json({ ok: true, deja: true });
  if (seen.size > 5000) seen.clear();
  seen.add(id);

  const ok = await recordVinAssociation(prefix, make, model);
  return NextResponse.json({ ok });
}
