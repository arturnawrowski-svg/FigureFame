// ============================================================================
// Wspólne elementy wyszukiwania danych figurek.
// ----------------------------------------------------------------------------
// Ten sam kod używany po OBU stronach:
//   • api/fetch-figure.js      — działa w chmurze (Vercel),
//   • worker/lookupWorker.mjs  — działa na komputerze admina.
//
// Dlaczego to musi być wspólne: worker zapisuje wynik do lookup_cache pod
// pewnym kluczem, a API szuka go pod tym samym. Gdyby oba miały własną kopię
// funkcji i jedna się zmieniła, pamięć podręczna po cichu przestałaby trafiać —
// bez żadnego błędu, po prostu każde wyszukanie znów kosztowałoby limit.
// ============================================================================

import { createRequire } from "node:module";

// Nagłówek przeglądarki dla żądań wychodzących. Część serwisów odrzuca ruch
// bez wiarygodnego User-Agenta (albo podaje uboższą wersję strony).
export const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * Klucz wpisu w lookup_cache.
 *
 * Normalizacja musi być AGRESYWNA, i to nie z wygody. Wynik wyszukiwania
 * wraca do formularza, więc katalogowa pisownia („Lucky☆Star") zastępuje tę
 * wpisaną przez zgłaszającego („Lucky Star”). Przy słabej normalizacji drugie
 * kliknięcie liczyło INNY klucz, chybiało w pamięć podręczną i uruchamiało
 * pełne wyszukiwanie od zera — a to bez przeglądarki potrafi zwrócić gorsze
 * dane i nadpisać nimi te dobre. Zdarzyło się naprawdę: poprawne „Clayz, 1/8"
 * zamieniło się w „Good Smile Company, 1/4".
 *
 * Dlatego zostawiamy WYŁĄCZNIE litery i cyfry — bez odstępów, interpunkcji,
 * myślników i znaków ozdobnych (☆ ★ ・ ♪), z pełnej szerokości na zwykłą.
 * Odstępy też lecą, bo katalogi zapisują to samo raz z separatorem, raz bez:
 * „らき☆すた" i „らきすた" muszą dawać ten sam klucz, tak jak „Lucky Star"
 * i „Lucky☆Star".
 *
 * Kolejności słów NIE ruszamy — „Izumi Konata" i „Konata Izumi" zostają
 * osobnymi kluczami. Sklejanie ich groziłoby podaniem danych innej figurki,
 * a to błąd znacznie gorszy niż jedno zapytanie więcej.
 */
export function cacheKey(name, series = "", mode = "quick") {
  const norm = (s) =>
    String(s || "")
      .normalize("NFKC") // ｌｕｃｋｙ → lucky, ﾊ → ハ
      .toLowerCase()
      // Zostawiamy litery i cyfry DOWOLNEGO alfabetu (japoński musi przetrwać),
      // wycinamy resztę: odstępy, interpunkcję, myślniki, gwiazdki, symbole.
      .replace(/[^\p{L}\p{N}]+/gu, "");
  return `${mode}|${norm(name)}|${norm(series)}`;
}

/**
 * Czy mamy do dyspozycji prawdziwą przeglądarkę (Playwright).
 *
 * Sprawdzamy FAKT — czy pakiet da się w ogóle znaleźć — zamiast zgadywać po
 * zmiennych środowiskowych. Powód: `VERCEL` i spółka to „systemowe zmienne",
 * które w ustawieniach projektu można wyłączyć; wtedy kod uznawał chmurę za
 * komputer lokalny i nie zlecał pobrania workerowi (cicha awaria).
 *
 * Playwright jest zależnością deweloperską, więc w chmurze nie jest instalowany
 * i `resolve` tam zawiedzie. Samo sprawdzenie nie uruchamia przeglądarki.
 */
let browserAvailable = null;

export function hasLocalBrowser() {
  // Jawna deklaracja wygrywa ze wszystkim. Zgadywanie po środowisku zawodziło
  // dwa razy: „systemowe zmienne" Vercela można wyłączyć w ustawieniach, a sam
  // pakiet Playwright bywa pakowany do funkcji mimo że przeglądarki tam nie ma.
  // FIGUREFAME_CLOUD=1 ustawiamy w konfiguracji Vercela — koniec domysłów.
  if (process.env.FIGUREFAME_CLOUD === "1") return false;

  if (browserAvailable === null) {
    try {
      createRequire(import.meta.url).resolve("playwright");
      browserAvailable = true;
    } catch {
      browserAvailable = false;
    }
  }
  return browserAvailable;
}

/** Odwrotność — czytelniejsza tam, gdzie pytamy „czy jesteśmy w chmurze". */
export function isServerless() {
  return !hasLocalBrowser();
}
