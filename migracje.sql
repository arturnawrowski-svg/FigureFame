-- ============================================================================
-- FigureFame — migracje bazy (Etap 0 z planu plan_claude_210720026.md)
-- ----------------------------------------------------------------------------
-- Uruchom w Supabase → SQL Editor. Skrypt jest IDEMPOTENTNY (można odpalić
-- wielokrotnie bez błędów). Wykonuje:
--   1. Dodanie nowych kolumn do tabeli `figures`
--   2. Utworzenie tabeli `price_snapshots`
--   3. Polityki RLS (bezpieczeństwo) dla figures / profiles / price_snapshots
--   4. Nadanie admina kontu admin@figurefame.com + blokada samodzielnej elewacji
--
-- UWAGA: konto administratora to domyślnie admin@figurefame.com.
--        Jeśli używasz innego maila — zmień go w SEKCJI 4.
-- ============================================================================


-- ============================================================================
-- SEKCJA 1: Nowe kolumny w `figures`
-- ============================================================================
alter table public.figures add column if not exists release_date        text;
alter table public.figures add column if not exists japanese_series      text;
alter table public.figures add column if not exists image_source_type    text;    -- 'producent' | 'zdjecie_produktu_oryginalnego' | 'pobrane_z_sieci'
alter table public.figures add column if not exists image_rights_ack     boolean default false;
alter table public.figures add column if not exists source_url           text;
alter table public.figures add column if not exists bootleg_risk         jsonb;    -- { score, level, reasons[] }
alter table public.figures add column if not exists rarity_score         int;
alter table public.figures add column if not exists last_price_check     timestamptz;
-- pola pod przyszłe social/wideo (Faza wideo z PDF):
alter table public.figures add column if not exists video_status         text;     -- queued|rendering|ready|published|failed
alter table public.figures add column if not exists video_url            text;
alter table public.figures add column if not exists youtube_video_id     text;
alter table public.figures add column if not exists tiktok_post_id       text;
alter table public.figures add column if not exists instagram_reel_id    text;
alter table public.figures add column if not exists pinterest_pin_id     text;
alter table public.figures add column if not exists affiliate_links_json jsonb;


-- ============================================================================
-- SEKCJA 2: Tabela `price_snapshots` (Etap 3 — realne ceny)
-- ============================================================================
create table if not exists public.price_snapshots (
  id          bigint generated always as identity primary key,
  figure_id   uuid references public.figures(id) on delete cascade,   -- figures.id jest typu uuid
  platform    text not null,           -- 'eBay', 'AmiAmi', ...
  title       text,
  condition   text,
  price_value numeric,
  currency    text default 'JPY',
  seller      text,
  url         text,                    -- link (afiliacyjny) do oferty
  is_official boolean default false,
  fetched_at  timestamptz default now()
);
create index if not exists idx_price_snapshots_figure on public.price_snapshots(figure_id);


-- ============================================================================
-- SEKCJA 3: Funkcja pomocnicza — czy bieżący użytkownik jest adminem
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER + wskazanie profiles, aby uniknąć rekurencji RLS.
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;


-- ============================================================================
-- SEKCJA 4: Bootstrap admina + blokada samodzielnej elewacji
-- ----------------------------------------------------------------------------
-- Najpierw nadajemy admina właściwemu kontu (po stronie bazy — bezpiecznie),
-- POTEM zakładamy trigger blokujący zmianę is_admin przez klienta.
-- Dzięki temu hack z ProfilePage.jsx przestaje móc podnosić uprawnienia,
-- a konto admina i tak jest już adminem (brak pętli reloadów).
-- ============================================================================

-- 4a. Nadaj admina koncie admin@figurefame.com  (ZMIEŃ MAIL jeśli inny):
update public.profiles
set is_admin = true
where id in (select id from auth.users where lower(email) = 'admin@figurefame.com');

-- 4b. Trigger: klient (rola authenticated/anon) NIE może zmieniać is_admin.
--     service_role oraz panel Supabase (postgres) — mogą (auth.role() != 'authenticated').
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Zmiana is_admin dozwolona TYLKO gdy brak kontekstu użytkownika:
  --   auth.uid() = NULL  → wywołanie z service_role albo z panelu SQL Supabase (OK).
  -- Każde żądanie z klienta niesie JWT użytkownika → auth.uid() != NULL → blokada.
  if (new.is_admin is distinct from old.is_admin) and auth.uid() is not null then
    -- ciche przywrócenie starej wartości (nie wywala zapisu pozostałych pól profilu)
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_is_admin on public.profiles;
create trigger trg_protect_is_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin();


-- ============================================================================
-- SEKCJA 5: RLS — tabela `figures`
-- ============================================================================
alter table public.figures enable row level security;

-- SELECT: publicznie tylko zatwierdzone; admin widzi wszystko
drop policy if exists ff_figures_select_public on public.figures;
create policy ff_figures_select_public on public.figures
  for select using (status = 'APPROVED');

drop policy if exists ff_figures_select_admin on public.figures;
create policy ff_figures_select_admin on public.figures
  for select to authenticated using (public.is_admin());

-- INSERT: zwykły user tylko jako PENDING i pod swoim id; admin — cokolwiek
drop policy if exists ff_figures_insert_user on public.figures;
create policy ff_figures_insert_user on public.figures
  for insert to authenticated
  with check (status = 'PENDING' and submitted_by = auth.uid());

drop policy if exists ff_figures_insert_admin on public.figures;
create policy ff_figures_insert_admin on public.figures
  for insert to authenticated
  with check (public.is_admin());

-- UPDATE / DELETE: tylko admin
drop policy if exists ff_figures_update_admin on public.figures;
create policy ff_figures_update_admin on public.figures
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists ff_figures_delete_admin on public.figures;
create policy ff_figures_delete_admin on public.figures
  for delete to authenticated
  using (public.is_admin());


-- ============================================================================
-- SEKCJA 6: RLS — tabela `profiles`
-- ----------------------------------------------------------------------------
-- SELECT (true): aplikacja czyta is_admin innych; UWAGA prywatności — pole
-- phone jest technicznie widoczne. Zawężenie zostawiamy na później (poza MVP).
-- ============================================================================
alter table public.profiles enable row level security;

drop policy if exists ff_profiles_select on public.profiles;
create policy ff_profiles_select on public.profiles
  for select using (true);

drop policy if exists ff_profiles_insert_own on public.profiles;
create policy ff_profiles_insert_own on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- UPDATE własnego profilu dozwolony; zmianę is_admin blokuje trigger z SEKCJI 4
drop policy if exists ff_profiles_update_own on public.profiles;
create policy ff_profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());


-- ============================================================================
-- SEKCJA 7: RLS — tabela `price_snapshots`
-- ----------------------------------------------------------------------------
-- Odczyt publiczny (ceny na kartach); zapis tylko admin/service_role.
-- (Cron odświeżający ceny używa service_role, który omija RLS.)
-- ============================================================================
alter table public.price_snapshots enable row level security;

drop policy if exists ff_prices_select_public on public.price_snapshots;
create policy ff_prices_select_public on public.price_snapshots
  for select using (true);

drop policy if exists ff_prices_write_admin on public.price_snapshots;
create policy ff_prices_write_admin on public.price_snapshots
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());


-- ============================================================================
-- KONIEC. Szybka weryfikacja (opcjonalnie odkomentuj):
-- ----------------------------------------------------------------------------
-- select id, is_admin from public.profiles where is_admin = true;
-- select column_name from information_schema.columns where table_name = 'figures' order by 1;
-- ============================================================================
