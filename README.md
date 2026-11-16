# azouni-auto-web

Site vitrine public de PIECEO_Z (le magasin AZOUNI AUTO) : catalogue en ligne (recherche, filtres par categorie / marque /
vehicule / prix, promotions), panier et commande (retrait au magasin ou livraison) transmise au magasin
et a WhatsApp -- pas de paiement en ligne (paiement a la reception). Projet separe
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
   - **service_role** key (secrete : jamais dans un fichier de ce depot, jamais en `NEXT_PUBLIC_`) ->
     a coller dans AZOUNI AUTO, page **Parametres > Synchronisation
     site web**, avec comme "URL de l'API du site" :
     `https://VOTRE-PROJET.supabase.co/rest/v1/articles_catalogue`.
     Elle va aussi, **uniquement** dans les variables d'environnement privees de Vercel
     (`SUPABASE_SERVICE_ROLE_KEY`), pour la « porte » serveur des commandes (voir § 8).

## 2. Configurer ce site

```bash
cp .env.example .env.local
```

Remplir `.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (etape 1)
- Les informations du magasin (nom, telephone, adresse, frais de livraison...) ont des valeurs par defaut dans
  `src/lib/shop.ts` ; chacune peut etre remplacee par une variable `NEXT_PUBLIC_*` (voir `.env.example`),
  par exemple `NEXT_PUBLIC_SHOP_HOURS` pour afficher les horaires (masques tant qu'ils ne sont pas renseignes).

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

## 5. Designation correcte des articles

Le site affiche le **nom propre de la piece** ("Rotule de direction droite") et les vehicules
cites ("Fiesta IV Puma"), calcules/valides dans AZOUNI AUTO, au lieu des abreviations de saisie
("RT DIR D FIESTA IV PUMA"). La designation d'origine reste visible dans la fiche article.

- Sur une base Supabase **deja creee**, executer **une fois** `supabase/ajout_designation_correcte.sql`
  (SQL Editor > New query > Run). Sans cela la synchro fonctionne quand meme, mais sans ces 2 champs :
  AZOUNI AUTO affiche un avertissement apres « Synchroniser maintenant » et le site garde la designation d'origine.
- La synchro envoie la designation correcte enregistree (et non marquee « a verifier »), sinon celle que le
  moteur de designation calcule quand il est sur de lui ; les articles « a verifier » gardent leur designation d'origine.
- Affichage : `src/lib/display.ts` (casse francaise, accents, repli sur la designation d'origine).

## 6. Fonctions du site (categories, vehicules, commandes, promotions)

Executer **une fois** `supabase/ajout_fonctions_site.sql` (SQL Editor > New query > Run) sur la base deja creee,
puis dans AZOUNI AUTO : Parametres > Site web > « Synchroniser maintenant ». Il ajoute :

- `articles_catalogue.categorie / en_vedette / prix_promo` : categories du site, articles mis en avant et prix promotionnels
  (cases de la fiche article d'AZOUNI AUTO) ;
- `vehicules_catalogue` et `vehicules_articles_catalogue` : selecteur de vehicule et filtre « pieces compatibles » ;
- `commandes_web` : commandes passees sur le site (le visiteur peut seulement en AJOUTER ; AZOUNI AUTO les lit avec la cle
  service_role, page **Commandes web**) ;
- `recherches_web` : termes cherches sans resultat (aucune donnee personnelle).

Tant que ce script n'est pas execute, le site fonctionne quand meme (sans ces nouveautes) : categories deduites du nom de la
piece, selecteur de vehicule masque, commande envoyee par WhatsApp seulement.

## 7. Recherche intelligente et numero de chassis (VIN)

- **Recherche intelligente** (`/api/recherche`, `src/lib/searchInterpret.ts`) : la barre de recherche de l'en-tete et la touche Entree du catalogue transforment une phrase
  (« plaquettes avant clio 2 ») en filtres (piece + voiture). Des **regles** repondent d'abord (voitures du site, vocabulaire du catalogue, pluriels, fautes de frappe, mots
  anglais) : gratuit et instantane. Une **IA** n'est appelee que pour les mots que les regles ne comprennent pas, et seulement si une cle est renseignee
  (`src/lib/searchAi.ts`) : `GEMINI_API_KEY` (Gemini de Google, offre **gratuite**, prioritaire) ou `ANTHROPIC_API_KEY` (Claude, payant, `claude-haiku-5-5` par defaut).
  Sa reponse est toujours verifiee : constructeur et modele doivent exister dans le selecteur de vehicule, les mots doivent exister dans le catalogue. Seuls les mots de la
  recherche sont envoyes (numeros de 5 chiffres ou plus et e-mails retires). Limites : 40 recherches/minute et 8 appels IA/minute par visiteur, 400 appels IA/jour
  (`SEARCH_AI_DAILY_MAX`), reponses gardees 24 h ; si le fournisseur refuse (limite gratuite atteinte, erreur), le site continue avec les regles.
- **Dictionnaire arabe et darija** (`src/lib/arabicLexicon.ts`) : les mots courants des pieces, des positions et des voitures, ecrits en arabe ou en darija en lettres latines
  (« فرامل » = frein, « زيت المحرك » = huile moteur, « zit » = huile, « كليو » = Clio...), sont traduits par les regles, sans IA. Les mots absents sont confies a l'IA (si activee) ;
  la liste des « recherches sans resultat » de l'application (page Commandes web) montre les mots a ajouter au dictionnaire.
- **VIN** (`src/lib/vin.ts`, champ dans le selecteur de vehicule et dans la commande) : il donne le constructeur (3 premiers caracteres) et l'annee indicative ; le modele est choisi
  dans la liste. Un lien WhatsApp permet d'envoyer le VIN complet au magasin pour verification. Dans une commande, le VIN voyage dans la remarque (pas de colonne dediee).
- **Memoire des VIN** (`/api/vin`, `src/lib/vinLearning.ts`, `supabase/ajout_vin_appris.sql`) : quand un client donne son VIN puis choisit son modele, le site retient « ces 8 premiers
  caracteres = ce modele » (le numero de serie n'est jamais envoye ni garde). Au VIN suivant du meme type, le modele est propose tout seul des que 2 clients au moins l'ont choisi et
  que 60 % au moins sont d'accord. Verifications avant d'enregistrer : le modele existe dans le selecteur, le constructeur est coherent avec le code du VIN, limites par visiteur.
  Fiabilite : seul un modele choisi A LA MAIN par le client compte comme un vote (accepter la proposition sans la changer n'en ajoute pas : une erreur ne peut pas se renforcer
  toute seule). Sources : les voitures du magasin (fichier Excel de VIN confirmes : 2 voix par debut de VIN, donc proposees tout de suite) et des jeux de donnees publics
  (types de voitures verifies a ≥ 2 VIN d'accord : 1 seule voix, donc proposes seulement apres confirmation d'un client). Les modeles dont le nom n'est que celui de la marque
  (AUDI > AUDI) sont ecartes de la liste des voitures.
  Les erreurs se corrigent en supprimant des lignes dans Supabase > Table Editor > `vin_associations`.

## 8. Comptes clients, anti-robot et remises de fidelite

Le **compte est facultatif** : un visiteur peut toujours commander sans compte. Avec un compte, le client retrouve ses coordonnees, l'historique de ses commandes
(**Mon compte**, `/compte`) et la **remise de fidelite** que le magasin lui accorde (AZOUNI AUTO, page **Comptes web**). La remise ne se cumule jamais avec une promotion
ou une remise par palier : le client paie le prix le plus bas.

Comment ca marche :

- **Compte** : gere par Supabase Auth (e-mail + mot de passe, e-mail de confirmation, mot de passe oublie). Le **profil** (nom, telephone, adresse, remise) est dans la table
  `comptes_clients`, protegee par Row Level Security : un client ne voit que son profil et ses commandes, et ne peut **jamais** modifier sa remise.
- **« Porte » serveur des commandes** (`/api/commande`, `src/lib/orderServer.ts`) : le navigateur n'envoie que des codes d'articles et des quantites ; le serveur verifie
  l'anti-robot, controle le compte, **recalcule tous les prix** depuis le catalogue (remise de fidelite lue dans la base) et enregistre la commande avec la cle `service_role`.
  Sans cette cle, la porte repond « non configure » et le site garde l'ancien enregistrement direct : rien ne casse pendant la mise en place.
- **Anti-robot** : Cloudflare Turnstile (gratuit), verifie cote serveur pour les commandes ; pour l'inscription, la connexion et le mot de passe oublie, c'est Supabase qui verifie
  (reglage « Captcha protection »).

Mise en place (dans cet ordre ; chaque etape est sans risque pour le site actuel) :

1. **Base** : SQL Editor > New query > coller `supabase/ajout_comptes_clients.sql` > Run (relancable sans danger).
2. **Supabase > Authentication > URL Configuration** : `Site URL` = l'adresse publique du site (sans « / » final), par exemple `https://www.exemple.tn`.
3. **Supabase > Authentication > Emails > SMTP Settings** : activer « Custom SMTP » avec un service d'envoi (Brevo : 300 e-mails/jour gratuits ; Resend : 100/jour) et une adresse
   expediteur du nom de domaine du site (ex. `no-reply@exemple.tn`, avec la verification du domaine demandee par le service). **Sans SMTP personnel, Supabase n'envoie qu'a
   l'equipe du projet (2 e-mails par heure) : suffisant pour tester, pas pour des clients.**
