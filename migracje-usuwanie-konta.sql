-- ============================================================================
-- USUWANIE KONTA (RODO) + brakujące pola profilu.
--
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego uruchomienia.
--
-- Po co:
--   1. Formularz profilu zapisuje kraj, bio, telefon i awatar, a w bazie tych
--      kolumn NIE MA (sprawdzone na żywej bazie 29.07.2026 — `profiles` ma
--      tylko id, is_admin, username, created_at). Zapis kończy się błędem
--      „column ... does not exist". Ta migracja dokłada brakujące kolumny.
--   2. Kasowanie konta musi ZAWSZE się udać. Jeżeli `figures.submitted_by`
--      wskazuje na użytkownika bez reguły „co zrobić przy usunięciu",
--      baza odmawia skasowania konta (naruszenie klucza obcego).
--      Ustawiamy ON DELETE SET NULL: figurka zostaje, znika powiązanie z osobą.
-- ============================================================================

-- --- 1. Brakujące pola profilu ---------------------------------------------
alter table public.profiles add column if not exists country    text;
alter table public.profiles add column if not exists bio        text;
alter table public.profiles add column if not exists phone      text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists updated_at timestamptz;

comment on column public.profiles.phone is
  'Dane kontaktowe użytkownika — nigdy nie pokazywane publicznie.';

-- --- 2. Figurka przeżywa skasowanie konta zgłaszającego ---------------------
-- Nie wiemy z góry, jak nazywa się istniejący klucz obcy (schemat powstawał
-- w kilku podejściach: raz na auth.users, raz na profiles), więc szukamy go
-- po kolumnie i kasujemy, cokolwiek by to nie było.
do $$
declare
  r record;
  kol smallint;
begin
  select attnum into kol
  from pg_attribute
  where attrelid = 'public.figures'::regclass and attname = 'submitted_by';

  for r in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.figures'::regclass
      and con.contype = 'f'
      and con.conkey = array[kol]
  loop
    execute format('alter table public.figures drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.figures
  add constraint figures_submitted_by_fkey
  foreign key (submitted_by) references auth.users(id) on delete set null;

comment on column public.figures.submitted_by is
  'Kto zgłosił figurkę. NULL = konto usunięte (RODO) — dane figurki zostają.';

-- ============================================================================
-- SPRAWDZENIE (opcjonalnie, po uruchomieniu):
--
--   select conname, confdeltype from pg_constraint
--   where conrelid = 'public.figures'::regclass and contype = 'f';
--
-- Przy `figures_submitted_by_fkey` ma być confdeltype = 'n' (SET NULL).
-- ============================================================================
