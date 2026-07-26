-- ============================================================================
-- Migracja: oznaczanie ofert partnerskich (plan: affiliation.md)
-- Uruchom w Supabase → SQL Editor. Bezpieczne do wielokrotnego odpalenia.
--
-- Po co: w UE trzeba jasno informować, że link jest linkiem partnerskim.
-- Flaga jest ustawiana automatycznie tylko wtedy, gdy dla danej platformy mamy
-- ZATWIERDZONY identyfikator w zmiennych środowiskowych — dzięki temu nie
-- oznaczamy (ani nie znakujemy) ofert z programów, do których jeszcze nie
-- należymy.
-- ============================================================================

alter table price_snapshots add column if not exists is_affiliate boolean not null default false;

-- Szybkie wyciąganie ofert partnerskich do statystyk zarobków.
create index if not exists idx_price_snapshots_affiliate
  on price_snapshots (figure_id, is_affiliate);