4. **Supabase > Authentication > Emails > Templates** : coller le contenu de `supabase/modeles_emails/confirmation_inscription.html` dans « Confirm signup » (objet :
   `Confirmez votre adresse e-mail - PIECEO_Z`) et `mot_de_passe_oublie.html` dans « Reset password » (objet : `Votre nouveau mot de passe - PIECEO_Z`).
5. **Supabase > Authentication > Sign In / Providers > Email** : « Confirm email » active, « Minimum password length » = 8.
6. **Cloudflare Turnstile** (dash.cloudflare.com > Turnstile > Add site, mode « Managed ») : copier la **cle du site** et la **cle secrete**.
7. **Vercel > Settings > Environment Variables** : ajouter `SUPABASE_SERVICE_ROLE_KEY` (cle service_role, **privee**), `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`,
   et `NEXT_PUBLIC_SITE_URL` (adresse du site) ; puis redeployer.
8. **Supabase > Authentication > Attack Protection** : activer « Captcha protection », fournisseur Cloudflare Turnstile, coller la **cle secrete**. A faire **apres** l'etape 7 et le
   deploiement : le site envoie alors le jeton anti-robot avec chaque inscription / connexion.
9. **Tester** : creer un compte, cliquer sur le lien recu, passer une commande de test (elle apparait dans AZOUNI AUTO > Commandes web, avec le compte).
10. **Fermer l'ancienne porte** : une fois le test reussi, executer `supabase/durcir_commandes.sql` (SQL Editor). Plus aucune commande n'est alors acceptee sans passer par le serveur
    (anti-robot, prix recalcules). Pour revenir en arriere : relancer `supabase/ajout_comptes_clients.sql`.

