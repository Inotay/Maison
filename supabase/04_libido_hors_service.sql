-- L'ancienne section libido a été retirée de l'app : on coupe tout accès depuis l'app, sans rien effacer.
-- (Pour la supprimer pour de bon, plus tard : 03_retrait_libido.sql.)
revoke all on table public.libido from anon, authenticated;
revoke all on function public.libido_match() from public, anon, authenticated;
