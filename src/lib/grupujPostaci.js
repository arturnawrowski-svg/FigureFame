// ============================================================================
// Zbieranie figurek pod postaciami — i polska odmiana liczebnika.
// ----------------------------------------------------------------------------
// Wydzielone z widoku, bo to jedyna część tej zmiany, którą da się sprawdzić
// testem bez uruchamiania przeglądarki. W żywej bazie każda zatwierdzona postać
// ma dziś po jednej figurce, więc samo klikanie po stronie NIE POKAZAŁOBY,
// czy grupowanie i odmiana działają przy pięciu.
// ============================================================================

/**
 * „1 figurka", „2 figurki", „5 figurek", „22 figurki", „25 figurek".
 *
 * Reguła polska, nie angielska: liczebnik zależy od końcówki, ale nastolatki
 * (12, 13, 14) są wyjątkiem. Naiwne „mniej niż pięć to figurki" daje
 * „22 figurek" — błąd, który widać w interfejsie od pierwszego rzutu oka.
 */
export function odmienFigurki(n) {
  const liczba = Math.abs(Math.trunc(Number(n) || 0));
  if (liczba === 1) return 'figurka';
  const setki = liczba % 100;
  const jednosci = liczba % 10;
  if (jednosci >= 2 && jednosci <= 4 && !(setki >= 12 && setki <= 14)) return 'figurki';
  return 'figurek';
}

/** „5 figurek" — liczba razem z odmienionym słowem. */
export function ileFigurek(n) {
  return `${n} ${odmienFigurki(n)}`;
}

/**
 * Zbiera wiersze widoku `figures_full` w grupy po postaci.
 *
 * Kolejność grup idzie za kolejnością pierwszego wystąpienia, więc wynik
 * wyszukiwania nie przeskakuje przy każdym wpisanym znaku.
 *
 * @param {object[]} figurki  wiersze z `figures_full`
 * @param {object}   postacie mapa `id postaci` → wiersz z `characters`
 */
export function grupujPoPostaci(figurki, postacie = {}) {
  const wg = new Map();

  for (const fig of figurki || []) {
    // Figurka bez podpiętej postaci — zgłoszenie sprzed przebiegu
    // rozdzielającego — dostaje własną grupę. Nie może zniknąć z wyników
    // tylko dlatego, że nie przeszła jeszcze przez `npm run postacie`.
    const klucz = fig.character_id || `bez-postaci:${fig.name}`;
    if (!wg.has(klucz)) {
      wg.set(klucz, {
        klucz,
        postac: fig.character_id ? postacie[fig.character_id] || null : null,
        nazwa: fig.character_name || fig.name,
        figurki: [],
      });
    }
    wg.get(klucz).figurki.push(fig);
  }

  return [...wg.values()];
}
