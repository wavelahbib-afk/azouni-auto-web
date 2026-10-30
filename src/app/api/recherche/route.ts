import { NextResponse } from "next/server";
import { allow, allowDaily } from "@/lib/rateLimit";
import { getSearchLexicon } from "@/lib/searchIndex";
import { applyAiAnswer, catalogueUrlFor, fold, hasUsefulFilters, interpretWithRules, type SearchInterpretation } from "@/lib/searchInterpret";
import { aiEnabled, extractWithAi } from "@/lib/searchAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AI_DAILY_MAX = Number(process.env.SEARCH_AI_DAILY_MAX ?? 400);

/** Reponses de l'IA deja obtenues (meme phrase = meme resultat, sans nouvel appel) pendant 24 h. */
const aiCache = new Map<string, { at: number; result: SearchInterpretation | null }>();
const AI_CACHE_MS = 24 * 60 * 60 * 1000;

/**
 * Recherche intelligente : POST { q: "plaquettes avant clio 2" } -> filtres du catalogue { q, vehicule, constructeur, annee, reference, url }.
 * Les regles (searchInterpret.ts) repondent d'abord ; l'IA n'est sollicitee que pour les mots que les regles ne comprennent pas, avec limites par visiteur et par jour.
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  if (!allow(`recherche:${ip}`, 40, 60_000)) return NextResponse.json({ erreur: "trop de recherches, reessayez dans une minute" }, { status: 429 });

  let text = "";
  try {
    const body = (await req.json()) as { q?: unknown };
    text = typeof body.q === "string" ? body.q.replace(/[\u0000-\u001f]/g, " ").trim() : "";
  } catch {
    return NextResponse.json({ erreur: "demande illisible" }, { status: 400 });
  }
  if (text.length < 2 || text.length > 140) return NextResponse.json({ erreur: "recherche trop courte ou trop longue" }, { status: 400 });

  const lexicon = await getSearchLexicon();
  let result = interpretWithRules(text, lexicon);

  // mots non compris par les regles : aide de l'IA (si une cle est configuree), dans la limite des quotas
  if (result.inconnus.length > 0 && aiEnabled()) {
    const key = fold(text) || text;
    const hit = aiCache.get(key);
    let ai: SearchInterpretation | null = null;
    if (hit && Date.now() - hit.at < AI_CACHE_MS) {
      ai = hit.result;
    } else if (allow(`ia:${ip}`, 8, 60_000) && allowDaily(AI_DAILY_MAX)) {
      const answer = await extractWithAi(text, lexicon.makes.map((m) => m.label));
      ai = answer ? applyAiAnswer(answer, lexicon) : null;
      if (aiCache.size > 500) aiCache.clear();
      aiCache.set(key, { at: Date.now(), result: ai });
    }
    if (ai && hasUsefulFilters(ai)) result = ai;
  }

  // rien de comprehensible : recherche simple par mots (le catalogue dit alors "aucune piece" et propose WhatsApp, au lieu d'afficher toutes les pieces)
  const url = hasUsefulFilters(result) ? catalogueUrlFor(result) : `/catalogue?q=${encodeURIComponent(text)}`;
  return NextResponse.json({ ...result, url });
}
