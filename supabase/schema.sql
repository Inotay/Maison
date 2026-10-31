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
  fixed        boolean not null default false,   -- toujours la même personne (ou personne : « qui veut »), pas de tournus
  sorte        text,                               -- poubelles, papier, verre, compost : suit le calendrier de ramassage
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

-- Réussites : journal permanent de tout ce qui a été fait (jamais modifié, jamais effacé par l'app).
create table if not exists public.wins (
  id      uuid primary key default gen_random_uuid(),
  kind    text not null,            -- task, chore, shop, settle
  title   text,
  done_by text not null default public.me(),
  done_at timestamptz not null default now(),
  weight  int not null default 1,
  icon    text
);
alter table public.wins enable row level security;
drop policy if exists wins_read on public.wins;
create policy wins_read on public.wins for select to authenticated using (public.is_member());
drop policy if exists wins_insert on public.wins;
create policy wins_insert on public.wins for insert to authenticated with check (public.is_member());
create index if not exists wins_done_at on public.wins (done_at desc);

-- Calendrier partagé : réglages lus uniquement par la fonction « agenda » (aucune règle pour les comptes).
create table if not exists public.caldav_config (
  id int primary key default 1 check (id = 1),
  apple_id text not null,
  app_password text not null,
  calendar_name text not null,
  calendar_href text not null,
  set_by text not null default public.me(),
  updated_at timestamptz not null default now()
);
alter table public.caldav_config enable row level security;

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
  shop       text,                                 -- super, asie, maison, pharma, azami, autre
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

-- Minuteurs de cuisine (recettes) : copie côté serveur pour que la notification parte même app fermée.
create table if not exists public.kitchen_timers (
  id uuid primary key default gen_random_uuid(),
  owner text not null default public.me(),
  label text not null default '',
  ends_at timestamptz not null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.kitchen_timers enable row level security;
-- create policy kitchen_timers_own on public.kitchen_timers for all to authenticated
--   using (public.is_member() and owner = public.me()) with check (public.is_member() and owner = public.me());

-- Frais : produits frais achetés, avec date estimée ; l'app et les rappels préviennent deux jours avant.
create table if not exists public.pantry (
  id uuid primary key default gen_random_uuid(),
  label text not null, icon text, theme text,
  bought_at timestamptz not null default now(),
  expires_on date not null,
  status text,            -- null = au frigo ; 'mange' ; 'jete'
  notified_at timestamptz,
  created_by text not null default public.me(),
  created_at timestamptz not null default now()
);
alter table public.pantry enable row level security;
-- Menu : recettes prévues jusqu'à ce qu'on les cuisine ; shopping.pour note la recette d'un article.
create table if not exists public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  recipe text not null, title text not null, persons int not null default 2,
  created_by text not null default public.me(), created_at timestamptz not null default now()
);
alter table public.meal_plans enable row level security;
alter table public.shopping add column if not exists pour text;

-- Annuler une réussite (bouton « Annuler ») : chacun peut retirer les siennes.
create policy wins_delete_own on public.wins for delete to authenticated using ((select is_member()) and done_by = lower((select auth.jwt()) ->> 'email'));

-- Mode calme : priorité choisie à la main, report de 3 jours, demandes d'aide entre vous deux.
alter table public.tasks add column if not exists priority text check (priority in ('vital','important','normal','later')), add column if not exists snooze_until date;
alter table public.chores add column if not exists priority text check (priority in ('vital','important','normal','later')), add column if not exists snooze_until date;
create table if not exists public.help_requests (id uuid primary key default gen_random_uuid(), from_email text not null default lower(auth.jwt() ->> 'email'), to_email text not null, item_kind text check (item_kind in ('chore','task')), item_id uuid, label text, ask text not null default 'remplacer' check (ask in ('remplacer','ensemble','souffler','rappel','penser')), status text check (status in ('pris','ensemble','non')), answered_at timestamptz, notified_at timestamptz, created_at timestamptz not null default now());
alter table public.help_requests enable row level security;
create policy shared_all on public.help_requests for all to authenticated using ((select is_member())) with check ((select is_member()));

-- Ordre choisi à la main (appui long puis déplacement) : partagé entre vous deux.
alter table public.tasks add column if not exists rank integer;
alter table public.chores add column if not exists rank integer;

-- Guide : ce que chacun a déjà vu (visite d'accueil, explications des pages).
create table if not exists public.user_tips (email text primary key default lower(auth.jwt() ->> 'email'), seen jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
alter table public.user_tips enable row level security;
create policy own_row on public.user_tips for all to authenticated using ((select is_member()) and email = lower((select auth.jwt()) ->> 'email')) with check ((select is_member()) and email = lower((select auth.jwt()) ->> 'email'));

-- Courses à deux : qui a pris l'article.
alter table public.shopping add column if not exists checked_by text, add column if not exists checked_at timestamptz;

-- Carnet d'Azami : commun aux deux (ce que l'un découvre compte pour vous deux).
create table if not exists public.azami_carnet (id text primary key, found_by text not null default lower(auth.jwt() ->> 'email'), found_at timestamptz not null default now());
alter table public.azami_carnet enable row level security;
create policy shared_all on public.azami_carnet for all to authenticated using ((select is_member())) with check ((select is_member()));

-- v173 : notes presse et public (MDBList), en cache
alter table public.films add column if not exists presse jsonb;
create table if not exists public.film_notes (cle text primary key, data jsonb, at timestamptz not null default now());
alter table public.film_notes enable row level security;
-- v174 : palmarès (Wikidata, Cahiers, Sight and Sound), presse titre par titre (AlloCiné), tons (modèle de langage), raisons d'un avis
alter table public.films add column if not exists palmares jsonb, add column if not exists critiques jsonb, add column if not exists tons jsonb, add column if not exists raisons jsonb;
-- v180 : temps de décision dans Cinder
alter table public.films add column if not exists hesite jsonb;

-- Soirée ciné avec des invités (v189) -------------------------------------------
-- Un lien secret (24 h, révocable). Les invités n'ont pas de compte : tout passe par la fonction « soiree »
-- (clé de service). Aucune règle d'accès pour anon ni authenticated : les tables sont fermées.
-- La colonne « jeton » n'est plus remplie (la base ne garde que l'empreinte jeton_hash).
create table if not exists public.soirees (
  id          uuid primary key default gen_random_uuid(),
  jeton_hash  text not null unique,
  jeton       text not null,
  created_by  text not null references public.members(email) on update cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  revoked_at  timestamptz,
  pool        jsonb not null default '[]'::jsonb
);
create table if not exists public.soiree_votes (
  soiree_id  uuid not null references public.soirees(id) on delete cascade,
  invite     text not null check (invite ~ '^[a-f0-9]{32}$'),
  nom        text not null check (char_length(nom) between 1 and 24),
  film       text not null check (char_length(film) <= 40),
  vote       text not null check (vote in ('oui', 'super', 'non', 'vu')),
  at         timestamptz not null default now(),
  primary key (soiree_id, invite, film)
);
create index if not exists soiree_votes_soiree on public.soiree_votes (soiree_id);
alter table public.soirees enable row level security;
alter table public.soiree_votes enable row level security;
revoke all on public.soirees from anon, authenticated;
revoke all on public.soiree_votes from anon, authenticated;
-- (v189b) le lien en clair n'est jamais gardé, et 20 invités au plus par soirée, vérifié par la base
alter table public.soirees add constraint soirees_jeton_vide check (jeton = '') not valid;
create or replace function public.soiree_places() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.soiree_id::text));
  if not exists (select 1 from public.soiree_votes where soiree_id = new.soiree_id and invite = new.invite)
     and (select count(distinct invite) from public.soiree_votes where soiree_id = new.soiree_id) >= 20 then
    raise exception 'soiree_complete';
  end if;
  return new;
