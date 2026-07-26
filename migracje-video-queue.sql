-- ============================================================================
-- Migracja: kolejka shortów oparta o bazę (Etap 5)
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego odpalenia.
--
-- Po co: klik „Dodaj do kolejki" na ŻYWEJ stronie (vercel.app / domena) tylko
-- ustawia figurce video_status='queued' i zapisuje opcje shorta w video_options.
-- Twój LOKALNY worker (npm run render-queue:watch) odpytuje bazę, renderuje na
-- Twoim kompie i wgrywa MP4. Zero renderu na Vercelu, zero kosztów.
-- ============================================================================

-- Opcje renderu wybrane w panelu (preset/accent/music/resolution/cta)
alter table figures add column if not exists video_options jsonb;

-- Indeks przyspieszający odpytywanie kolejki przez workera
create index if not exists idx_figures_video_status on figures(video_status);
