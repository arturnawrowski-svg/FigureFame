-- ============================================================================
-- Migracja: publikacja shortów na Google Drive (Etap 5)
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego odpalenia.
--
-- Po zatwierdzeniu shorta worker wgrywa MP4 na Twój Google Drive (5 TB),
-- KASUJE plik z Supabase Storage (bufor 1 GB nie rośnie) i zapisuje tu link.
-- ============================================================================

alter table figures add column if not exists drive_file_id text;   -- id pliku na Google Drive
alter table figures add column if not exists drive_url text;       -- link „view" do pliku na Drive
