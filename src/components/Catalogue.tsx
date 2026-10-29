'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react';
import type { CatalogArticle } from '@/lib/types';
import { normalizeReference } from '@/lib/normalize';
import { articleTitle, articleVehicles, rawDesignation, hasPrice, effectivePrice, promoPrice } from '@/lib/display';
import { CATEGORIES, categoryBySlug } from '@/lib/categories';
import { makeLabel, modelLabel, parseVehicleParam, vehicleParam, type VehicleMake } from '@/lib/vehicles';
import { useVehicleCodes } from '@/lib/vehicleCodes';
import { logEmptySearch } from '@/lib/searchLog';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { SHOP } from '@/lib/shop';
import { formatInt } from '@/lib/format';
import { ArticleCard } from './ArticleCard';
import { Breadcrumbs } from './Breadcrumbs';
import { CategoryIcon } from './CategoryIcon';
import { VehicleSelector } from './VehicleSelector';

import { Eyebrow } from "@/components/Eyebrow";
const PAGE_SIZE = 48;

type SortKey = 'name' | 'price_asc' | 'price_desc';
const SORT_PARAM: Record<SortKey, string> = { name: '', price_asc: 'prix-asc', price_desc: 'prix-desc' };

/** Filtres du catalogue : ils vivent dans l'adresse de la page (?categorie=freinage&marque=BOSCH...), donc un lien ou un favori retrouve exactement la meme liste. */
interface Filters {
  q: string;
  categorie: string;
  marque: string;
  max: string;
  promo: boolean;
  /** "CONSTRUCTEUR|MODELE" ou "" */
  vehicule: string;
  /** constructeur seul (tous ses modeles) */
  constructeur: string;
  sort: SortKey;
  page: number;
}

function parseFilters(sp: URLSearchParams): Filters {
  const sort = sp.get('tri');
  return {
    q: sp.get('q') ?? '',
    categorie: sp.get('categorie') ?? '',
    marque: sp.get('marque') ?? '',
    max: sp.get('max') ?? '',
    promo: sp.get('promo') === '1',
    vehicule: sp.get('vehicule') ?? '',
    constructeur: sp.get('constructeur') ?? '',
    sort: sort === 'prix-asc' ? 'price_asc' : sort === 'prix-desc' ? 'price_desc' : 'name',
    page: Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1),
  };
}

function serializeFilters(f: Filters): string {
  const sp = new URLSearchParams();
  if (f.q.trim()) sp.set('q', f.q);
  if (f.categorie) sp.set('categorie', f.categorie);
  if (f.marque) sp.set('marque', f.marque);
  if (f.max) sp.set('max', f.max);
  if (f.promo) sp.set('promo', '1');
  if (f.vehicule) sp.set('vehicule', f.vehicule);
  else if (f.constructeur) sp.set('constructeur', f.constructeur);
  if (SORT_PARAM[f.sort]) sp.set('tri', SORT_PARAM[f.sort]);
  if (f.page > 1) sp.set('page', String(f.page));
  return sp.toString();
}

/**
 * Meme decoupage en mots que l'application de bureau (electron/services/search.ts::buildFtsQuery) : accents/symboles ignores, un mot = un prefixe. Ici on le
 * reimplemente en JS (le catalogue est deja charge cote client, pas de FTS5 dans le navigateur).
 */
function tokenize(raw: string): string[] {
  return raw
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}

function matchesAllTokensAsPrefix(words: string[], queryTokens: string[]): boolean {
  return queryTokens.every((qt) => words.some((w) => w.startsWith(qt)));
}

interface Entry {
  article: CatalogArticle;
  title: string;
  /** Mots de la designation correcte, de la designation d'origine, des vehicules et de la marque (pour la recherche). */
  words: string[];
  /** References propres + equivalentes/d'origine, normalisees et collees (une seule recherche de sous-chaine par article). */
  refs: string;
}

