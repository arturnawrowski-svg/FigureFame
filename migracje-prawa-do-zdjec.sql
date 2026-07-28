-- ============================================================================
-- Podpis praw do zdjęcia pod każdą figurką.
--
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego uruchomienia.
--
-- Po co: pokazujemy cudze zdjęcia produktów. Podpis z nazwą właściciela jest
-- minimum przyzwoitości wobec producenta i pierwszą rzeczą, o którą pyta każdy
-- program afiliacyjny przy weryfikacji strony.
--
-- Kolumna jest opcjonalna z rozmysłem: gdy moderator zostawi ją pustą,
-- podpisujemy zdjęcie producentem figurki (patrz src/lib/prawaDoZdjecia.js).
-- Dzięki temu ŻADNA figurka nie trafia do Gabloty bez podpisu, nawet gdy nikt
-- o tym polu nie pomyślał.
-- ============================================================================

ALTER TABLE public.figures
  ADD COLUMN IF NOT EXISTS image_credit text;

COMMENT ON COLUMN public.figures.image_credit IS
  'Właściciel praw do zdjęcia. Puste = podpisujemy producentem figurki.';
