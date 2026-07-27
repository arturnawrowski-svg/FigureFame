-- ============================================================================
-- Migracja: stan FigureFame Studio (bicie serca)
-- Supabase → SQL Editor → New query → wklej → Run. Bezpieczne do powtarzania.
--
-- Po co: część pracy (pobieranie danych z katalogów, renderowanie filmów)
-- wykonuje komputer domowy, bo w chmurze się jej nie da. Panel musi umieć
-- powiedzieć wprost, czy ten komputer właśnie pracuje — zamiast zostawiać
-- moderatora z domysłami, dlaczego „nic się nie dzieje".
--
-- Studio co minutę zapisuje tu wpis „żyję". Panel uznaje je za aktywne,
-- jeśli ostatni sygnał jest świeższy niż 3 minuty.
-- ============================================================================

create table if not exists studio_status (
  -- jeden wiersz na komputer (np. 'tata-pc', 'mac-klary')
  station     text primary key,
  last_seen   timestamptz not null default now(),
  version     text,
  -- co Studio potrafi na tej maszynie: przeglądarka, renderowanie filmów
  can_browse  boolean not null default false,
  can_render  boolean not null default false
);

-- Panel czyta ten stan przez klucz publiczny, więc potrzebna jest polityka
-- pozwalająca na sam ODCZYT. Zapis idzie z serwera (service_role omija RLS).
alter table studio_status enable row level security;

drop policy if exists "studio_status_read" on studio_status;
create policy "studio_status_read" on studio_status for select using (true);
