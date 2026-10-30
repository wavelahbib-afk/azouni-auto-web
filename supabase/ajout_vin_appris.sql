-- A executer UNE SEULE FOIS dans Supabase (SQL Editor > New query > Run), apres ajout_fonctions_site.sql. Relancable sans risque.
--
-- "Memoire des numeros de chassis" : quand un client donne son VIN puis choisit son modele, le site retient "ces 8 premiers caracteres du VIN = ce modele" (les 8 premiers
-- caracteres decrivent le TYPE de voiture ; le numero de serie, qui identifie une voiture precise, n'est jamais envoye ni garde). Au VIN suivant du meme type, le site propose le
-- modele tout seul, des qu'au moins 2 clients l'ont choisi et que 60 % au moins sont d'accord.
--
-- Tant que ce script n'est pas execute, le site fonctionne normalement, sans cette memoire.

create table if not exists vin_associations (
  id bigint generated always as identity primary key,
  prefix text not null,
  make text not null,
  model text not null,
  created_at timestamptz not null default now(),
  constraint vin_associations_prefix check (prefix ~ '^[A-HJ-NPR-Z0-9]{8}$')
);
create index if not exists idx_vin_associations_prefix on vin_associations(prefix);
alter table vin_associations enable row level security;

-- Le site peut seulement AJOUTER une association (jamais lire, modifier ni supprimer la table).
drop policy if exists "Le site peut enregistrer une association de VIN" on vin_associations;
create policy "Le site peut enregistrer une association de VIN"
  on vin_associations for insert
  with check (char_length(make) between 2 and 40 and char_length(model) between 1 and 40);
grant insert on vin_associations to anon;

-- Vue lue par le site : nombre de clients ayant choisi chaque modele pour un debut de VIN (aucune donnee personnelle).
create or replace view vin_modeles_appris as
  select prefix, make, model, count(*)::int as votes
  from vin_associations
  group by prefix, make, model;
grant select on vin_modeles_appris to anon;

-- Pour corriger une erreur (modele mal choisi par des clients), supprimer les lignes concernees depuis Supabase > Table Editor > vin_associations.

notify pgrst, 'reload schema';
