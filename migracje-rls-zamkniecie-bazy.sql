-- ============================================================================
-- ZAMKNIĘCIE BAZY — reguły dostępu (RLS).
--
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego uruchomienia.
--
-- ----------------------------------------------------------------------------
-- CO NAPRAWIAMY (stan sprawdzony 28.07.2026 kluczem publicznym, bez logowania):
--
--   odczyt figurek OCZEKUJĄCYCH   → 200 OK      (kolejka moderacji na widoku)
--   odczyt profili użytkowników   → 200 OK
--   próba ZMIANY figurki          → 200 DOZWOLONA
--   próba USUNIĘCIA figurki       → 204 DOZWOLONA
--
-- Klucz publiczny (`VITE_SUPABASE_ANON_KEY`) jest wbudowany w kod strony i widzi
-- go każdy, kto otworzy podgląd źródła. Nie jest i nigdy nie miał być sekretem —
-- to RLS ma decydować, co wolno. Bez niego ten klucz jest kluczem do wszystkiego:
-- ktokolwiek może skasować całą Gablotę jednym poleceniem.
--
-- Zasłona na hasło NIE chroni przed tym. Stoi przed stroną na Vercelu, a baza
-- odpowiada pod własnym adresem `*.supabase.co` — z pominięciem zasłony.
-- ============================================================================

-- --- Kto jest moderatorem -------------------------------------------------
-- SECURITY DEFINER, żeby zapytanie o `profiles` wewnątrz reguły nie wpadło
-- w rekurencję z regułami nałożonymi na samą tabelę `profiles`.
create or replace function public.jest_moderatorem()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ============================== FIGURES =====================================
alter table public.figures enable row level security;

drop policy if exists "figures_odczyt_publiczny" on public.figures;
drop policy if exists "figures_odczyt_wlasne" on public.figures;
drop policy if exists "figures_odczyt_moderator" on public.figures;
drop policy if exists "figures_dodawanie" on public.figures;
drop policy if exists "figures_zmiana_moderator" on public.figures;
drop policy if exists "figures_usuwanie_moderator" on public.figures;

-- Gablota: każdy widzi WYŁĄCZNIE zatwierdzone. Poczekalnia przestaje być publiczna.
create policy "figures_odczyt_publiczny" on public.figures
  for select using (status = 'APPROVED');

-- Zgłaszający widzi swoje zgłoszenie także zanim je zatwierdzimy.
create policy "figures_odczyt_wlasne" on public.figures
  for select using (auth.uid() is not null and submitted_by = auth.uid());

create policy "figures_odczyt_moderator" on public.figures
  for select using (public.jest_moderatorem());

-- Zalogowany może zgłosić figurkę, ale WYŁĄCZNIE jako oczekującą i podpisaną
-- sobą. Bez tego dałoby się wstawić rekord od razu ze statusem APPROVED,
-- czyli opublikować cokolwiek w Gablocie z pominięciem moderacji.
create policy "figures_dodawanie" on public.figures
  for insert with check (
    auth.uid() is not null
    and submitted_by = auth.uid()
    and status = 'PENDING'
  );

create policy "figures_zmiana_moderator" on public.figures
  for update using (public.jest_moderatorem()) with check (public.jest_moderatorem());

create policy "figures_usuwanie_moderator" on public.figures
  for delete using (public.jest_moderatorem());

-- ============================== PROFILES ====================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_odczyt_wlasny" on public.profiles;
drop policy if exists "profiles_odczyt_moderator" on public.profiles;
drop policy if exists "profiles_zmiana_wlasny" on public.profiles;
drop policy if exists "profiles_dodanie_wlasny" on public.profiles;

create policy "profiles_odczyt_wlasny" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_odczyt_moderator" on public.profiles
  for select using (public.jest_moderatorem());

-- `is_admin` celowo poza zasięgiem: użytkownik zmienia swój profil, ale nie
-- może sam sobie przyznać uprawnień moderatora.
create policy "profiles_zmiana_wlasny" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and is_admin = (select is_admin from public.profiles where id = auth.uid()));

create policy "profiles_dodanie_wlasny" on public.profiles
  for insert with check (id = auth.uid());

-- ============================== PRICE_SNAPSHOTS =============================
-- Oferty są częścią publicznego dossier — odczyt zostaje otwarty.
-- Zapisuje wyłącznie serwer (kluczem service_role, który RLS pomija).
alter table public.price_snapshots enable row level security;
drop policy if exists "oferty_odczyt_publiczny" on public.price_snapshots;
create policy "oferty_odczyt_publiczny" on public.price_snapshots
  for select using (true);

-- ============================== STUDIO_STATUS ===============================
-- Panel moderatora pokazuje z tego zielone/czerwone światło. Zwykły
-- odwiedzający nie ma powodu wiedzieć, czy komputer admina jest włączony.
alter table public.studio_status enable row level security;
drop policy if exists "studio_odczyt_moderator" on public.studio_status;
create policy "studio_odczyt_moderator" on public.studio_status
  for select using (public.jest_moderatorem());

-- ============================== KUCHNIA =====================================
-- Pamięć podręczna i kolejka wyszukiwań to wyłącznie sprawa serwera i workera.
-- Włączamy RLS i NIE dodajemy żadnej reguły — czyli klucz publiczny nie ma tu
-- dostępu do niczego, a service_role działa jak dotąd (RLS go nie obowiązuje).
alter table public.lookup_cache enable row level security;
alter table public.lookup_queue enable row level security;
