-- A executer UNE SEULE FOIS dans Supabase (SQL Editor > New query > Run), sur la base DEJA creee (apres schema.sql, ajout_designation_correcte.sql et ajout_fonctions_site.sql).
-- Script sans risque : relancable, ne modifie ni ne supprime aucune donnee existante (les commandes deja enregistrees restent telles quelles).
--
-- Il ajoute les COMPTES CLIENTS du site :
--   1. la table comptes_clients : un profil par client qui cree un compte (nom, telephone, adresse, remise de fidelite fixee par le magasin) ; le compte lui-meme (e-mail, mot de passe,
--      lien de confirmation) est gere par Supabase Auth ;
--   2. la creation AUTOMATIQUE du profil quand un client s'inscrit, et la mise a jour de « e-mail confirme » quand il clique sur le lien recu ;
--   3. des colonnes en plus sur commandes_web (compte, e-mail, remise accordee) pour l'historique « Mes commandes » et la page « Comptes web » d'AZOUNI AUTO.
--
-- Securite (Row Level Security) : un client ne voit QUE son profil et SES commandes ; il peut modifier son nom, son telephone et son adresse -- JAMAIS sa remise de fidelite (seul le magasin,
-- avec la cle service_role d'AZOUNI AUTO, la fixe). Les commandes d'un visiteur sans compte continuent de s'enregistrer comme avant.

-- 1. Profils ------------------------------------------------------------------------------------------------------------------------------
create table if not exists comptes_clients (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nom text not null default '',
  telephone text,
  adresse text,
  ville text,
  -- remise de fidelite en % (0 a 90), fixee par le magasin dans AZOUNI AUTO (page « Comptes web ») ; jamais modifiable par le client
  remise_pct numeric not null default 0,
  note_interne text,
  email_confirme boolean not null default false,
  created_at timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint comptes_clients_remise check (remise_pct >= 0 and remise_pct <= 90),
  constraint comptes_clients_nom check (char_length(nom) <= 120),
  constraint comptes_clients_telephone check (telephone is null or telephone ~ '^[0-9]{8}$'),
  constraint comptes_clients_adresse check (adresse is null or char_length(adresse) <= 300),
  constraint comptes_clients_ville check (ville is null or char_length(ville) <= 100)
);
create index if not exists idx_comptes_clients_created on comptes_clients(created_at desc);
create index if not exists idx_comptes_clients_telephone on comptes_clients(telephone);
alter table comptes_clients enable row level security;

drop policy if exists "Le client lit son compte" on comptes_clients;
create policy "Le client lit son compte" on comptes_clients for select to authenticated using (id = auth.uid());
drop policy if exists "Le client modifie son compte" on comptes_clients;
create policy "Le client modifie son compte" on comptes_clients for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- droits : Supabase donne tout par defaut ; on retire tout puis on n'accorde que le necessaire (lecture de SON profil, modification de 4 colonnes, jamais la remise)
revoke all on comptes_clients from anon, authenticated;
grant select on comptes_clients to authenticated;
grant update (nom, telephone, adresse, ville) on comptes_clients to authenticated;

-- date de derniere modification
create or replace function public.comptes_clients_maj() returns trigger language plpgsql as $$
begin
  new.maj_le := now();
  return new;
end $$;
drop trigger if exists comptes_clients_maj_le on comptes_clients;
create trigger comptes_clients_maj_le before update on comptes_clients for each row execute function public.comptes_clients_maj();

-- 2. Profil cree automatiquement a l'inscription ; « e-mail confirme » mis a jour quand le client clique sur le lien ------------------------
create or replace function public.creer_compte_client() returns trigger language plpgsql security definer set search_path = public as $$
declare
  tel text;
begin
  tel := regexp_replace(coalesce(new.raw_user_meta_data ->> 'telephone', ''), '[^0-9]', '', 'g');
  if length(tel) = 11 and left(tel, 3) = '216' then tel := substr(tel, 4); end if;
  -- le nom et le telephone viennent du formulaire d'inscription ; la remise, JAMAIS (toujours 0 a la creation)
  insert into public.comptes_clients (id, email, nom, telephone, email_confirme)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data ->> 'nom', ''), 120), case when tel ~ '^[0-9]{8}$' then tel else null end, new.email_confirmed_at is not null)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.creer_compte_client();

create or replace function public.maj_compte_client() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.comptes_clients set email = new.email, email_confirme = (new.email_confirmed_at is not null) where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated after update of email, email_confirmed_at on auth.users for each row execute function public.maj_compte_client();

-- profils des comptes DEJA existants (si le projet avait deja des utilisateurs) : creation sans toucher aux autres
insert into comptes_clients (id, email, email_confirme)
select u.id, coalesce(u.email, ''), u.email_confirmed_at is not null from auth.users u
on conflict (id) do nothing;

-- 3. Commandes : compte, e-mail et remise accordee -----------------------------------------------------------------------------------------
alter table commandes_web add column if not exists compte_id uuid references comptes_clients(id) on delete set null;
alter table commandes_web add column if not exists email text;
alter table commandes_web add column if not exists remise_pct numeric not null default 0;
alter table commandes_web add column if not exists remise_montant numeric not null default 0;
create index if not exists idx_commandes_web_compte on commandes_web(compte_id, created_at desc);

-- droits : Supabase donne tout par defaut aux visiteurs (anon) et aux clients connectes (authenticated), seules les regles ci-dessous les bloquaient. On retire tout, puis on n'accorde que le necessaire :
-- le visiteur AJOUTE une commande (jamais de lecture), le client connecte LIT les siennes (jamais d'ecriture, de modification ni de suppression)
revoke all on commandes_web from anon, authenticated;

-- un client connecte lit SES commandes (et seulement les siennes)
drop policy if exists "Le client lit ses commandes" on commandes_web;
create policy "Le client lit ses commandes" on commandes_web for select to authenticated using (compte_id = auth.uid());
grant select on commandes_web to authenticated;

-- le visiteur sans compte peut toujours AJOUTER une commande « nouvelle », mais sans pretendre a un compte, a une remise ou a un e-mail verifie : ces champs sont reserves a la
-- « porte serveur » du site (qui verifie le compte et recalcule les prix) -- meme conditions qu'avant, plus ces trois-la
drop policy if exists "Le site peut enregistrer une commande" on commandes_web;
create policy "Le site peut enregistrer une commande"
  on commandes_web for insert to anon
  with check (
    statut = 'nouvelle'
    and compte_id is null
    and email is null
    and remise_pct = 0
    and remise_montant = 0
    and char_length(ref) between 4 and 12
    and char_length(nom) between 2 and 120
    and telephone ~ '^[0-9]{8}$'
    and jsonb_typeof(lignes) = 'array'
    and jsonb_array_length(lignes) between 1 and 100
    and (adresse is null or char_length(adresse) <= 300)
    and (ville is null or char_length(ville) <= 100)
    and (note is null or char_length(note) <= 500)
  );

grant insert on commandes_web to anon;

-- demande a l'API de Supabase de prendre en compte les nouvelles colonnes et tables tout de suite
notify pgrst, 'reload schema';
