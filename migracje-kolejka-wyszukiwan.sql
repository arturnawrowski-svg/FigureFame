-- ============================================================================
-- Migracja: KOLEJKA WYSZUKIWAŃ (dopisana później — uruchom, jeśli wcześniejszy
-- plik zbiorczy poszedł do Supabase przed jej dodaniem).
--
-- Supabase → SQL Editor → New query → wklej całość → Run.
-- Bezpieczne do wielokrotnego uruchomienia.
--
-- Po co: katalogi za Cloudflare przepuszczają tylko prawdziwą przeglądarkę.
-- Na Vercelu przeglądarki nie ma, więc klik na żywej stronie zostawia tu
-- zlecenie, a Twój komputer (FigureFame Studio) pobiera dane przez Chromium
-- i zapisuje wynik do lookup_cache. Ten sam układ co kolejka renderowania
-- filmów: Vercel = mózg, Twój komputer = ręce.
--
-- Uwaga: lokalnie wszystko działa BEZ tej tabeli (przeglądarka pobiera dane
-- od razu). Ta migracja jest potrzebna wyłącznie dla klikania na żywej stronie.
-- ============================================================================

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
