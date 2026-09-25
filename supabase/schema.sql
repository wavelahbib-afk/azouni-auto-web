-- A coller UNE FOIS dans Supabase (tableau de bord > SQL Editor > New query
-- > Run). Cree la table lue par le site et la protege : lecture publique,
-- ecriture uniquement avec la cle service_role (jamais exposee au site, voir
-- README.md et electron/services/webSyncService.ts dans azouni-auto).

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
