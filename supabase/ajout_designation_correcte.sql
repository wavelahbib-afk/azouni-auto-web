-- A executer UNE SEULE FOIS dans Supabase (SQL Editor > New query > Run) sur une base DEJA creee :
-- ajoute les 2 colonnes que la synchro d'AZOUNI AUTO remplit pour que le site affiche la DESIGNATION CORRECTE des articles
-- (ex. "Rotule de direction droite") et les vehicules cites dans la designation d'origine.
--
-- Sans ces colonnes la synchro fonctionne quand meme (le catalogue est envoye sans la designation correcte) et le site affiche la designation d'origine ;
-- AZOUNI AUTO le signale alors apres "Synchroniser maintenant". Script sans risque : relancable, ne modifie aucune donnee existante.

alter table articles_catalogue add column if not exists designation_correcte text;
alter table articles_catalogue add column if not exists vehicules_compatibles text;

-- demande a l'API de Supabase de prendre en compte les nouvelles colonnes tout de suite
notify pgrst, 'reload schema';
