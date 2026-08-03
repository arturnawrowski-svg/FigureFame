-- ============================================================================
-- BAZA PILNUJE SAMA SIEBIE (szczebel E, 04.08.2026)
-- ----------------------------------------------------------------------------
-- Do tej pory reguł czystości danych pilnował wyłącznie kod przeglądarki
-- (`src/lib/kolumnyFigurki.js`). To działa dopóki wszystko idzie tą jedną
-- drogą — a nie idzie: są skrypty w `worker/`, jest panel Supabase, jest
-- klucz `service_role`, którym można pisać wprost. Każda z tych dróg omija
-- kod i wpuszcza dokładnie ten bałagan, który sprzątaliśmy cały dzień:
-- „Kotobukiya " ze spacją, pusty napis zamiast NULL, „¥440\nEach".
--
-- Podział jest celowy:
--
--   WYZWALACZ  (czyści po cichu)  — rzeczy mechaniczne, bez decyzji:
--                                    białe znaki, złamania linii, pusty napis.
--   OGRANICZENIE (odmawia zapisu) — rzeczy, w których ktoś musi POMYŚLEĆ:
--                                    zdjęcie z cudzego serwera, nieznany status,
--                                    „nazwa japońska" napisana łacinką.
--
-- Czyszczenie w wyzwalaczu nie jest „cichą awarią", bo nie podejmuje żadnej
-- decyzji o treści — obcięcie spacji z „Kotobukiya " nie zmienia znaczenia.
-- Odmowa zapisu jest za to głośna i tak ma być: przy zdjęciu z cudzego serwera
-- albo przy „Taihou" w rubryce japońskiej ktoś musi zdecydować, nie automat.
--
-- Sprawdzone przed uruchomieniem: żaden z 26 wierszy `figures` ani 17 wierszy
-- `characters` nie łamie tych reguł.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Sprowadzenie napisu do postaci, w jakiej ma leżeć w bazie.
--    Wielokrotne białe znaki i złamania linii schodzą do jednej spacji,
--    brzegi lecą, a pustka zapisuje się JEDNYM sposobem — jako NULL.
-- ---------------------------------------------------------------------------
create or replace function public.czysc_napis(t text)
returns text
language sql
immutable
set search_path = public
as $$
  select nullif(btrim(regexp_replace(coalesce(t, ''), '\s+', ' ', 'g')), '')
$$;

comment on function public.czysc_napis(text) is
  'Jedna spacja zamiast ciągu białych znaków, obcięte brzegi, pusty napis -> NULL.';

-- ---------------------------------------------------------------------------
-- 2. Wyzwalacze. Kolumny wypisane WPROST, a nie przez sztuczki z jsonb —
--    przepisywanie całego wiersza przez jsonb i z powrotem potrafi po cichu
--    zmienić inne kolumny, a tego przy naprawie bazy chcemy najmniej.
--
--    ⚠️ NOWA KOLUMNA TEKSTOWA = NOWA LINIJKA TUTAJ.
-- ---------------------------------------------------------------------------
create or replace function public.czysc_figures()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name               := public.czysc_napis(new.name);
  new.japanese_name      := public.czysc_napis(new.japanese_name);
  new.series             := public.czysc_napis(new.series);
  new.japanese_series    := public.czysc_napis(new.japanese_series);
  new.manufacturer       := public.czysc_napis(new.manufacturer);
  new.scale              := public.czysc_napis(new.scale);
  new.version            := public.czysc_napis(new.version);
  new.japanese_version   := public.czysc_napis(new.japanese_version);
  new.type               := public.czysc_napis(new.type);
  new.original_price     := public.czysc_napis(new.original_price);
  new.release_date       := public.czysc_napis(new.release_date);
  new.official_image_url := public.czysc_napis(new.official_image_url);
  new.image_credit       := public.czysc_napis(new.image_credit);
  new.source_url         := public.czysc_napis(new.source_url);
  return new;
end;
$$;

create or replace function public.czysc_characters()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name            := public.czysc_napis(new.name);
  new.japanese_name   := public.czysc_napis(new.japanese_name);
  new.series          := public.czysc_napis(new.series);
  new.japanese_series := public.czysc_napis(new.japanese_series);
  new.source_url      := public.czysc_napis(new.source_url);
  return new;
end;
$$;

drop trigger if exists figures_czysc_napisy on public.figures;
create trigger figures_czysc_napisy
  before insert or update on public.figures
  for each row execute function public.czysc_figures();

drop trigger if exists characters_czysc_napisy on public.characters;
create trigger characters_czysc_napisy
  before insert or update on public.characters
  for each row execute function public.czysc_characters();

-- ---------------------------------------------------------------------------
-- 3. Ograniczenia. Tu baza ODMAWIA — bo każda z tych rzeczy wymaga decyzji.
-- ---------------------------------------------------------------------------

-- Status spoza tej trójki znaczy, że coś pisze do bazy z pomyłką w nazwie —
-- a wtedy figurka znika i z Gabloty, i z moderacji, bez śladu.
alter table public.figures drop constraint if exists figures_status_znany;
alter table public.figures add constraint figures_status_znany
  check (status in ('PENDING', 'APPROVED', 'ARCHIVED'));

-- Reguła bezwzględna projektu: zdjęcie leży w NASZYM magazynie albo nie ma go
-- wcale. Adres na cudzym serwerze właściciel odcina, kiedy chce — Kotobukiya
-- skasowało zdjęcie Leviego, zanim je ściągnęliśmy. Nazwy plików z zasiewu
-- (`miku_figure`) przechodzą, bo to nie są adresy.
alter table public.figures drop constraint if exists figures_zdjecie_u_nas;
alter table public.figures add constraint figures_zdjecie_u_nas
  check (
    official_image_url is null
    or official_image_url !~ '^https?://'
    or official_image_url ~ '^https?://[^/]*\.supabase\.co/storage/'
  );

-- „Nazwa japońska" napisana łacinką to nie nazwa japońska. Sześć wierszy miało
-- tam „Taihou" albo „Miku Expo 2025" — pole wypełnione, wartość nieprawdziwa,
-- zero sygnału. Zakres znaków: powtórzenia, kana, kanji, kana połówkowa.
alter table public.characters drop constraint if exists characters_jp_po_japonsku;
alter table public.characters add constraint characters_jp_po_japonsku
  check (japanese_name is null or japanese_name ~ '[々-〇぀-ヿ㐀-䶿一-鿿ｦ-ﾝ]');

alter table public.figures drop constraint if exists figures_jp_po_japonsku;
alter table public.figures add constraint figures_jp_po_japonsku
  check (japanese_name is null or japanese_name ~ '[々-〇぀-ヿ㐀-䶿一-鿿ｦ-ﾝ]');

-- Postać bez nazwy nie jest postacią — nie da się jej ani pokazać, ani znaleźć.
alter table public.characters drop constraint if exists characters_nazwa_niepusta;
alter table public.characters add constraint characters_nazwa_niepusta
  check (name is not null and btrim(name) <> '');
