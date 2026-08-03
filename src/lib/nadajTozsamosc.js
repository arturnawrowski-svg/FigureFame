import { identityKey, makeSlug, makeShortCode } from './figureIdentity';

// ============================================================================
// TOŻSAMOŚĆ NADAWANA PRZY ZAPISIE, a nie ręcznym skryptem.
// ----------------------------------------------------------------------------
// Do 03.08 `identity_key`, `slug` i `short_code` nadawał WYŁĄCZNIE
// worker/nadajAdresy.mjs (`npm run adresy`) — uruchamiany ręcznie, więc
// w praktyce nieuruchamiany wcale. Skutek: obie figurki dodane przez panel
// miały te pola puste, a indeks unikalności z migracje-adresy-figurek.sql
// obejmuje tylko wartości NIEPUSTE. Wykrywanie duplikatów było więc MARTWE:
// dziesięć kopii tej samej figurki wjechałoby do bazy bez jednego ostrzeżenia.
//
// Ten moduł jest jednym źródłem prawdy dla obu ścieżek zapisu — zgłoszenia
// użytkownika (AddFigure) i edycji moderatora (AdminDashboard).
// `npm run adresy` zostaje jako narzędzie ratunkowe dla rekordów sprzed zmiany.
// ============================================================================

/**
 * Pola tożsamości do dopisania przy zapisie figurki.
 *
 * ⚠️ `slug` i `short_code` RAZ NADANE NIE ZMIENIAJĄ SIĘ NIGDY — nawet gdy
 * poprawimy nazwę figurki. Adres bywa wypalony w opublikowanym filmie, a filmu
 * już nie poprawisz (patrz figureIdentity.js). Dlatego liczymy je wyłącznie
 * wtedy, gdy ich jeszcze nie ma.
 *
 * `identity_key` przeciwnie — to odcisk „to ta sama figurka", nie adres.
 * Gdy moderator poprawi producenta, odcisk MA się przeliczyć, bo inaczej
 * przestałby wykrywać duplikaty.
 *
 * @param {object} figurka   dane do zapisania (name, manufacturer, scale, version)
 * @param {object} [obecne]  rekord już w bazie — z niego bierzemy istniejący adres
 * @returns {object} pola do dopisania; puste, gdy nie ma z czego ich policzyć
 */
export function tozsamoscDlaZapisu(figurka, obecne = {}) {
  const zmiany = {};

  const odcisk = identityKey(figurka);
  if (odcisk) zmiany.identity_key = odcisk;

  if (!obecne.slug) {
    const adres = makeSlug(figurka);
    // Sama nazwa japońska nie daje adresu w ASCII — wtedy zostaje krótki kod,
    // który działa dla każdej nazwy.
    if (adres) zmiany.slug = adres;
  }

  if (!obecne.short_code) zmiany.short_code = makeShortCode();

  return zmiany;
}

// Kod jest LOSOWY, więc raz na jakiś czas trafi w zajęty. Przy 31^4 ≈ 923
// tysiącach kombinacji to rzadkość, ale „rzadkość" to nie „nigdy", a kolizja
// objawiłaby się użytkownikowi błędem zapisu figurki.
const KOD_ZAJETY = '23505';
const PROBY = 5;

/**
 * Wykonuje zapis, losując nowy krótki kod, gdy poprzedni okazał się zajęty.
 *
 * @param {(pola: object) => Promise<{error?: {code?: string}}>} zapisz
 *        funkcja zapisu; dostaje pola tożsamości i zwraca wynik supabase
 * @param {object} figurka
 * @param {object} [obecne]
 */
export async function zapiszZTozsamoscia(zapisz, figurka, obecne = {}) {
  let ostatni = null;
  for (let proba = 0; proba < PROBY; proba++) {
    const pola = tozsamoscDlaZapisu(figurka, obecne);
    const wynik = await zapisz(pola);
    ostatni = wynik;
    if (!wynik?.error) return wynik;
    // Kolizja adresu albo kodu — losujemy jeszcze raz. Każdy inny błąd
    // (brak uprawnień, zła kolumna) oddajemy od razu: powtarzanie go
    // niczego nie naprawi, a ukryłoby prawdziwą przyczynę.
    if (wynik.error.code !== KOD_ZAJETY) return wynik;
  }
  return ostatni;
}
