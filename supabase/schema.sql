-- Maison : schéma de la base Supabase
-- À coller une seule fois dans Supabase > SQL Editor > New query, puis Run.
-- Toutes les tables sont protégées : seules les adresses listées dans
-- public.members peuvent lire ou écrire quoi que ce soit.

create extension if not exists pgcrypto;

-- Membres du foyer --------------------------------------------------------

create table if not exists public.members (
  email      text primary key check (email = lower(email)),
  name       text not null,
  created_at timestamptz not null default now()
);

create or replace function public.me() returns text
language sql stable as $$ select lower(auth.email()) $$;

create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where email = lower(auth.email()));
$$;

-- À faire -----------------------------------------------------------------

create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  assignee   text references public.members(email) on update cascade, -- null = nous deux
  due_on     date,
  done       boolean not null default false,
  done_at    timestamptz,
  created_by text not null default public.me(),
  created_at timestamptz not null default now()
);

-- Ménage et tournus -------------------------------------------------------

create table if not exists public.chores (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  every_days   int  not null default 7 check (every_days > 0),
  turn         text references public.members(email) on update cascade,
  last_done_at timestamptz,
  last_done_by text,
  created_by   text not null default public.me(),
  created_at   timestamptz not null default now()
);

create table if not exists public.chore_log (
  id       uuid primary key default gen_random_uuid(),
  chore_id uuid references public.chores(id) on delete cascade,
  title    text,
  done_by  text not null default public.me(),
  done_at  timestamptz not null default now()
);

-- Dépenses ----------------------------------------------------------------
-- payer_share = part de la dépense qui revient à la personne qui a payé.
-- 0.5 = moitié-moitié, 0 = avance pour l'autre (ou remboursement).

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  label         text not null,
  amount        numeric(10,2) not null check (amount > 0),
  paid_by       text not null references public.members(email) on update cascade,
  payer_share   numeric(4,3) not null default 0.5 check (payer_share between 0 and 1),
  category      text not null default 'maison',
  spent_on      date not null default current_date,
  is_settlement boolean not null default false,
  created_by    text not null default public.me(),
  created_at    timestamptz not null default now()
);

-- Courses -----------------------------------------------------------------

create table if not exists public.shopping (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  checked    boolean not null default false,
  added_by   text not null default public.me(),
  created_at timestamptz not null default now()
);

-- Tableau (communications) ------------------------------------------------

create table if not exists public.board (
  id         uuid primary key default gen_random_uuid(),
  body       text not null,
  important  boolean not null default false,
  pinned     boolean not null default false,
  author     text not null default public.me(),
  created_at timestamptz not null default now()
);

-- Care : boîte aux lettres ------------------------------------------------

create table if not exists public.care_messages (
  id         uuid primary key default gen_random_uuid(),
  author     text not null default public.me(),
  recipient  text not null references public.members(email) on update cascade,
  kind       text,
  body       text not null,
  wants_talk boolean not null default false,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

-- Libido : chacun ne voit que sa propre ligne -----------------------------

create table if not exists public.libido (
  email      text primary key default public.me() references public.members(email) on update cascade,
  is_on      boolean not null default false,
  until      timestamptz,
  updated_at timestamptz not null default now()
);

-- Règles d'accès ----------------------------------------------------------

alter table public.members       enable row level security;
alter table public.tasks         enable row level security;
alter table public.chores        enable row level security;
alter table public.chore_log     enable row level security;
alter table public.expenses      enable row level security;
alter table public.shopping      enable row level security;
alter table public.board         enable row level security;
alter table public.care_messages enable row level security;
alter table public.libido        enable row level security;

drop policy if exists members_read on public.members;
create policy members_read on public.members
  for select to authenticated using (public.is_member());

do $$
declare t text;
begin
  foreach t in array array['tasks','chores','chore_log','expenses','shopping','board'] loop
    execute format('drop policy if exists shared_all on public.%I', t);
    execute format(
      'create policy shared_all on public.%I for all to authenticated
         using (public.is_member()) with check (public.is_member())', t);
  end loop;
end $$;

-- Care : on ne voit que ce qu'on a écrit ou ce qui nous est adressé.
drop policy if exists care_read   on public.care_messages;
drop policy if exists care_write  on public.care_messages;
drop policy if exists care_delete on public.care_messages;

create policy care_read on public.care_messages
  for select to authenticated
  using (public.is_member() and (author = public.me() or recipient = public.me()));

create policy care_write on public.care_messages
  for insert to authenticated
  with check (public.is_member() and author = public.me() and recipient <> public.me());

create policy care_delete on public.care_messages
  for delete to authenticated
  using (author = public.me());

-- Le destinataire marque un mot comme lu, sans pouvoir le modifier.
create or replace function public.care_mark_read(msg uuid) returns void
language sql security definer set search_path = public as $$
  update public.care_messages
     set read_at = coalesce(read_at, now())
   where id = msg and recipient = lower(auth.email());
$$;

-- Libido : uniquement sa propre ligne.
drop policy if exists libido_own on public.libido;
create policy libido_own on public.libido
  for all to authenticated
  using (public.is_member() and email = public.me())
  with check (public.is_member() and email = public.me());

-- Match à l'aveugle : vrai seulement si l'appelant ET l'autre ont allumé.
-- Ne révèle jamais l'état de l'autre quand on a soi-même éteint.
create or replace function public.libido_match() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_member()
     and exists (select 1 from public.libido
                  where email = lower(auth.email()) and is_on
                    and (until is null or until > now()))
     and exists (select 1 from public.libido
                  where email <> lower(auth.email()) and is_on
                    and (until is null or until > now()));
$$;

revoke all on function public.care_mark_read(uuid) from public, anon;
revoke all on function public.libido_match()       from public, anon;
grant execute on function public.care_mark_read(uuid) to authenticated;
grant execute on function public.libido_match()       to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- Mises à jour en direct (sauf libido, qui reste privée) -----------------

do $$
declare t text;
begin
  foreach t in array array['tasks','chores','chore_log','expenses','shopping','board','care_messages'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Dernière étape, dans une requête séparée (adresses en minuscules) :
-- insert into public.members (email, name) values
--   ('ton.adresse@exemple.ch', 'Prénom 1'),
--   ('son.adresse@exemple.ch', 'Prénom 2');
