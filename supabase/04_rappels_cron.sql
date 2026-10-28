-- Planificateur des rappels : la fonction « rappels » tourne deux fois par jour
-- à 9h30 et 18h30 heure suisse toute l'année : appel aux deux heures UTC possibles, la fonction
-- ne garde que celle qui tombe à la bonne heure locale (changement d'heure compris).
-- À coller dans l'éditeur SQL de Supabase (une seule fois). La clé ci-dessous est la clé
-- publique « anon » du projet, celle qui est déjà dans config.js.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname in ('maison_rappels_matin', 'maison_rappels_soir');
select cron.schedule('maison_rappels_matin', '30 7,8 * * *', $$
  select net.http_post(
    url := 'https://gnmpivrngageogbqanwj.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXBpdnJuZ2FnZW9nYnFhbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzMxMTgsImV4cCI6MjEwODYwOTExOH0.BiTT-3HPvRTG8UjuNFPGK828ZOveQcEvBYE_ve5GvXQ'),
    body := '{"action":"run","heure":9}'::jsonb);
$$);
select cron.schedule('maison_rappels_soir', '30 16,17 * * *', $$
  select net.http_post(
    url := 'https://gnmpivrngageogbqanwj.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXBpdnJuZ2FnZW9nYnFhbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzMxMTgsImV4cCI6MjEwODYwOTExOH0.BiTT-3HPvRTG8UjuNFPGK828ZOveQcEvBYE_ve5GvXQ'),
    body := '{"action":"run","heure":18}'::jsonb);
$$);

-- Minuteurs du lave-vaisselle, de la lessive et des recettes : vérification chaque minute.
select cron.unschedule(jobid) from cron.job where jobname = 'maison_minuteurs';
select cron.schedule('maison_minuteurs', '* * * * *', $$
  select net.http_post(
    url := 'https://gnmpivrngageogbqanwj.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXBpdnJuZ2FnZW9nYnFhbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzMxMTgsImV4cCI6MjEwODYwOTExOH0.BiTT-3HPvRTG8UjuNFPGK828ZOveQcEvBYE_ve5GvXQ'),
    body := '{"action":"minuteurs"}'::jsonb);
$$);
