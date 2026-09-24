# azouni-auto-web

Site vitrine public d'AZOUNI AUTO : catalogue en ligne (recherche, panier)
avec commande finale par WhatsApp -- pas de paiement en ligne. Projet separe
de l'application de bureau `azouni-auto` ; les deux communiquent uniquement
via la base Supabase (voir ci-dessous).

## 1. Creer le projet Supabase (une seule fois)

1. Aller sur [supabase.com](https://supabase.com), creer un compte gratuit
   puis un nouveau projet.
2. Dans **SQL Editor > New query**, coller le contenu de
   [`supabase/schema.sql`](supabase/schema.sql) et executer (**Run**). Cela
   cree la table `articles_catalogue` avec lecture publique et ecriture
   protegee.
3. Dans **Project Settings > API**, recuperer :
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key -> `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (secrete, ne JAMAIS la mettre dans ce projet web) ->
     a coller uniquement dans AZOUNI AUTO, page **Parametres > Synchronisation
     site web**, avec comme "URL de l'API du site" :
     `https://VOTRE-PROJET.supabase.co/rest/v1/articles_catalogue`

## 2. Configurer ce site

```bash
cp .env.example .env.local
```

Remplir `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (etape 1)
- `NEXT_PUBLIC_SHOP_NAME` : affiche dans l'en-tete et le message WhatsApp
- `NEXT_PUBLIC_SHOP_WHATSAPP` : numero qui recoit les commandes (format
  international sans "+", ex. `21622437815`)

## 3. Lancer en developpement

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000). Le catalogue reste
vide tant qu'aucune synchronisation n'a ete faite depuis AZOUNI AUTO (bouton
"Synchroniser maintenant", Parametres).

## 4. Deployer (Vercel, gratuit pour demarrer)

1. Pousser ce dossier sur un depot Git (GitHub, GitLab...).
2. Sur [vercel.com](https://vercel.com), **New Project** -> importer ce
   depot.
3. Renseigner les memes 4 variables d'environnement que `.env.local` dans
   les parametres du projet Vercel (**Environment Variables**).
4. Deployer -> le site est accessible sur une URL `*.vercel.app` gratuite.
   Un nom de domaine payant (ex. `.tn`) pourra etre branche plus tard sans
   changement de code, dans **Project Settings > Domains**.

## Ce qui n'est pas fait en V1 (volontairement)

- Paiement en ligne / checkout : la commande se termine sur WhatsApp.
- Vraies photos d'articles : `photo_path` (AZOUNI AUTO) est un fichier local,
  non accessible depuis le web -- icones generiques par famille pour
  l'instant.
- Comptes clients / historique de commandes cote site.

## Architecture

```
src/
  app/
    page.tsx              Accueil = catalogue (recherche + filtre famille)
    article/[code]/       Fiche article
    panier/                Panier (localStorage) + bouton "Commander via WhatsApp"
    layout.tsx             En-tete, commun a toutes les pages
  components/               Header, ArticleCard, Catalogue (recherche/filtre), etc.
  lib/
    supabase.ts             Client Supabase (cle anon uniquement, lecture seule)
    cart.tsx                Panier (store partage + localStorage, useSyncExternalStore), pas de compte client
    whatsapp.ts              Lien wa.me + formatage du message de commande
    types.ts                 Formes de donnees (miroir de la table articles_catalogue)
supabase/schema.sql          A coller dans Supabase (table + securite lecture/ecriture)
```
