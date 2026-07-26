-- ============================================================================
-- FigureFame — DWIE MIGRACJE W JEDNYM PLIKU (do jednego wklejenia)
--
-- JAK URUCHOMIĆ (30 sekund):
--   1. Wejdź na https://supabase.com → swój projekt
--   2. Menu po lewej: SQL Editor  →  przycisk „New query”
--   3. Wklej CAŁY ten plik i kliknij „Run”
--   4. Powinno pojawić się „Success. No rows returned” — to znaczy OK
--
-- Bezpieczne do wielokrotnego uruchomienia (nic nie nadpisuje ani nie kasuje).
-- Nie zawiera żadnych haseł ani kluczy — same definicje struktury.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1/2. PAMIĘĆ PODRĘCZNA WYSZUKIWAŃ  (najważniejsze — oszczędza limity)
--
-- Bez niej każde kliknięcie „Szukaj Danych” zużywa limit zewnętrznego
-- pośrednika, nawet dla figurki sprawdzanej po raz piąty. Z nią: każdą figurkę
-- przeszukujemy RAZ, a kolejne zapytania obsługujemy z własnej bazy — od razu
-- i za darmo. Przycisk „⭐ TOP” zawsze wymusza świeże pobranie.
-- ----------------------------------------------------------------------------

create table if not exists lookup_cache (
  -- klucz = tryb + znormalizowana nazwa + seria (patrz cacheKey() w api/fetch-figure.js)
  key         text primary key,
  data        jsonb       not null,
  -- 'quick' albo 'deep' — wynik trybu dokładnego trzymamy osobno
  mode        text        not null default 'quick',
  created_at  timestamptz not null default now()
);

-- Do czyszczenia starych wpisów (ceny i dostępność się zmieniają).
create index if not exists idx_lookup_cache_created_at on lookup_cache (created_at);

-- Dostęp wyłącznie z serwera (service_role omija RLS). Przeglądarka tu nie zagląda.
alter table lookup_cache enable row level security;


-- ----------------------------------------------------------------------------
-- 2/2. OZNACZANIE OFERT PARTNERSKICH
--
-- W UE trzeba jasno informować, że link jest linkiem partnerskim. Flaga włącza
-- się automatycznie tylko dla platform, dla których mamy ZATWIERDZONY
-- identyfikator w zmiennych środowiskowych — więc nie oznaczamy ofert
-- z programów, do których jeszcze nie należymy.
-- ----------------------------------------------------------------------------

alter table price_snapshots add column if not exists is_affiliate boolean not null default false;

-- Szybkie wyciąganie ofert partnerskich (statystyki zarobków).
create index if not exists idx_price_snapshots_affiliate
  on price_snapshots (figure_id, is_affiliate);


-- ----------------------------------------------------------------------------
-- 3/3. KOLEJKA WYSZUKIWAŃ DLA ŻYWEJ STRONY
--
-- Po co: katalogi za Cloudflare przepuszczają tylko prawdziwą przeglądarkę.
-- Na Vercelu przeglądarki nie ma, więc klik na żywej stronie zostawia tu
-- zlecenie, a Twój komputer (FigureFame-Studio) pobiera dane Chromium przez
-- Playwright i zapisuje wynik do lookup_cache. Ten sam sprawdzony schemat co
-- kolejka renderowania filmów: Vercel = mózg, Twój komputer = ręce.
-- ----------------------------------------------------------------------------

create table if not exists lookup_queue (
  id          bigserial primary key,
  name        text        not null,
  series      text        not null default '',
  mode        text        not null default 'quick',   -- 'quick' | 'deep'
  -- 'pending' → 'working' → 'done' | 'failed'
  status      text        not null default 'pending',
  cache_key   text,                                   -- klucz w lookup_cache po sukcesie
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Worker pobiera najstarsze oczekujące zlecenia.
create index if not exists idx_lookup_queue_status on lookup_queue (status, created_at);

-- Bez duplikatów: jedno oczekujące zlecenie na tę samą figurkę i tryb.
create unique index if not exists idx_lookup_queue_unique_pending
  on lookup_queue (name, series, mode)
  where status in ('pending', 'working');

alter table lookup_queue enable row level security;


-- ============================================================================
-- GOTOWE. Po uruchomieniu wróć do panelu i kliknij „Szukaj Danych” dwa razy
-- na tej samej figurce — drugie kliknięcie powinno być natychmiastowe
-- i pokazać „💾 Z naszej bazy”.
-- ============================================================================
