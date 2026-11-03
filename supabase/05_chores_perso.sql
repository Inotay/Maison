-- Tâches perso (« Pour moi ») : une corvée avec prive = email n'est visible que de cette personne.
alter table public.chores add column if not exists prive text references public.members(email) on update cascade;
alter policy shared_all on public.chores
  using ((select is_member()) and (prive is null or prive = (select public.me())))
  with check ((select is_member()) and (prive is null or prive = (select public.me())));
