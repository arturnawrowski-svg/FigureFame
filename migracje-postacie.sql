-- ============================================================================
-- Migracja: POSTAĆ ≠ PRODUKT (poziom 1 planu naprawy bazy).
--
-- Supabase → SQL Editor → New query → wklej całość → Run.
-- Bezpieczne do wielokrotnego uruchomienia.
--
-- PO CO — jedna choroba, z której brały się wszystkie objawy:
--
-- „Super Sonico" to POSTAĆ, ale figurek Super Sonico jest wiele: różni
-- producenci, różne skale, różne wersje. Cała maszyneria serwisu (pamięć
-- podręczna, kolejka, potwierdzanie zdjęcia, wykrywanie duplikatów) opierała
-- się na nazwie postaci — więc wszystkie wersje zlewały się w jedno i
-- nadpisywały nawzajem. Stąd „dane Silfy to Alter 1/8 zamiast Kotobukiya 1/6".
--
-- Do tego jedna kolumna trzymała DWA różne fakty. `japanese_name` zawierało
-- raz nazwę postaci (すーぱーそに子), raz tytuł produktu (木之本桜 Stars Bless
-- You). Pole bez stałego znaczenia nie da się ani poprawnie pobrać, ani
-- sprawdzić — i dlatego japońskie nazwy wiecznie „nie chciały się uzupełniać".
--
-- Po tej migracji:
--   characters — postać. Nazwa japońska ustalana RAZ i wspólna dla wszystkich
--                jej figurek. Poprawka w jednym miejscu naprawia wszystkie.
--   figures    — PRODUKT. Producent, skala, wersja („Tiger Hoodie Ver.").
--
-- ⚠️ MIGRACJA NICZEGO NIE PRZENOSI. Dokłada tabelę, kolumny i widok, ale
-- `figures.name` / `japanese_name` / `series` zostają nietknięte, a
-- `character_id` jest puste. Rozdzielenie danych robi osobny przebieg
-- (worker/, poziom 3 planu) — najpierw w trybie podglądu. Dzięki temu ta
-- migracja jest odwracalna i nie może zepsuć ani jednego istniejącego wpisu.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. POSTAĆ
-- ---------------------------------------------------------------------------
create table if not exists characters (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  japanese_name    text,
  series           text,
  japanese_series  text,
  -- Odcisk „to ta sama postać" — liczony z nazwy i serii przez
  -- src/lib/figureIdentity.js. Sama nazwa nie wystarcza: „Sakura" występuje
  -- w kilku różnych seriach i to są RÓŻNE postacie.
  identity_key     text,
  -- Numery w cudzych katalogach (MFC itd.). Kotwica do ponownego pobrania,
  -- NIE nasz adres — patrz doktryna w src/lib/figureIdentity.js.
  external_ids     jsonb default '{}'::jsonb,
  source_url       text,
  -- Skąd wzięło się każde pole: { japanese_name: 'catalog', series: 'ai' }.
  -- Bez tego zgadnięcie AI wygląda w bazie identycznie jak fakt z katalogu.
  provenance       jsonb default '{}'::jsonb,
  created_at       timestamptz default timezone('utc'::text, now())
);

comment on table characters is
  'Postać (np. Super Sonico). Jedna postać ma wiele figurek w tabeli figures. Nazwa japońska ustalana raz i wspólna dla wszystkich.';

-- Dwie postacie o tym samym odcisku to błąd — złapmy go przy zapisie,
-- a nie przy czytaniu. NULL-e się nie liczą (postać jeszcze bez odcisku).
create unique index if not exists characters_identity_unikat
  on characters (identity_key) where identity_key is not null;

-- ---------------------------------------------------------------------------
-- 2. FIGURKA STAJE SIĘ PRODUKTEM
-- ---------------------------------------------------------------------------
alter table figures add column if not exists character_id uuid references characters(id);
-- Człon odróżniający wydanie: „Tiger Hoodie Ver.", „Jersey Ver.".
-- To JEDYNA część nazwy, która wymaga osobnego tłumaczenia — nazwa postaci
-- jest już ustalona w characters i nie trzeba jej szukać po raz drugi.
alter table figures add column if not exists version text;
alter table figures add column if not exists japanese_version text;
alter table figures add column if not exists provenance jsonb default '{}'::jsonb;

create index if not exists figures_character_idx on figures (character_id);

comment on column figures.version is
  'Człon odróżniający wydanie, np. "Tiger Hoodie Ver.". Nazwa postaci siedzi w characters.';

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
alter table characters enable row level security;

-- Postać to fakt publiczny — „Super Sonico pochodzi z Nitroplus" nie jest
-- niczyim zgłoszeniem ani daną osobową. Widoczność FIGUREK to osobna sprawa
-- i pilnuje jej RLS tabeli figures (patrz widok niżej, security_invoker).
drop policy if exists characters_odczyt_publiczny on characters;
create policy characters_odczyt_publiczny on characters for select using (true);

-- Zapis wyłącznie moderator. Zgłaszający dodaje figurkę z nazwą w starych
-- kolumnach; postać przypina się dopiero przy moderacji, czyli tam, gdzie
-- ktoś tę tożsamość faktycznie rozstrzyga.
drop policy if exists characters_dodawanie_moderator on characters;
create policy characters_dodawanie_moderator on characters for insert with check (jest_moderatorem());

drop policy if exists characters_zmiana_moderator on characters;
create policy characters_zmiana_moderator on characters for update using (jest_moderatorem()) with check (jest_moderatorem());

drop policy if exists characters_usuwanie_moderator on characters;
create policy characters_usuwanie_moderator on characters for delete using (jest_moderatorem());

grant select on characters to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. WIDOK figures_full — jedno miejsce, w którym postać i produkt są razem
-- ---------------------------------------------------------------------------
-- Dzięki niemu Gablota, dossier, czat i worker zmieniają TYLKO nazwę tabeli,
-- a nie swoją logikę. Kolumny `name`, `japanese_name`, `series` znaczą tu
-- dokładnie to, co znaczyły dotąd — czyli nazwę gotową do pokazania.
--
-- ⚠️ security_invoker = on JEST WYMOGIEM BEZPIECZEŃSTWA. Bez tego widok
-- czytałby dane prawami swojego właściciela i ominąłby RLS tabeli figures —
-- czyli pokazałby światu zgłoszenia PENDING. Ten sam warunek pilnuje
-- api/ask-catalog.js. Nie usuwać.
--
-- LEFT JOIN i fallbacki są celowe: dopóki przebieg rozdzielający nie ruszy,
-- `character_id` jest puste i widok zwraca po prostu stare kolumny. Nic nie
-- przestaje działać ani na chwilę.
create or replace view figures_full
with (security_invoker = on) as
select
  -- Nazwa do pokazania: „Zero Two" + „For My Darling" = „Zero Two: For My Darling".
  -- Dokładnie ten zapis mają dziś rekordy w bazie, więc nic nie zmienia wyglądu.
  case
    when c.id is null                      then f.name
    when coalesce(f.version, '') = ''      then c.name
    else c.name || ': ' || f.version
  end as name,
  case
    when c.id is null                          then f.japanese_name
    when coalesce(f.japanese_version, '') = '' then c.japanese_name
    else c.japanese_name || ' ' || f.japanese_version
  end as japanese_name,
  coalesce(c.series, f.series)                 as series,
  coalesce(c.japanese_series, f.japanese_series) as japanese_series,

  -- Człony osobno — dla panelu, strony postaci i grupowania wyników.
  c.id            as character_id,
  c.name          as character_name,
  c.japanese_name as character_japanese_name,
  c.identity_key  as character_identity_key,
  f.version,
  f.japanese_version,

  f.id, f.manufacturer, f.scale, f.type, f.status, f.original_price,
  f.official_image_url, f.light_class, f.additional_info, f.market_value,
  f.where_to_search, f.strategy, f.submitted_by, f.created_at, f.release_date,
  f.image_source_type, f.image_rights_ack, f.source_url, f.bootleg_risk,
  f.rarity_score, f.last_price_check, f.video_status, f.video_url,
  f.youtube_video_id, f.tiktok_post_id, f.instagram_reel_id, f.pinterest_pin_id,
  f.affiliate_links_json, f.video_options, f.drive_file_id, f.drive_url,
  f.slug, f.short_code, f.identity_key, f.external_ids, f.image_credit,
  f.video_status_at, f.provenance
from figures f
left join characters c on c.id = f.character_id;

comment on view figures_full is
  'Figurka razem z jej postacią. Kolumny name/japanese_name/series są gotowe do pokazania. security_invoker = on — RLS tabeli figures obowiązuje.';

grant select on figures_full to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. KOLEJKA WYSZUKIWAŃ zapamiętuje też WERSJĘ
-- ---------------------------------------------------------------------------
-- Wersja wchodzi do klucza produktu w lookup_cache. Bez niej dwie wersje tej
-- samej figurki od tego samego producenta w tej samej skali nadpisywałyby się
-- nawzajem — czyli dokładnie ten błąd, który ta migracja likwiduje, tyle że
-- piętro niżej.
alter table lookup_queue add column if not exists version text not null default '';
