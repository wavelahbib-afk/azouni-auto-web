-- A executer UNE SEULE FOIS dans Supabase (SQL Editor > New query > Run), sur la base DEJA creee (apres schema.sql et ajout_designation_correcte.sql).
-- Script sans risque : relancable, ne modifie ni ne supprime aucune donnee existante.
--
-- Il ajoute ce qu'il faut aux nouvelles fonctions du site :
--   1. categories, articles mis en avant et prix promotionnels (3 colonnes de articles_catalogue) ;
--   2. selecteur de vehicule (constructeur / modele) et filtre "pieces compatibles" du catalogue (2 tables remplies par la synchro d'AZOUNI AUTO) ;
--   3. commandes passees depuis le site (table commandes_web) : le client l'enregistre, AZOUNI AUTO la lit (page "Commandes web") ;
--   4. recherches sans resultat (table recherches_web) : ce que les clients cherchent sans le trouver.
--
-- Tant que ce script n'est pas execute, le site continue de fonctionner (sans ces nouveautes) et AZOUNI AUTO le signale apres "Synchroniser maintenant".
-- Apres l'avoir execute : dans AZOUNI AUTO, Parametres > Site web > "Synchroniser maintenant" pour remplir les nouvelles donnees.

-- 1. Colonnes du catalogue ---------------------------------------------------------------------------------------------------------------
alter table articles_catalogue add column if not exists categorie text;
alter table articles_catalogue add column if not exists en_vedette boolean not null default false;
alter table articles_catalogue add column if not exists prix_promo numeric;

-- 2. Vehicules ---------------------------------------------------------------------------------------------------------------------------
-- Index du selecteur : un modele de chaque constructeur et le nombre d'articles compatibles.
create table if not exists vehicules_catalogue (
  make text not null,
  model text not null,
  nb integer not null default 0,
  primary key (make, model)
);
alter table vehicules_catalogue enable row level security;
drop policy if exists "Lecture publique des vehicules" on vehicules_catalogue;
create policy "Lecture publique des vehicules" on vehicules_catalogue for select using (true);

-- Articles compatibles avec chaque modele (noms de constructeurs/modeles nettoyes par AZOUNI AUTO) : sert au filtre du catalogue.
create table if not exists vehicules_articles_catalogue (
  id bigint generated always as identity primary key,
  code text not null references articles_catalogue(code) on delete cascade,
  make text not null,
  model text not null
);
create index if not exists idx_vehicules_articles_make_model on vehicules_articles_catalogue(make, model);
create index if not exists idx_vehicules_articles_code on vehicules_articles_catalogue(code);
alter table vehicules_articles_catalogue enable row level security;
drop policy if exists "Lecture publique des articles par vehicule" on vehicules_articles_catalogue;
create policy "Lecture publique des articles par vehicule" on vehicules_articles_catalogue for select using (true);

-- 3. Commandes du site -------------------------------------------------------------------------------------------------------------------
-- Le visiteur peut seulement AJOUTER une commande "nouvelle" (jamais lire, modifier ni supprimer) ; AZOUNI AUTO la lit et change son statut avec la cle service_role.
create table if not exists commandes_web (
  id bigint generated always as identity primary key,
  ref text not null unique,
  created_at timestamptz not null default now(),
  nom text not null,
  telephone text not null,
  mode text not null default 'retrait',
  adresse text,
  ville text,
  note text,
  sous_total numeric not null default 0,
  frais_livraison numeric not null default 0,
  total numeric not null default 0,
  lignes jsonb not null,
  statut text not null default 'nouvelle',
  maj_le timestamptz not null default now(),
  constraint commandes_web_mode check (mode in ('retrait', 'livraison')),
  constraint commandes_web_statut check (statut in ('nouvelle', 'confirmee', 'livree', 'annulee'))
);
create index if not exists idx_commandes_web_created on commandes_web(created_at desc);
create index if not exists idx_commandes_web_statut on commandes_web(statut);
alter table commandes_web enable row level security;
drop policy if exists "Le site peut enregistrer une commande" on commandes_web;
create policy "Le site peut enregistrer une commande"
  on commandes_web for insert
  with check (
    statut = 'nouvelle'
    and char_length(ref) between 4 and 12
    and char_length(nom) between 2 and 120
    and telephone ~ '^[0-9]{8}$'
    and jsonb_typeof(lignes) = 'array'
    and jsonb_array_length(lignes) between 1 and 100
    and (adresse is null or char_length(adresse) <= 300)
    and (ville is null or char_length(ville) <= 100)
    and (note is null or char_length(note) <= 500)
  );

-- 4. Recherches sans resultat ------------------------------------------------------------------------------------------------------------
-- Seulement le terme cherche (aucune donnee personnelle). Meme principe : le site ajoute, AZOUNI AUTO lit.
create table if not exists recherches_web (
  id bigint generated always as identity primary key,
  terme text not null,
  nb_resultats integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_recherches_web_terme on recherches_web(terme);
alter table recherches_web enable row level security;
drop policy if exists "Le site peut enregistrer une recherche" on recherches_web;
create policy "Le site peut enregistrer une recherche"
  on recherches_web for insert
  with check (char_length(terme) between 3 and 80);

-- droits : le visiteur du site (role anon) peut seulement ajouter une ligne ; la lecture et les mises a jour passent par la cle service_role d'AZOUNI AUTO
grant insert on commandes_web to anon;
grant insert on recherches_web to anon;

-- demande a l'API de Supabase de prendre en compte les nouvelles colonnes et tables tout de suite
notify pgrst, 'reload schema';