export function Catalogue({ articles, makes }: { articles: CatalogArticle[]; makes: VehicleMake[] }) {
  const searchParams = useSearchParams();
  const spString = searchParams.toString();
  const [filters, setFilters] = useState<Filters>(() => parseFilters(searchParams));
  const [showFilters, setShowFilters] = useState(false);

  // Adresses que CE composant vient d'ecrire et que Next n'a pas encore "rendues" : quand l'adresse change, on sait ainsi si c'est notre propre ecriture qui revient
  // (a ignorer : sinon, en tapant vite, une adresse en retard effacerait les dernieres lettres) ou une vraie navigation externe.
  const [written] = useState<string[]>(() => []);

  // Navigation EXTERNE (menu, tuile de categorie, recherche de l'en-tete) : l'adresse change sans que ce composant l'ait ecrite -> les filtres suivent l'adresse.
  // (ajustement pendant le rendu, pas dans un effect : https://react.dev/learn/you-might-not-need-an-effect)
  const [prevSp, setPrevSp] = useState(spString);
  if (spString !== prevSp) {
    setPrevSp(spString);
    if (!written.includes(spString) && spString !== serializeFilters(filters)) setFilters(parseFilters(searchParams));
  }

  // Une adresse revenue de Next : elle et toutes les ecritures plus anciennes sont soldees.
  useEffect(() => {
    const i = written.indexOf(spString);
    if (i >= 0) written.splice(0, i + 1);
  }, [spString, written]);

  // Ecrit les filtres dans l'adresse (sans recharger, sans ajouter d'entree a l'historique du navigateur).
  useEffect(() => {
    const next = serializeFilters(filters);
    if (next === window.location.search.replace(/^\?/, '')) return;
    written.push(next);
    window.history.replaceState(null, '', next ? `?${next}` : window.location.pathname);
  }, [filters, written]);

  function update(patch: Partial<Filters>, keepPage = false) {
    setFilters((f) => ({ ...f, ...patch, page: keepPage ? (patch.page ?? f.page) : (patch.page ?? 1) }));
  }

  const vehicleSel = parseVehicleParam(filters.vehicule);
  const selMake = vehicleSel?.make ?? filters.constructeur;
  const selModel = vehicleSel?.model ?? '';
  const { codes: vehicleCodes, loading: vehicleLoading } = useVehicleCodes(selMake, selModel);

  // Prepare une seule fois (titre mis en forme, mots de recherche, references normalisees) : le filtre tourne ensuite a chaque frappe.
  const entries = useMemo<Entry[]>(
    () =>
      articles.map((article) => ({
        article,
        title: articleTitle(article),
        words: tokenize(`${articleTitle(article)} ${rawDesignation(article)} ${articleVehicles(article) ?? ''} ${article.vehicules_compatibles ?? ''} ${article.marque ?? ''}`),
        refs: article.refsIndex ?? [article.reference ?? '', article.code, ...(article.equivalences ?? [])].map(normalizeReference).join('|'),
      })),
    [articles],
  );

  const marques = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) if (a.marque) counts.set(a.marque, (counts.get(a.marque) ?? 0) + 1);
    return Array.from(counts)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .map(([m]) => m)
      .slice(0, 60)
      .sort((a, b) => a.localeCompare(b, 'fr'));
  }, [articles]);

  const maxPrice = parseFloat(filters.max.replace(',', '.'));
  const tokens = useMemo(() => tokenize(filters.q), [filters.q]);
  const qRef = normalizeReference(filters.q);

  // Articles qui passent TOUS les filtres sauf la categorie (sert aussi aux compteurs de categories)
  const baseList = useMemo(
    () =>
      entries.filter(({ article, words, refs }) => {
        if (filters.marque && article.marque !== filters.marque) return false;
        if (filters.promo && promoPrice(article) === null) return false;
        if (Number.isFinite(maxPrice) && maxPrice > 0 && !(hasPrice(article) && effectivePrice(article) <= maxPrice)) return false;
        if (vehicleCodes && !vehicleCodes.has(article.code)) return false;
        if (tokens.length === 0) return true;
        // Mots-cles (prefixe, n'importe quel ordre) sur designation correcte + designation d'origine + vehicules + marque...
        if (matchesAllTokensAsPrefix(words, tokens)) return true;
        // ...OU reference (propre ou equivalente/d'origine), insensible au format (espaces/tirets/points), a partir de 3 caracteres.
        return qRef.length >= 3 && refs.includes(qRef);
      }),
    [entries, filters.marque, filters.promo, maxPrice, vehicleCodes, tokens, qRef],
  );

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { article } of baseList) counts[article.categorie ?? 'autres'] = (counts[article.categorie ?? 'autres'] ?? 0) + 1;
    return counts;
  }, [baseList]);

  const filtered = useMemo(() => {
    const list = filters.categorie ? baseList.filter(({ article }) => (article.categorie ?? 'autres') === filters.categorie) : [...baseList];
    const byName = (a: Entry, b: Entry) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
    if (filters.sort === 'name') return list.sort(byName);
    // tri par prix : les articles "sur demande" (0 DT) passent toujours en dernier
    return list.sort((a, b) => {
      const pa = hasPrice(a.article);
      const pb = hasPrice(b.article);
      if (pa !== pb) return pa ? -1 : 1;
      const diff = effectivePrice(a.article) - effectivePrice(b.article);
      return (filters.sort === 'price_asc' ? diff : -diff) || byName(a, b);
    });
  }, [baseList, filters.categorie, filters.sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Recherche sans resultat : enregistree (terme seulement) pour que le magasin sache ce que les clients cherchent sans le trouver
  const emptyTerm = filtered.length === 0 && !vehicleLoading ? filters.q.trim() : '';
  useEffect(() => {
    if (emptyTerm.length < 3) return;
    const t = setTimeout(() => logEmptySearch(emptyTerm), 1500);
    return () => clearTimeout(t);
  }, [emptyTerm]);

  const category = categoryBySlug(filters.categorie);
  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.q.trim()) activeChips.push({ label: `« ${filters.q.trim()} »`, clear: () => update({ q: '' }) });
  if (category) activeChips.push({ label: category.label, clear: () => update({ categorie: '' }) });
  if (selMake) activeChips.push({ label: selModel ? `${makeLabel(selMake)} ${modelLabel(selModel)}` : makeLabel(selMake), clear: () => update({ vehicule: '', constructeur: '' }) });
  if (filters.marque) activeChips.push({ label: filters.marque, clear: () => update({ marque: '' }) });
  if (Number.isFinite(maxPrice) && maxPrice > 0) activeChips.push({ label: `≤ ${maxPrice} DT`, clear: () => update({ max: '' }) });
  if (filters.promo) activeChips.push({ label: 'Promotions', clear: () => update({ promo: false }) });

  function resetAll() {
    setFilters({ q: '', categorie: '', marque: '', max: '', promo: false, vehicule: '', constructeur: '', sort: 'name', page: 1 });
  }

  function goToPage(p: number) {
    update({ page: p }, true);
    document.getElementById('resultats')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const title = filters.promo ? 'Nos promotions' : category ? category.label : filters.q.trim() ? `Résultats pour « ${filters.q.trim()} »` : selMake ? `Pièces pour ${selModel ? `${makeLabel(selMake)} ${modelLabel(selModel)}` : makeLabel(selMake)}` : 'Le catalogue';
  const crumbs = [{ label: 'Accueil', href: '/' }, { label: 'Catalogue', href: category || filters.promo || filters.q ? '/catalogue' : undefined }, ...(category || filters.promo ? [{ label: title }] : [])];

  const filterPanel = (
    <div className="space-y-7">
      {makes.length > 0 && (
        <VehicleSelector
          key={`${selMake}|${selModel}`}
          compact
          makes={makes}
          initialMake={selMake}
          initialModel={selModel}
          onSelect={(make, model) => update({ vehicule: make && model ? vehicleParam(make, model) : '', constructeur: make && !model ? make : '' })}
        />
      )}

      <div>
        <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          <SlidersHorizontal size={14} aria-hidden="true" />
          Catégories
        </h3>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => update({ categorie: '' })}
              className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${filters.categorie === '' ? 'bg-brand-soft text-brand font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <span>Toutes les pièces</span>
              <span className="text-xs text-slate-400">{formatInt(baseList.length)}</span>
            </button>
          </li>
          {CATEGORIES.map((c) => (
            <li key={c.slug}>
              <button
                onClick={() => update({ categorie: c.slug })}
                disabled={(categoryCounts[c.slug] ?? 0) === 0 && filters.categorie !== c.slug}
                className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors disabled:opacity-40 ${
                  filters.categorie === c.slug ? 'bg-brand-soft text-brand font-semibold' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <CategoryIcon icon={c.icon} size={15} className="shrink-0" />
                  <span className="truncate">{c.label}</span>
                </span>
                <span className="text-xs text-slate-400">{formatInt(categoryCounts[c.slug] ?? 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Marque de la pièce</h3>
        <select
          className="w-full border border-slate-300 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          value={filters.marque}
          onChange={(e) => update({ marque: e.target.value })}
          aria-label="Filtrer par marque"
        >
          <option value="">Toutes les marques</option>
          {marques.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Prix maximum TTC</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="Ex. 100"
            className="w-full border border-slate-300 rounded-xl bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
            value={filters.max}
            onChange={(e) => update({ max: e.target.value })}
            aria-label="Prix maximum en dinars"
          />
          <span className="text-sm text-slate-400">DT</span>
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer">
        <input type="checkbox" className="accent-[var(--brand)] w-4 h-4" checked={filters.promo} onChange={(e) => update({ promo: e.target.checked })} />
        En promotion
      </label>

      {activeChips.length > 0 && (
        <button onClick={resetAll} className="text-sm font-semibold text-brand hover:underline">
          Réinitialiser les filtres
        </button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumbs items={crumbs} className="mb-4" />
      <div className="mb-6">
        <Eyebrow className="mb-1.5">Trouvez votre référence</Eyebrow>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {category && <p className="text-slate-500 mt-2 max-w-2xl">{category.blurb}</p>}
      </div>

      <div className="grid lg:grid-cols-[17.5rem_minmax(0,1fr)] gap-8 items-start">
        <aside className="hidden lg:block lg:sticky lg:top-40" aria-label="Filtres">
          {filterPanel}
        </aside>

        <div id="resultats" className="scroll-mt-40 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                className="w-full border border-slate-300 rounded bg-white pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                placeholder="Rechercher une pièce, une référence, un véhicule, une marque..."
                aria-label="Rechercher dans le catalogue"
                value={filters.q}
                onChange={(e) => update({ q: e.target.value })}
              />
              {filters.q && (
                <button type="button" onClick={() => update({ q: '' })} aria-label="Effacer la recherche" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowFilters((s) => !s)}
                aria-expanded={showFilters}
                className="lg:hidden inline-flex items-center gap-2 border border-slate-300 rounded bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                <SlidersHorizontal size={15} />
                Filtres{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
              </button>
              <select
                className="flex-1 sm:flex-none sm:w-48 border border-slate-300 rounded bg-white px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value as SortKey })}
                aria-label="Trier les articles"
              >
                <option value="name">Trier : Nom (A → Z)</option>
                <option value="price_asc">Prix croissant</option>
                <option value="price_desc">Prix décroissant</option>
              </select>
            </div>
          </div>

          {showFilters && <div className="lg:hidden mb-5 bg-white border border-slate-200 rounded-2xl p-4">{filterPanel}</div>}

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {activeChips.map((c) => (
                <button
                  key={c.label}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded bg-brand-soft text-brand text-xs font-semibold pl-3 pr-2 py-1.5 hover:bg-brand hover:text-white transition-colors"
                  aria-label={`Retirer le filtre ${c.label}`}
                >
                  {c.label}
                  <X size={13} />
                </button>
              ))}
            </div>
          )}

          {vehicleLoading ? (
            <p className="py-16 text-center text-slate-400 text-sm" aria-live="polite">
              Chargement des pièces compatibles…
            </p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-14 px-4 bg-white border border-slate-200 rounded-2xl">
              <p className="text-slate-700 font-semibold mb-1">Aucune pièce ne correspond à votre recherche.</p>
              <p className="text-slate-400 text-sm mb-5">Essayez une autre référence, moins de mots, ou demandez-nous directement : nous cherchons pour vous.</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href={buildWhatsAppLink(SHOP.whatsapp, `Bonjour ${SHOP.name}, je cherche cette pièce : ${filters.q.trim() || (category?.label ?? 'une pièce')}${selMake ? ` pour ${makeLabel(selMake)}${selModel ? ` ${modelLabel(selModel)}` : ''}` : ''}. Pouvez-vous me dire si vous l'avez ?`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded bg-green-600 text-white font-display font-bold text-[15px] tracking-[0.1em] uppercase px-6 py-3 hover:bg-green-700 transition-colors"
                >
                  <MessageCircle size={16} />
                  Demander cette pièce sur WhatsApp
                </a>
                {activeChips.length > 0 && (
                  <button onClick={resetAll} className="text-sm font-semibold text-brand hover:underline">
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3" aria-live="polite">
                {formatInt(filtered.length)} pièce{filtered.length > 1 ? 's' : ''} {activeChips.length > 0 ? `trouvée${filtered.length > 1 ? 's' : ''}` : 'en stock'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {paged.map(({ article }) => (
                  <ArticleCard key={article.code} article={article} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav className="flex items-center justify-center gap-4 mt-8 text-sm" aria-label="Pagination">
                  <button
                    className="px-4 py-2 rounded font-semibold text-slate-600 bg-white border border-slate-200 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    Précédent
                  </button>
                  <span className="text-slate-500">
                    Page {page} / {totalPages}
                  </span>
                  <button
                    className="px-4 py-2 rounded font-semibold text-slate-600 bg-white border border-slate-200 hover:border-brand hover:text-brand disabled:opacity-40 transition-colors"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    Suivant
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
