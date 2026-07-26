-- ============================================================================
-- Migracja: pamięć podręczna wyszukiwań (oszczędność limitów zewnętrznych)
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego odpalenia.
--
-- Po co: dane figurek pochodzą m.in. z katalogów za Cloudflare, do których
-- wchodzimy przez płatnego pośrednika o MAŁYM darmowym limicie (~1000/mies.).
-- Bez pamięci podręcznej każde kliknięcie „Szukaj Danych" zjada ten limit,
-- nawet dla figurki sprawdzanej po raz piąty.
--
-- Zasada: każdą figurkę przeszukujemy RAZ, wynik trzymamy u siebie i kolejne
-- zapytania obsługujemy z własnej bazy — natychmiast i za darmo.
-- Admin może wymusić świeże pobranie (przycisk „Odśwież" → refresh=1).
-- ============================================================================

create table if not exists lookup_cache (
  -- klucz = znormalizowana nazwa + seria (patrz cacheKey() w api/fetch-figure.js)
  key         text primary key,
  data        jsonb       not null,
  -- 'quick' albo 'deep' — wynik z trybu dokładnego nie może być nadpisany zwykłym
  mode        text        not null default 'quick',
  created_at  timestamptz not null default now()
);

-- Czyszczenie starych wpisów po dacie (ceny i dostępność się zmieniają).
create index if not exists idx_lookup_cache_created_at on lookup_cache (created_at);

-- Dostęp wyłącznie z serwera (service_role omija RLS). Klient nie czyta tej tabeli.
alter table lookup_cache enable row level security;
