-- Durcissement, à appliquer après schema.sql (SQL Editor > Run).

-- 1. Seules les adresses de members peuvent créer un compte.
create or replace function public.only_members_can_sign_up() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.members where email = lower(new.email)) then
    raise exception 'Cette adresse n''est pas membre de la maison.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists only_members_can_sign_up on auth.users;
create trigger only_members_can_sign_up before insert on auth.users
  for each row execute function public.only_members_can_sign_up();

-- 2. L'historique des corvées survit à la suppression d'une corvée.
alter table public.chore_log drop constraint if exists chore_log_chore_id_fkey;
alter table public.chore_log add constraint chore_log_chore_id_fkey
  foreign key (chore_id) references public.chores(id) on delete set null;

-- 3. Fonctions utilitaires réservées aux connectés.
revoke all on function public.me() from public, anon;
grant execute on function public.me() to authenticated;

-- 4. Un mot care part toujours non lu, signé par son auteur.
drop policy if exists care_write on public.care_messages;
create policy care_write on public.care_messages
  for insert to authenticated
  with check ((select public.is_member()) and author = (select public.me()) and recipient <> (select public.me()) and read_at is null);
