// ============================================================================
// TOŻSAMOŚĆ FIGURKI — nasza własna, nie pożyczona.
// ----------------------------------------------------------------------------
// Każda figurka musi mieć jeden stały adres na naszej domenie, bo short
// wypuszczony na TikToka czy YouTube'a kieruje dokładnie tam — i będzie tam
// kierował za rok, niezależnie od tego, co zrobią zewnętrzne katalogi.
//
// DLACZEGO NIE NUMER Z MyFigureCollection:
// MFC to jedna z wielu baz, nie wyrocznia. Gdyby nasz adres wynikał z ich
// numeru, ich pomyłka, zmiana struktury albo usunięcie pozycji psułoby link
// wypalony na stałe w opublikowanym filmie. Dlatego tożsamość liczymy z
// WŁASNYCH danych figurki, a numery katalogów trzymamy obok — jako zwykłe
// odnośniki, wszystkie równorzędne i wszystkie wymienne.
//
// Trzy rzeczy, każda o innym zadaniu:
//   identityKey — do wykrywania duplikatów (nie pokazujemy jej nigdzie),
//   slug        — czytelny adres do opisów pod filmami i dla wyszukiwarek,
//   shortCode   — krótki kod wypalany w obrazie shorta, gdzie długi się nie mieści.
// ============================================================================

// Słowa opisujące WPIS, a nie figurkę. „Miyuki Sone Base" i „Miyuki Sone" to
// ta sama figurka — a taka para siedziała w naszej bazie jako dwa rekordy.
const NOISE = /\b(base|ver|version|edition|figure|figurka|pvc|scale)\b/gi;

/** Wspólne sprowadzenie tekstu do postaci porównywalnej. */
function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(NOISE, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Odcisk tożsamości PRODUKTU — służy WYŁĄCZNIE do wykrywania duplikatów.
 *
 * Bierzemy to, co odróżnia konkretne wydanie: postać, wersję, producenta
 * i skalę. Sama nazwa postaci nie wystarcza (Miyuki Sone ma kilka różnych
 * figurek), a producent i skala razem wskazują już konkretny produkt.
 *
 * ⚠️ WŁASNOŚĆ, NA KTÓREJ STOI CAŁE ROZDZIELENIE POSTACI OD PRODUKTU:
 * odcisk musi wyjść IDENTYCZNY niezależnie od tego, czy nazwa przyjdzie
 * w jednym kawałku („Zero Two: For My Darling"), czy rozdzielona na postać
 * i wersję („Zero Two" + „For My Darling"). Dzięki temu przebieg rozdzielający
 * dane nie uzna przerobionych rekordów za NOWE figurki i nie zrobi z 26 pozycji
 * 52. Trzyma to `normalize` + wycięcie odstępów niżej; jest na to test.
 */
export function identityKey({ name, manufacturer, scale, version } = {}) {
  const postacIWersja = `${normalize(name)} ${normalize(version)}`;
  const parts = [postacIWersja, normalize(manufacturer), normalize(scale)]
    .map((p) => p.replace(/\s+/g, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("|") : "";
}

/**
 * Odcisk tożsamości POSTACI — inny byt niż produkt, więc inna funkcja.
 *
 * Sama nazwa nie wystarcza: „Sakura" występuje w kilku niepowiązanych seriach
 * i to są RÓŻNE postacie, które nie mogą dzielić jednej nazwy japońskiej.
 * Dlatego seria wchodzi do odcisku na równi z nazwą.
 *
 * Producenta ani skali tu NIE MA i nie może być — to cechy figurki, a nie
 * postaci. Super Sonico jest jedna, jej figurek jest kilkanaście.
 */
export function characterKey({ name, series } = {}) {
  const parts = [normalize(name), normalize(series)]
    .map((p) => p.replace(/\s+/g, ""))
    .filter(Boolean);
  // Sama seria bez nazwy postaci nie jest tożsamością nikogo.
  return normalize(name) ? parts.join("|") : "";
}

/**
 * Czytelny adres: `sone-miyuki-griffon-enterprises-1-8`.
 *
 * Raz nadany NIE ZMIENIA SIĘ nigdy — nawet gdy poprawimy nazwę figurki.
 * Adres wypalony w opublikowanym filmie musi działać zawsze, a filmu nie da
 * się już poprawić. Zmiana nazwy daje więc nowy adres tylko dla NOWYCH figurek.
 */
export function makeSlug({ name, manufacturer, scale, version } = {}) {
  // Wyłącznie ASCII. Japoński w adresie zamienia się w ciąg typu
  // „%E6%B3%89%E3%81%93%E3%81%AA%E3%81%9F" — nie do wpisania z ekranu i nie do
  // przeczytania pod filmem. Gdy po odsianiu nic nie zostanie, wywołujący
  // sięgnie po krótki kod, który działa dla każdej nazwy.
  const piece = (v) =>
    normalize(v)
      .normalize("NFD")                 // rozdziela znaki diakrytyczne (é → e + ´)
      .replace(/[̀-ͯ]/g, "")  // ...i usuwa je
      .replace(/[^a-z0-9\s-]/g, " ")
      .trim()
      .replace(/\s+/g, "-");
  // Skalę bierzemy WYŁĄCZNIE gdy jest liczbowa: „1/8" → „1-8".
  // Nendoroidy i figurki bez skali mają wpisane „Non-scale", a to nic nie wnosi
  // do adresu — dawało ogonek „...-good-smile-company-non".
  const ulamek = String(scale || "").match(/(\d+)\s*\/\s*(\d+)/);
  const scalePart = ulamek ? `${ulamek[1]}-${ulamek[2]}` : "";

  // Wersja idzie zaraz za postacią — dzięki temu adres wychodzi tak samo,
  // czy nazwa przyszła złączona („Zero Two: For My Darling"), czy rozdzielona.
  // Bez tego rozdzielenie danych zmieniłoby adresy figurek, a adres wypalony
  // w opublikowanym filmie zmienić się NIE MOŻE.
  const slug = [piece(name), piece(version), piece(manufacturer), scalePart]
    .filter(Boolean)
    .join("-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Adres bez treści (np. sama nazwa japońska) jest bezużyteczny — niech
  // wywołujący sięgnie po krótki kod.
  return slug.length >= 3 ? slug.slice(0, 90).replace(/-$/, "") : "";
}

// Bez znaków, które ludzie mylą przy przepisywaniu z ekranu telefonu:
// zero i O, jedynka oraz I i L. Kod ma być do odczytania z krótkiego filmu.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;

/**
 * Krótki kod do wypalenia w obrazie shorta: `figurefame.com/f/7K2M`.
 *
 * Losowy, nie kolejny numer — kolejny zdradzałby, ile figurek mamy w bazie
 * i pozwalał przeglądać cudze wpisy po kolei. Powtórkę wychwytuje warunek
 * unikalności w bazie; przy 31^4 ≈ 923 tysiącach kombinacji to rzadkość.
 */
export function makeShortCode(random = Math.random) {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

/** Czy tekst z adresu wygląda na krótki kod, czy na czytelny adres. */
export function looksLikeShortCode(value) {
  return new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`).test(String(value || "").toUpperCase());
}

/** Pełny adres figurki. Domena z ustawień — dziś Vercel, docelowo własna. */
export function figureUrl(figure, baseUrl) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const path = figure?.slug || figure?.short_code || figure?.id;
  return `${base}/f/${path}`;
}