En developpement local, Cloudflare fournit des cles de test qui reussissent toujours : cle du site `1x00000000000000000000AA`, cle secrete `1x0000000000000000000000000000000AA`.
Sans `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, aucun widget n'est affiche et rien n'est verifie.

## Ce qui n'est pas fait (volontairement)

- Paiement en ligne : la commande se regle a la reception (magasin ou livreur).
- Version arabe, nom de domaine `.tn`, avis Google, retrait avec paiement anticipe.
- E-mails de suivi de commande (recue / confirmee / livree) : seconde phase des comptes clients.

## Architecture

```
src/
  app/
    page.tsx                Accueil (bandeau, selecteur de vehicule, categories, promotions, magasin)
    catalogue/              Catalogue : filtres dans l'adresse (?categorie=...&marque=...&vehicule=...&max=...&promo=1)
    article/[code]/         Fiche article (prix promo, articles de la meme categorie, donnees structurees)
    panier/                 Panier + formulaire de commande (retrait / livraison, remise de fidelite)
    commande/merci/         Confirmation de commande
    compte/                 Mon compte (connexion, inscription, profil, commandes) ; compte/confirmation = lien des e-mails
    api/commande/           Porte serveur des commandes (anti-robot, compte, prix recalcules, enregistrement)
    livraison-paiement/     Page d'information
    contact/                Coordonnees, plan d'acces
    sitemap.ts, robots.ts   Referencement
    layout.tsx              Barre d'annonce, en-tete, pied de page, bouton WhatsApp
  components/               Header, Footer, Catalogue, VehicleSelector, ArticleCard, CarLogo...
  lib/
    shop.ts                 Informations du magasin et regle de livraison
    supabase.ts             Lecture Supabase (cle anon uniquement)
    catalogue-data.ts       Catalogue et index des vehicules (mis en cache)
    categoryRules.ts        Regles de categories -- COPIE IDENTIQUE de azouni-auto/shared/webCategoryRules.ts
    orders.ts, searchLog.ts Enregistrement des commandes et des recherches sans resultat
    orderServer.ts          Porte serveur : validation, anti-robot, compte, prix recalcules (testable, sans Next.js)
    loyalty.ts              Remise de fidelite (meilleur prix, jamais cumulee) -- meme regle que le magasin
    auth.ts, account.ts     Comptes clients : API Supabase Auth en fetch, session dans le navigateur
    carLogos.ts             Logos des constructeurs (Simple Icons, CC0) -- genere, ne pas modifier a la main
supabase/
  schema.sql                Tables de depart
  ajout_designation_correcte.sql, ajout_fonctions_site.sql    Ajouts a executer une fois sur une base existante
  ajout_comptes_clients.sql Comptes clients (profils, remise de fidelite, droits) ; durcir_commandes.sql = a executer en dernier (§ 8)
  modeles_emails/           E-mails de confirmation d'inscription et de mot de passe oublie (a coller dans Supabase)
```
