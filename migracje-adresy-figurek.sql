-- ============================================================================
-- FigureFame — STAŁE ADRESY FIGUREK
-- ----------------------------------------------------------------------------
-- Po co: short wypuszczony na TikToka czy YouTube'a ma kierować dokładnie w
-- jedną figurkę na naszej stronie. Dziś adres to identyfikator techniczny
-- (/dossier/39acbb1a-91a0-...) — nie da się go wpisać pod filmem ani przeczytać
-- z ekranu. Film raz opublikowany zostaje w sieci na zawsze, więc adres, na
-- który wskazuje, musi być krótki, czytelny i NIEZMIENNY.
--
-- Wklej całość w Supabase → SQL Editor → Run. Można uruchamiać wielokrotnie.
-- ============================================================================

-- 1. slug — czytelny adres: figurefame.com/f/sone-miyuki-griffon-enterprises-1-8
--    Raz nadany nie zmienia się NIGDY, nawet po poprawieniu nazwy figurki:
--    opublikowanego filmu nie da się już poprawić.
ALTER TABLE figures ADD COLUMN IF NOT EXISTS slug TEXT;

-- 2. short_code — kod wypalany w obrazie shorta: figurefame.com/f/7K2M
--    Długi adres nie mieści się na kadrze pionowego filmu. Alfabet kodu pomija
--    znaki mylone przy przepisywaniu z ekranu (0/O, 1/I/L).
ALTER TABLE figures ADD COLUMN IF NOT EXISTS short_code TEXT;

-- 3. identity_key — odcisk „to ta sama figurka": postać + producent + skala.
--    Nigdzie go nie pokazujemy, służy wyłącznie do odrzucania duplikatów.
--    To on sprawia, że „Miyuki Sone Base" i „Miyuki Sone" nie mogą już istnieć
--    obok siebie jako dwa osobne wpisy.
ALTER TABLE figures ADD COLUMN IF NOT EXISTS identity_key TEXT;

-- 4. external_ids — numery pozycji w KATALOGACH ZEWNĘTRZNYCH, np.
--      {"mfc": "164701", "buyfinder": "prepainted-...", "goodsmile": "..."}
--    ŚWIADOMIE jako mapa, a nie osobne kolumny: żaden katalog nie jest u nas
--    wyrocznią. MyFigureCollection to jedno ze źródeł — równorzędne wobec
--    pozostałych i wymienne. Nasza tożsamość liczy się z własnych danych
--    (identity_key), a te numery są tylko odnośnikami ułatwiającymi
--    odświeżanie danych i łączenie ofert.
ALTER TABLE figures ADD COLUMN IF NOT EXISTS external_ids JSONB DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Warunki unikalności. Wszystkie pomijają wartości puste (WHERE ... IS NOT NULL),
-- żeby stare rekordy bez adresu nie blokowały migracji.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS figures_slug_unikat
  ON figures (slug) WHERE slug IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS figures_short_code_unikat
  ON figures (short_code) WHERE short_code IS NOT NULL;

-- Duplikaty odrzucamy tylko wśród pozycji zatwierdzonych i oczekujących.
-- Odrzucone zgłoszenie tej samej figurki nie może blokować kolejnej próby.
CREATE UNIQUE INDEX IF NOT EXISTS figures_identity_unikat
  ON figures (identity_key)
  WHERE identity_key IS NOT NULL AND status IN ('APPROVED', 'PENDING');

-- Szybkie wyszukanie po adresie przy wejściu z linku pod filmem.
CREATE INDEX IF NOT EXISTS figures_slug_szukaj ON figures (slug);
CREATE INDEX IF NOT EXISTS figures_short_code_szukaj ON figures (short_code);

-- ---------------------------------------------------------------------------
-- Uwaga o duplikatach, które JUŻ są w bazie
-- ---------------------------------------------------------------------------
-- Indeks unikalności nie skasuje istniejących powtórek — może jedynie nie dać
-- się utworzyć, jeśli dwa rekordy dostaną ten sam odcisk. Skrypt nadający
-- adresy (npm run adresy) wypisze takie pary i NIE nada im adresu, zamiast
-- wybierać za Ciebie, który wpis jest właściwy. Decyzja o skasowaniu należy
-- do Ciebie — to zgłoszenia użytkowników.
--
-- Podejrzane pary na dziś:
--   Taihou - Azur Lane                (2x)
--   Super Sonico - Tiger Hoodie Ver.  (2x)
--   Hatsune Miku - Expo 2025 Ver.     (2x)
