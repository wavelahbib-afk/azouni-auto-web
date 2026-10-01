-- A coller UNE FOIS dans Supabase (tableau de bord > SQL Editor > New query
-- > Run). Cree la table lue par le site et la protege : lecture publique,
-- ecriture uniquement avec la cle service_role (jamais exposee au site, voir
-- README.md et electron/services/webSyncService.ts dans azouni-auto).
--
-- Sur un projet Supabase DEJA cree avant l'ajout d'une section (photo_url,
-- article_vehicle_compat_catalogue...), relancer tout ce script ne pose pas
-- de probleme (create table/policy "if not exists"), SAUF les `create
-- policy` qui echouent si la policy existe deja -- dans ce cas, n'executez
-- que les lignes qui manquent (ex. juste l'ALTER TABLE + la nouvelle table).

create table if not exists articles_catalogue (
  code text primary key,
  reference text,
  designation text not null,
  marque text,
  famille text,
  sous_famille text,
  prix_vente_ttc numeric not null default 0,
  stock_qty numeric not null default 0,
  rayon text,
  -- URL publique de la photo (bucket de stockage "article-photos"), remplie
  -- par la synchro seulement si l'article a une photo ET qu'elle a ete
  -- retrouvee sur le disque -- null sinon (icone generique cote site).
  photo_url text,
  updated_at timestamptz not null default now()
);

alter table articles_catalogue enable row level security;

-- Lecture publique (site vitrine) : cle "anon".
create policy "Lecture publique du catalogue"
  on articles_catalogue for select
  using (true);

-- Pas de policy insert/update/delete pour anon/authenticated : seule la cle
-- service_role (qui contourne systematiquement RLS) peut ecrire, utilisee
-- uniquement par AZOUNI AUTO (jamais par le navigateur).

-- References equivalentes/d'origine (miroir de article_equivalences dans
-- AZOUNI AUTO) : affichees sur la fiche article et utilisees par la
-- recherche du site pour retrouver un article par une reference concurrente.
create table if not exists article_equivalences_catalogue (
  id bigint generated always as identity primary key,
  code text not null references articles_catalogue(code) on delete cascade,
  equivalent_reference text not null
);
create index if not exists idx_equiv_catalogue_code on article_equivalences_catalogue(code);

alter table article_equivalences_catalogue enable row level security;

create policy "Lecture publique des equivalences"
  on article_equivalences_catalogue for select
  using (true);

-- Vehicules compatibles (miroir de article_vehicle_compat dans AZOUNI AUTO),
-- extraits du texte REPXPERT colle (shared/references.ts::extractCompatibleVehicles) :
-- affiches sur la fiche article (bouton "Vehicules compatibles").
create table if not exists article_vehicle_compat_catalogue (
  id bigint generated always as identity primary key,
  code text not null references articles_catalogue(code) on delete cascade,
  make text not null,
  model text not null
);
create index if not exists idx_vehicle_compat_catalogue_code on article_vehicle_compat_catalogue(code);

alter table article_vehicle_compat_catalogue enable row level security;

create policy "Lecture publique des vehicules compatibles"
  on article_vehicle_compat_catalogue for select
  using (true);
