// ============================================================================
// Pobranie zdjęcia figurki → WebP → nasz Storage. Jedno miejsce dla OBU ścieżek:
//   • api/fetch-figure.js     — wyszukiwanie w chmurze,
//   • worker/lookupWorker.mjs — wyszukiwanie przeglądarką na komputerze admina.
//
// DLACZEGO TO MUSI BYĆ WSPÓLNE: worker zapisywał do pamięci podręcznej SUROWY
// adres zdjęcia z cudzego serwera. Taki link trafiał potem do formularza i do
// Gabloty — a obcy serwer może go odciąć w każdej chwili (i odcinał: karty na
// iPhonie potrafiły zostać puste). Po scaleniu tej logiki każde zdjęcie, które
// widzi użytkownik, leży już w naszym Storage.
//
// Zasada nadrzędna: albo GOTOWE zdjęcie u nas, albo pusto. Nigdy „adres, który
// wygląda na wypełnione pole".
// ============================================================================
import sharp from "sharp";
import * as cheerio from "cheerio";
import { getSupabaseAdmin } from "./supabaseAdmin.js";
import { BROWSER_UA } from "./lookupShared.js";

// ---------------------------------------------------------------------------
// Pobranie pliku ze znalezionego adresu. Zwraca Buffer albo null.
// AI bywa niedokładne: potrafi podać link do STRONY produktu zamiast pliku,
// albo adres, który w ogóle nie istnieje (404). Dlatego:
//   1) sprawdzamy content-type — tylko image/* uznajemy za zdjęcie,
//   2) gdy dostaliśmy HTML, wyciągamy og:image / itemprop=image i pobieramy je,
//   3) przy niepowodzeniu zwracamy null.
// ---------------------------------------------------------------------------
export async function downloadImage(url, depth = 0) {
  if (!url || depth > 1) return null;

  let res;
  try {
    res = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
  } catch {
    return null; // padnięcie sieci nie może wywalić całego wyszukiwania
  }
  if (!res.ok) return null;

  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (type.startsWith("image/")) {
    return Buffer.from(await res.arrayBuffer());
  }

  // To strona, nie plik — poszukaj na niej zdjęcia produktu i pobierz je.
  if (type.includes("html")) {
    const $ = cheerio.load(await res.text());
    const found =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      $('img[itemprop="image"]').attr("src");
    if (!found) return null;
    const abs = found.startsWith("http") ? found : new URL(found, url).href;
    return await downloadImage(abs, depth + 1);
  }

  return null;
}

/**
 * Encyklopedia trzyma to samo zdjęcie w czterech rozmiarach — decyduje cyfra
 * w ścieżce: /upload/items/0/ (2 kB miniaturka) … /2/ (pełny podgląd).
 * Katalogi podają zwykle mały wariant, a karta w Gablocie ma 320×500 px, więc
 * miniaturka wyglądała na niej jak rozmazana plama. Bierzemy największy
 * dostępny; gdy go nie ma, zostaje adres pierwotny.
 */
const MFC_LARGEST = 2;

export function preferLargestMfc(url) {
  return String(url || "").replace(
    /(static\.myfigurecollection\.net\/upload\/items\/)\d+\//,
    `$1${MFC_LARGEST}/`
  );
}

/**
 * Pobiera zdjęcie spod `url`, konwertuje na WebP i wgrywa do bucketu
 * `figure-images`. Zwraca publiczny adres u nas albo null.
 *
 * Adresy już wskazujące na nasz Storage zwracamy bez zmian — nie ma sensu
 * przepisywać własnego pliku w kółko przy każdym wyszukiwaniu.
 */
