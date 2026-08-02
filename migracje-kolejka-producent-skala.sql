-- ============================================================================
-- Migracja: KOLEJKA WYSZUKIWAŃ zapamiętuje PRODUCENTA i SKALĘ.
--
-- Supabase → SQL Editor → New query → wklej całość → Run.
-- Bezpieczne do wielokrotnego uruchomienia.
--
-- PO CO — to nie jest kosmetyka, tylko przyczyna „nie ma zdjęcia":
--
-- Zdjęcie z katalogu przyjmujemy dopiero, gdy da się je potwierdzić
-- (server-lib/figureImage.js → crossCheckImage). Są trzy drogi:
--   1) to samo zdjęcie w dwóch niezależnych źródłach,
--   2) dwa źródła zgodne co do producenta i skali,
--   3) JEDNO źródło, ale zgodne z producentem i skalą ZE ZGŁOSZENIA.
--
-- Droga 3 istnieje właśnie po to, żeby ratować przypadek „tylko MFC ma
-- zdjęcie" — czyli ten najczęstszy. Ale worker dostawał z kolejki wyłącznie
-- nazwę, serię i tryb. Producent i skala docierały do niego jako puste ciągi,
-- więc warunek `expected.manufacturer && expected.scale` nigdy nie był
-- spełniony i droga 3 była martwa. Efekt: MFC podawało poprawne zdjęcie,
-- a worker je wyrzucał z komunikatem „za mało źródeł".
--
-- Te dwie kolumny odblokowują drogę 3.
-- ============================================================================

alter table lookup_queue add column if not exists manufacturer text not null default '';
alter table lookup_queue add column if not exists scale        text not null default '';
