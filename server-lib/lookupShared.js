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
 * Normalizacja członu klucza.
 *
 * Musi być AGRESYWNA, i to nie z wygody. Wynik wyszukiwania wraca do
 * formularza, więc katalogowa pisownia („Lucky☆Star") zastępuje tę wpisaną
 * przez zgłaszającego („Lucky Star”). Przy słabej normalizacji drugie
 * kliknięcie liczyło INNY klucz, chybiało w pamięć podręczną i uruchamiało
 * pełne wyszukiwanie od zera — a to bez przeglądarki potrafi zwrócić gorsze
 * dane i nadpisać nimi te dobre. Zdarzyło się naprawdę: poprawne „Clayz, 1/8"
 * zamieniło się w „Good Smile Company, 1/4".
 *
 * Dlatego zostawiamy WYŁĄCZNIE litery i cyfry — bez odstępów, interpunkcji,
 * myślników i znaków ozdobnych (☆ ★ ・ ♪), z pełnej szerokości na zwykłą.
 * Odstępy też lecą, bo katalogi zapisują to samo raz z separatorem, raz bez:
 * „らき☆すた" i „らきすた" muszą dawać ten sam klucz, tak jak „Lucky Star"
 * i „Lucky☆Star". Skala „1/7" i „1 / 7" schodzą tak samo do „17".
 *
 * Kolejności słów NIE ruszamy — „Izumi Konata" i „Konata Izumi" zostają
 * osobnymi kluczami. Sklejanie ich groziłoby podaniem danych innej figurki,
 * a to błąd znacznie gorszy niż jedno zapytanie więcej.
 */
const norm = (s) =>
  String(s || "")
    .normalize("NFKC") // ｌｕｃｋｙ → lucky, ﾊ → ハ
    .toLowerCase()
    // Zostawiamy litery i cyfry DOWOLNEGO alfabetu (japoński musi przetrwać),
    // wycinamy resztę: odstępy, interpunkcję, myślniki, gwiazdki, symbole.
    .replace(/[^\p{L}\p{N}]+/gu, "");

// ============================================================================
// PAMIĘĆ PODRĘCZNA MA DWA POZIOMY — i to jest naprawa, nie optymalizacja.
// ----------------------------------------------------------------------------
// Do 03.08 klucz brzmiał `tryb|nazwa|seria`, czyli był kluczem POSTACI, choć
// przechowywał dane PRODUKTU. Wszystkie figurki jednej postaci — Kotobukiya
// 1/6, Alter 1/8, Good Smile 1/7 — dzieliły jeden wpis i nadpisywały się
// nawzajem; wygrywało ostatnie pobranie. Stąd wzięło się „dane Silfy to Alter
// 1/8 zamiast Kotobukiya 1/6": w lookup_queue widać trzy pobrania tej samej
// figurki piszące pod ten sam klucz.
//
// Teraz każdy poziom trzyma to, co do niego należy.
// ============================================================================

/**
 * Klucz POSTACI — nazwa japońska i japoński tytuł serii.
 *
 * To fakty o postaci, nie o produkcie: „Super Sonico" to zawsze すーぱーそに子,
 * niezależnie od tego, czy figurka jest od Altera czy Good Smile. Dzięki temu
 * poziomowi japońska nazwa pobierana jest RAZ i trafia potem do każdej kolejnej
 * figurki tej postaci sama — a właśnie ta wartość wiecznie „nie chciała się
 * uzupełniać".
 *
 * Bez `mode`: tryb dokładny nie sprawia, że nazwa postaci robi się prawdziwsza
 * — to ta sama rubryka w tym samym katalogu. Wspólny wpis dla obu trybów
 * podwaja trafialność. Przed zapisem pustki chroni `wpisMaTresc` po stronie
 * wywołującego, a „⭐ TOP" i tak omija odczyt (`refresh=1`).
 */
export function kluczPostaci(name, series = "") {
  return `char|${norm(name)}|${norm(series)}`;
}

/**
 * Klucz PRODUKTU — cena, zdjęcie, wartość rynkowa, numery katalogów.
 *
 * Producent, skala i wersja są w kluczu OBOWIĄZKOWO: dopiero one odróżniają
 * konkretne wydanie. To ta zmiana kończy nadpisywanie się wersji.
 *
 * `mode` zostaje, bo tryb dokładny naprawdę zwraca pełniejszy produkt
 * (więcej wariantów nazwy, potwierdzone zdjęcie) i nie chcemy, żeby uboższy
 * wynik „quick" podawał się za niego.
 */
export function kluczProduktu(name, series = "", mode = "quick", opcje = {}) {
  const { manufacturer = "", scale = "", version = "" } = opcje;
  return [
    "prod",
    mode,
    norm(name),
    norm(series),
    norm(manufacturer),
    norm(scale),
    norm(version),
  ].join("|");
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