export async function rehostImage(url, figureName = "figure") {
  if (!url || !url.startsWith("http")) return null;
  if (url.includes("supabase.co")) return url;

  // Najpierw duży wariant; gdyby go zabrakło, wracamy do tego, co podał katalog.
  const large = preferLargestMfc(url);
  const buffer = (large !== url ? await downloadImage(large) : null) || (await downloadImage(url));
  if (!buffer) return null;

  try {
    const webp = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    const slug = String(figureName || "figure")
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();
    const filename = `${slug}_${Date.now()}.webp`;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from("figure-images")
      .upload(filename, webp, { contentType: "image/webp", upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from("figure-images").getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (err) {
    console.error("[zdjęcie] nie udało się zapisać:", err.message);
    return null;
  }
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Czy wiemy NA PEWNO, że to zdjęcie tej figurki.
 *
 * Po co: pojedynczy katalog potrafi trafić w inną wersję tej samej postaci —
 * a wtedy do Gabloty wchodzi ładne zdjęcie niewłaściwej figurki. Przepuszczamy
 * zdjęcie w dwóch przypadkach:
 *
 *   1. ZGODA DWÓCH NIEZALEŻNYCH ŹRÓDEŁ — wskazują ten sam plik albo tego
 *      samego producenta i skalę.
 *   2. ZGODNOŚĆ ZE ZGŁOSZENIEM — znaleziony produkt ma dokładnie tego
 *      producenta i tę skalę, które podano przy figurce.
 *
 * WAŻNE o niezależności: gdy encyklopedia została otwarta pod numerem pozycji
 * podanym przez agregator (`_viaItemId`), oba źródła mówią o tym samym z
 * definicji — to jedno rozpoznanie, nie dwa. Liczymy je wtedy jako jedno,
 * bo inaczej „potwierdzenie" byłoby rozmową ze sobą samym.
 *
 * @param {Array<[string, object|null]>} entries pary [nazwa źródła, rekord]
 * @param {{manufacturer?: string, scale?: string}} [expected] dane ze zgłoszenia
 * @returns {{ agreed: boolean, imageUrl: string, by: string[], reason: string }}
 */
export function crossCheckImage(entries, expected = {}) {
  const found = entries.filter(([, rec]) => rec && rec.official_image_url);
  if (found.length === 0) return { agreed: false, imageUrl: "", by: [], reason: "brak zdjęcia w źródłach" };

  // Adres pliku bez parametrów zapytania — te same zdjęcia bywają podawane
  // z różnymi dopiskami (rozmiar, znacznik czasu).
  const fileOf = (u) => String(u || "").split("?")[0].trim().toLowerCase();

  // Wyniki wyprowadzone z cudzej podpowiedzi nie są niezależnym głosem.
  const independent = found.filter(([, rec]) => !rec._viaItemId);

  const byFile = new Map();
  for (const [src, rec] of independent) {
    const f = fileOf(rec.official_image_url);
    byFile.set(f, [...(byFile.get(f) || []), src]);
  }
  for (const [file, sources] of byFile) {
    if (sources.length >= 2) {
      const rec = independent.find(([, r]) => fileOf(r.official_image_url) === file)[1];
      return { agreed: true, imageUrl: rec.official_image_url, by: sources, reason: "to samo zdjęcie w dwóch źródłach" };
    }
  }

  // Różne zdjęcia — czy niezależne źródła opisują ten sam produkt?
  for (let i = 0; i < independent.length; i++) {
    for (let j = i + 1; j < independent.length; j++) {
      const [srcA, a] = independent[i];
      const [srcB, b] = independent[j];
      const sameMaker = a.manufacturer && b.manufacturer && norm(a.manufacturer) === norm(b.manufacturer);
      const sameScale = a.scale && b.scale && norm(a.scale) === norm(b.scale);
      if (sameMaker && sameScale) {
        return { agreed: true, imageUrl: a.official_image_url, by: [srcA, srcB], reason: "zgodny producent i skala" };
      }
    }
  }

  // Jedno źródło, ale trafia dokładnie w to, co podano przy zgłoszeniu.
  // Producent i skala razem wskazują konkretne wydanie, nie samą postać.
  if (expected.manufacturer && expected.scale) {
    for (const [src, rec] of found) {
      const makerOk = rec.manufacturer && norm(rec.manufacturer).includes(norm(expected.manufacturer));
      const scaleOk = rec.scale && norm(rec.scale) === norm(expected.scale);
      if (makerOk && scaleOk) {
        return { agreed: true, imageUrl: rec.official_image_url, by: [src], reason: "zgodne z danymi ze zgłoszenia" };
      }
    }
  }

  return {
    agreed: false,
    imageUrl: found[0][1].official_image_url,
    by: [found[0][0]],
    reason: "za mało potwierdzeń",
  };
}
