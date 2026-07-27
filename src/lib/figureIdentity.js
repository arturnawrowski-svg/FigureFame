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
 * Odcisk tożsamości — służy WYŁĄCZNIE do wykrywania duplikatów.
 *
 * Bierzemy to, co odróżnia konkretne wydanie: postać, producenta i skalę.
 * Sama nazwa postaci nie wystarcza (Miyuki Sone ma kilka różnych figurek),
 * a producent i skala razem wskazują już konkretny produkt.
 */
export function identityKey({ name, manufacturer, scale } = {}) {
  const parts = [normalize(name), normalize(manufacturer), normalize(scale)]
    .map((p) => p.replace(/\s+/g, ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("|") : "";
}

/**
 * Czytelny adres: `sone-miyuki-griffon-enterprises-1-8`.
 *
 * Raz nadany NIE ZMIENIA SIĘ nigdy — nawet gdy poprawimy nazwę figurki.
 * Adres wypalony w opublikowanym filmie musi działać zawsze, a filmu nie da
 * się już poprawić. Zmiana nazwy daje więc nowy adres tylko dla NOWYCH figurek.
 */
export function makeSlug({ name, manufacturer, scale } = {}) {
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
  // Ukośnik w skali zamieniamy na myślnik: „1/8" → „1-8".
  const scalePart = piece(String(scale || "").replace("/", "-"));

  const slug = [piece(name), piece(manufacturer), scalePart]
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
