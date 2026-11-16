-- A executer UNE SEULE FOIS, SEULEMENT APRES avoir mis en ligne la « porte serveur » des commandes du site (route /api/commande) et verifie qu'une commande de test arrive bien dans AZOUNI AUTO.
--
-- Avant ce script, la base accepte encore les commandes envoyees directement par le navigateur avec la cle publique (c'est ce qui permet au site de continuer a fonctionner pendant la mise en place).
-- Un robot peut alors contourner le formulaire et son anti-robot. Ce script FERME cette porte : desormais, seules les commandes qui passent par le site (anti-robot verifie, prix recalcules, remise de
-- fidelite controlee) sont enregistrees.
--
-- A NE PAS executer avant : sans la variable SUPABASE_SERVICE_ROLE_KEY du site (Vercel > Settings > Environment Variables) et le deploiement de la porte serveur, plus aucune commande ne serait
-- enregistree (elles partiraient seulement par WhatsApp). Pour revenir en arriere : relancer ajout_comptes_clients.sql (il recree la regle d'avant).

drop policy if exists "Le site peut enregistrer une commande" on commandes_web;
revoke insert on commandes_web from anon;

notify pgrst, 'reload schema';
