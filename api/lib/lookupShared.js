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
 * Czy kod działa w środowisku bezserwerowym (Vercel / Lambda).
 * Tam nie ma przeglądarki, więc pobieranie stron musi iść przez pośrednika
 * albo trafić do kolejki dla komputera admina.
 */
export function isServerless() {
  return !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** Odwrotność powyższego — czytelniejsza tam, gdzie pytamy o własną przeglądarkę. */
export function hasLocalBrowser() {
  return !isServerless();
}
