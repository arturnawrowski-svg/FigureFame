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
 * Klucz wpisu w lookup_cache. Normalizuje wielkość liter i odstępy, żeby
 * „Hatsune  Miku" i „hatsune miku" trafiały w ten sam wpis.
 */
export function cacheKey(name, series = "", mode = "quick") {
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
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