end $$;
revoke all on function public.soiree_places() from public, anon, authenticated;
create trigger soiree_places before insert on public.soiree_votes for each row execute function public.soiree_places();

-- Azami qui parle (v200) ---------------------------------------------------------
-- Sa mémoire : une ligne par chose retenue. « qui » est l'adresse du membre concerné, ou 'azami' pour ce
-- qu'elle sait d'elle-même (son humeur, son journal). Chacun ne lit et n'efface que SA mémoire ; le reste
-- passe par la fonction « azami » (clé de service). Sa fiche de personnage vit dans reglages ('azami:fiche').
create table if not exists public.azami_memoire (id uuid primary key default gen_random_uuid(), qui text not null, texte text not null, genre text not null default 'fait', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists azami_memoire_qui on public.azami_memoire (qui, created_at);
alter table public.azami_memoire enable row level security;
create policy own_rows on public.azami_memoire for select to authenticated using ((select is_member()) and qui = lower((select auth.jwt()) ->> 'email'));
create policy own_delete on public.azami_memoire for delete to authenticated using ((select is_member()) and qui = lower((select auth.jwt()) ->> 'email'));
-- Le fil de discussion de chacun avec elle (privé : l'autre ne le lit jamais).
create table if not exists public.azami_messages (id bigint generated always as identity primary key, qui text not null, role text not null check (role in ('moi', 'azami')), texte text not null, at timestamptz not null default now());
create index if not exists azami_messages_qui on public.azami_messages (qui, at);
alter table public.azami_messages enable row level security;
create policy own_rows on public.azami_messages for select to authenticated using ((select is_member()) and qui = lower((select auth.jwt()) ->> 'email'));
-- Le carnet pour Claude : ce qu'on dit à Azami à propos de l'app (idées, bugs). Commun aux deux.
create table if not exists public.azami_pour_claude (id uuid primary key default gen_random_uuid(), de text not null, texte text not null, at timestamptz not null default now(), lu_at timestamptz);
alter table public.azami_pour_claude enable row level security;
create policy shared_all on public.azami_pour_claude for all to authenticated using ((select is_member())) with check ((select is_member()));
-- Ce qu'elle coûte, jour par jour (plafond vérifié par la fonction).
create table if not exists public.azami_usage (jour date not null, qui text not null, appels int not null default 0, tokens_in bigint not null default 0, tokens_out bigint not null default 0, cout_usd numeric(10, 5) not null default 0, primary key (jour, qui));
alter table public.azami_usage enable row level security;
create policy shared_read on public.azami_usage for select to authenticated using ((select is_member()));
-- Le compteur du jour d'Azami, incrémenté sans course entre deux appels (réservé à la fonction).
create or replace function public.azami_compte(p_jour date, p_qui text, p_in bigint, p_out bigint, p_cout numeric)
returns void language sql security definer set search_path = public as $$
  insert into public.azami_usage (jour, qui, appels, tokens_in, tokens_out, cout_usd) values (p_jour, p_qui, 1, p_in, p_out, p_cout)
  on conflict (jour, qui) do update set appels = azami_usage.appels + 1, tokens_in = azami_usage.tokens_in + excluded.tokens_in, tokens_out = azami_usage.tokens_out + excluded.tokens_out, cout_usd = azami_usage.cout_usd + excluded.cout_usd;
$$;
revoke all on function public.azami_compte(date, text, bigint, bigint, numeric) from public, anon, authenticated;
