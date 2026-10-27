-- Planificateur des rappels : la fonction « rappels » tourne deux fois par jour
-- (8h30 et 17h30 UTC, soit 9h30 / 10h30 et 18h30 / 19h30 en Suisse selon la saison).
-- À coller dans l'éditeur SQL de Supabase (une seule fois). La clé ci-dessous est la clé
-- publique « anon » du projet, celle qui est déjà dans config.js.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select cron.unschedule(jobid) from cron.job where jobname in ('maison_rappels_matin', 'maison_rappels_soir');
select cron.schedule('maison_rappels_matin', '30 8 * * *', $$
  select net.http_post(
    url := 'https://gnmpivrngageogbqanwj.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXBpdnJuZ2FnZW9nYnFhbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzMxMTgsImV4cCI6MjEwODYwOTExOH0.BiTT-3HPvRTG8UjuNFPGK828ZOveQcEvBYE_ve5GvXQ'),
    body := '{"action":"run"}'::jsonb);
$$);
select cron.schedule('maison_rappels_soir', '30 17 * * *', $$
  select net.http_post(
    url := 'https://gnmpivrngageogbqanwj.supabase.co/functions/v1/rappels',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubXBpdnJuZ2FnZW9nYnFhbndqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwMzMxMTgsImV4cCI6MjEwODYwOTExOH0.BiTT-3HPvRTG8UjuNFPGK828ZOveQcEvBYE_ve5GvXQ'),
    body := '{"action":"run"}'::jsonb);
$$);
