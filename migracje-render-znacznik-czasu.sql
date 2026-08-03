-- ============================================================================
-- Migracja: KIEDY ostatnio zmienił się status shorta.
--
-- Supabase → SQL Editor → New query → wklej całość → Run.
-- Bezpieczne do wielokrotnego uruchomienia.
--
-- PO CO — to nie jest statystyka, tylko ratunek przed cichym zakleszczeniem:
--
-- `video_status = 'rendering'` pełni w worker/renderQueue.mjs rolę BLOKADY —
-- fetchQueued bierze wyłącznie 'queued', więc figurka w trakcie renderu nie
-- zostanie złapana drugi raz. Problem w tym, że nic tej blokady nie zdejmuje.
-- Gdy Studio padnie albo zostanie zamknięte w połowie renderu, wiersz zostaje
-- w 'rendering' NA ZAWSZE. Panel nie pokazuje żadnego błędu — short po prostu
-- nigdy nie jest gotowy.
--
-- Dokładnie ta sama pułapka zjadła już zlecenie w lookup_queue (02.08).
-- Tam ratunkiem był `updated_at`, po którym worker rozpoznaje porzucone
-- zlecenia. Tabela `figures` takiego znacznika nie miała.
--
-- DLACZEGO TERAZ: przy jednym renderze na tydzień to ciekawostka. Przy setce
-- renderów pod ofensywę na mediach każde padnięcie Studia zabiera jeden short
-- bez śladu, a im dłużej trwa przebieg, tym większa szansa, że coś przerwie.
--
-- Kolumna zostaje PUSTA dla wierszy sprzed migracji. Worker traktuje NULL jak
-- „nie wiadomo od kiedy, czyli na pewno za długo" i zwalnia je — to celowe,
-- bo jeden taki wiersz wisi w bazie już teraz.
-- ============================================================================

alter table figures add column if not exists video_status_at timestamptz;

comment on column figures.video_status_at is
  'Kiedy ostatnio zmienił się video_status. Po tym worker/renderQueue.mjs poznaje rendery porzucone po awarii Studia.';
