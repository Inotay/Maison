-- Facultatif : la partie Libido a été retirée de l'app. Ce script efface la table et la fonction
-- qui lui servaient. À coller dans SQL Editor et lancer Run.
drop function if exists public.libido_match();
drop table if exists public.libido;
