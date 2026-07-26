// ============================================================================
// FigureFame — DRABINA ŹRÓDEŁ (Etap 3+). Twarde dane zamiast zgadywania AI.
// ----------------------------------------------------------------------------
// Kolejność wiarygodności (pierwsze niepuste pole wygrywa):
//   1. MyFigureCollection — encyklopedia: seria, postać, producent, skala,
//      data i cena premiery, kod kreskowy, OSTRZEŻENIE O PODRÓBKACH, zdjęcie.
//   2. AmiAmi (oficjalne API JSON) — japońska nazwa produktu, aktualna cena
//      z podatkiem, producent, zdjęcie.
//   3. HobbySearch (1999.co.jp) — zapasowe zdjęcie i nazwa.
//   4. Good Smile Company — dane kanoniczne dla figurek GSC.
// AI (z groundingiem) dopina dopiero to, czego nie dało żadne z powyższych.
//
// KOSZTY / FREE-FIRST — ustalone testami, nie na oko:
//   • GoodSmile, Mandarake, Solaris, Wikidata → odpowiadają wprost z Node = ZA DARMO.
//   • MFC, AmiAmi, HobbySearch, Kotobukiya → Cloudflare odrzuca Node („Just a
//     moment…”) niezależnie od nagłówków, bo rozpoznaje odcisk TLS. Tu jedynym
//     wyjściem jest pośrednik — używany WYŁĄCZNIE dla nich (lista NEEDS_PROXY),
//     przez łańcuch dostawców z [[scrapeProviders]] (kilka darmowych pakietów).
//   • Pośrednika wołamy BEZ trybów „premium/JS” — zwykłe zapytanie kosztuje
//     1 kredyt zamiast 10, a dla tych stron działa tak samo (sprawdzone).
// ============================================================================
import * as cheerio from "cheerio";
import { scrapeFetch } from "./scrapeProviders.js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Źródła za Cloudflare — bezpośrednio z Node zawsze dostaną 403.
const NEEDS_PROXY = [
  "myfigurecollection.net",
  "api.amiami.com",
  "1999.co.jp",
  "kotobukiya.co.jp",
  "suruga-ya.jp",
];

// Zapytanie bezpośrednie jest szybkie; przez proxy trwa ~7 s, więc dajemy mu
// więcej czasu, a i tak nie pozwalamy funkcji wisieć w nieskończoność.
const TIMEOUT_DIRECT_MS = 8000;
const TIMEOUT_PROXY_MS = 20000;

// AmiAmi i HobbySearch (japońskie, za Cloudflare) na obecnym planie proxy
// zwracają ROTATION_FAILED — proxy nie ma dla nich działających IP. Każda próba
// to spalony kredyt i zajęty slot równoległości (limit 5), więc domyślnie są
// wyłączone. Adaptery zostają gotowe: wystarczy FIGURE_SOURCES_JP=1 przy planie
// proxy z japońskimi IP.
const JP_SOURCES_ENABLED = process.env.FIGURE_SOURCES_JP === "1";

function needsProxy(url) {
  return NEEDS_PROXY.some((host) => url.includes(host));
}

// Pobranie strony. Proxy tylko tam, gdzie to konieczne (oszczędzamy kredyty).
// Gdy źródło wymaga proxy, a klucza brak — pomijamy je, zamiast parsować
// stronę błędu Cloudflare jako dane.
async function get(url, { json = false } = {}) {
  // Strony za Cloudflare idą przez łańcuch dostawców scrapingu (scrapeProviders):
  // gdy pierwszy wyczerpie darmowy limit, automatycznie wchodzi kolejny.
  if (needsProxy(url)) {
    const result = await scrapeFetch(url, { timeoutMs: TIMEOUT_PROXY_MS });
    if (!result) return null;
    if (!json) return result.html;
    try {
      return JSON.parse(result.html);
    } catch {
      return null; // dostawca oddał HTML zamiast JSON
    }
  }

  // Reszta źródeł odpowiada wprost — bez pośrednika, czyli za darmo.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_DIRECT_MS);
  try {
    const headers = { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" };
    if (json) headers["X-User-Key"] = "amiami_dev";
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;

    if (json) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    const html = await res.text();
    // Wyzwanie Cloudflare to nie są dane — lepiej zwrócić brak niż śmieci.
    if (html.includes("Just a moment") || html.includes("cf-browser-verification")) return null;
    return html;
  } catch {
    return null; // padnięcie jednego źródła nie może wywalić całej drabiny
  } finally {
    clearTimeout(timer);
  }
}

// Warianty zapytania — katalogi indeksują POSTAĆ i SERIĘ, a nie nazwy wersji.
// „Levi - Fortitude Ver." daje 0 wyników, ale „Levi Attack on Titan" już 49.
// Dlatego próbujemy od najskuteczniejszego wariantu do najbardziej dosłownego.
export function queryVariants(name, series = "") {
  const full = String(name || "").trim();
  // nazwa postaci = fragment przed pierwszym separatorem wersji
  const core = full.split(/\s[-–—]\s|\(/)[0].trim();
  const cleaned = full
    .replace(/\(.*?\)/g, " ")
    .replace(/\b(ver|version)\.?\b/gi, " ")
    .replace(/[-–—:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const variants = [];
  if (core && series) variants.push(`${core} ${series}`);
  variants.push(full);
  if (cleaned && cleaned !== full) variants.push(cleaned);
  if (core && core !== full) variants.push(core);
  return [...new Set(variants.filter(Boolean))];
}

// Wyszukiwarki katalogów zwracają też gadżety (koszulki, plakaty) i zestawy
// zbiorcze. Zamiast brać pierwszy wynik, oceniamy dopasowanie nazwy.
const MERCH = /t-shirt|poster|keychain|key chain|badge|mug|towel|sticker|plush|acrylic|clearfile|card/i;

function scoreCandidate(title, tokens) {
  const t = String(title || "").toLowerCase();
  if (!t) return -99;
  let score = tokens.reduce((acc, tok) => (t.includes(tok) ? acc + 1 : acc), 0);
  if (MERCH.test(t)) score -= 3; // to nie jest figurka
  return score;
}

function nameTokens(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !["ver", "version", "the"].includes(w));
}

// Pusty rekord w znormalizowanym kształcie używanym przez cały projekt.
function emptyRecord(source) {
  return {
    _source: source,
    name: "",
    japanese_name: "",
    series: "",
    japanese_series: "",
    manufacturer: "",
    scale: "",
    original_price: "",
    official_image_url: "",
    product_url: "",
    bootleg_warning: false,
  };
}

// ---------------------------------------------------------------------------
// 1. MyFigureCollection — najbogatsze źródło.
// Struktura (zweryfikowana): .data-field > .data-label + .data-value,
// japońskie odpowiedniki w atrybucie: <span switch="ボーカロイド">Vocaloid</span>
// ---------------------------------------------------------------------------
export async function fromMFC(name, series = "", { deep = false } = {}) {
  const out = emptyRecord("mfc");

  // Kolejne warianty, aż któryś trafi (kończymy na pierwszym z wynikiem,
  // żeby nie zużywać kredytów proxy bez potrzeby). Z listy wyników bierzemy
  // NAJLEPIEJ dopasowany do nazwy, nie pierwszy z brzegu.
  const tokens = nameTokens(name);
  let href = null;
  // Każdy wariant to osobne zapytanie u pośrednika, a pula jest mała: zwykle 2,
  // w trybie dokładnym (TOP) wszystkie — świadomy wybór admina.
  for (const q of queryVariants(name, series).slice(0, deep ? 4 : 2)) {
    const searchHtml = await get(
      `https://myfigurecollection.net/browse.v4.php?keywords=${encodeURIComponent(q)}`
    );
    if (!searchHtml) continue;

    const $q = cheerio.load(searchHtml);
    let best = null;
    let bestScore = -Infinity;
    $q(".item-icon a").slice(0, 25).each((_, el) => {
      const link = $q(el).attr("href");
      if (!link) return;
      const score = scoreCandidate($q(el).find("img").attr("alt"), tokens);
      if (score > bestScore) {
        bestScore = score;
        best = link;
      }
    });

    if (best) {
      href = best;
      break;
    }
  }
  if (!href) return null;

  const itemUrl = href.startsWith("http") ? href : `https://myfigurecollection.net${href}`;
  const itemHtml = await get(itemUrl);
  if (!itemHtml) return null;

  const $ = cheerio.load(itemHtml);
  out.product_url = itemUrl;

  // Mapa etykieta → { tekst, japoński }
  const fields = {};
  $(".data-field").each((_, el) => {
    const label = $(el).find(".data-label").text().trim();
    if (!label) return;
    const $val = $(el).find(".data-value");
    fields[label] = {
      text: $val.text().trim().replace(/\s+/g, " "),
      jp: $val.find("span[switch]").first().attr("switch") || "",
      html: $val,
    };
  });

  const pick = (label) => fields[label] || null;

  const origin = pick("Origin");
  if (origin) {
    out.series = origin.text;
    out.japanese_series = origin.jp;
  }

  const character = pick("Character");
  if (character) {
    out.name = character.text;
    out.japanese_name = character.jp;
  }

  // "Good Smile Company as Manufacturer" — bierzemy wpis oznaczony jako producent.
  const company = pick("Company");
  if (company) {
    const entry = company.html
      .find("a")
      .filter((_, a) => $(a).parent().text().includes("as Manufacturer"))
      .first()
      .text()
      .trim();
    out.manufacturer = entry || company.text.replace(/\s*as .*/i, "").trim();
  }

  // "H=100mm (3.9in)" (Nendoroid) albo "1/7" (figurka skalowana)
  const dims = pick("Dimensions");
  if (dims) {
    const scale = dims.text.match(/(\d\/\d+)/);
    out.scale = scale ? scale[1] : dims.text;
  }

  // "04/24/2012 as Standard (Japan)3,333 JPY (USD) • 4582191969077"
  const releases = pick("Releases");
  if (releases) {
    const price = releases.text.match(/([\d,]+)\s*JPY/);
    if (price) out.original_price = `${price[1].replace(/,/g, "")} JPY`;
  }

  // MFC wprost ostrzega przed podróbkami — bezcenne dla modułu BootlegRisk.
  const various = pick("Various");
  if (various && /counterfeit|bootleg|fake/i.test(various.text)) out.bootleg_warning = true;

  out.official_image_url = $('meta[property="og:image"]').attr("content") || "";

  // Pełna nazwa produktu z og:title bywa lepsza niż sama nazwa postaci.
  const ogTitle = $('meta[property="og:title"]').attr("content");
  if (ogTitle && !out.name) out.name = ogTitle.trim();

  return out;
}

// ---------------------------------------------------------------------------
// 2. AmiAmi — OFICJALNE API JSON (bez scrapowania). Ceny w JPY + zdjęcie.
// ---------------------------------------------------------------------------
export async function fromAmiAmi(name) {
  const data = await get(
    `https://api.amiami.com/api/v1.0/items?s_keywords=${encodeURIComponent(name)}&pagemax=5`,
    { json: true }
  );
  const item = data?.items?.[0];
  if (!item) return null;

  const out = emptyRecord("amiami");
  out.japanese_name = item.gname || "";
  out.manufacturer = item.maker_name || "";
  if (item.thumb_url) out.official_image_url = `https://img.amiami.com${item.thumb_url}`;
  const price = item.c_price_taxed || item.min_price;
  if (price) out.original_price = `${price} JPY`;
  if (item.gcode) out.product_url = `https://www.amiami.com/eng/detail/?gcode=${item.gcode}`;
  return out;
}

// ---------------------------------------------------------------------------
// 3. HobbySearch (1999.co.jp) — zapasowe zdjęcie i nazwa.
// ---------------------------------------------------------------------------
export async function fromHobbySearch(name) {
  const searchHtml = await get(
    `https://www.1999.co.jp/eng/search/?sw=${encodeURIComponent(name)}`
  );
  if (!searchHtml) return null;

  const $s = cheerio.load(searchHtml);
  const href = $s('a[href^="/eng/1"]').first().attr("href");
  if (!href) return null;

  const itemUrl = href.startsWith("http") ? href : `https://www.1999.co.jp${href}`;
  const itemHtml = await get(itemUrl);
  if (!itemHtml) return null;

  const $ = cheerio.load(itemHtml);
  const out = emptyRecord("hobbysearch");
  out.product_url = itemUrl;
  out.official_image_url = $('meta[property="og:image"]').attr("content") || "";
  out.name = ($('meta[property="og:title"]').attr("content") || "").trim();
  return out;
}

// ---------------------------------------------------------------------------
// 4. Good Smile Company — dane kanoniczne dla własnych figurek.
// ---------------------------------------------------------------------------
export async function fromGoodSmile(name) {
  const searchHtml = await get(
    `https://www.goodsmile.info/en/products/search?utf8=%E2%9C%93&search%5Bquery%5D=${encodeURIComponent(name)}`
  );
  if (!searchHtml) return null;

  const $s = cheerio.load(searchHtml);
  const href = $s(".hitItem a").first().attr("href");
  if (!href) return null;

  const itemUrl = href.startsWith("http") ? href : `https://www.goodsmile.info${href}`;
  const itemHtml = await get(itemUrl);
  if (!itemHtml) return null;

  const $ = cheerio.load(itemHtml);
  const out = emptyRecord("goodsmile");
  out.product_url = itemUrl;
  out.manufacturer = "Good Smile Company";
  out.series = $('.detailBox dt:contains("Series")').next("dd").text().trim();

  const spec = $('.detailBox dt:contains("Specifications")').next("dd").text();
  const scale = spec && spec.match(/(1\/\d+)/);
  if (scale) out.scale = scale[1];

  const price = $('.detailBox dt:contains("Price")').next("dd").text().trim();
  if (price) out.original_price = price;

  const img =
    $('meta[property="og:image"]').attr("content") || $('img[itemprop="image"]').attr("src");
  if (img) out.official_image_url = img.startsWith("http") ? img : `https:${img}`;

  return out;
}

// ---------------------------------------------------------------------------
// PUBLICZNE: odpytaj wszystkie źródła i scal wyniki wg wiarygodności.
// Zwraca { data, sources, bootlegWarning } — sources służy do pokazania
// adminowi, skąd realnie pochodzą dane (przejrzystość zamiast „magii AI").
// ---------------------------------------------------------------------------
// Dwa zestawy nazw. Dokładne widzi TYLKO admin — musi wiedzieć, co zawiodło.
// Publicznie pokazujemy kategorie: dobór źródeł to nasza przewaga, nie ma powodu
// go ogłaszać. Oba opisy są prawdziwe — różnią się szczegółowością, nie treścią.
export const SOURCE_LABELS = {
  mfc: "MyFigureCollection (encyklopedia)",
  goodsmile: "Good Smile Company (producent)",
  amiami: "AmiAmi (sklep JP)",
  hobbysearch: "HobbySearch (sklep JP)",
};

export const PUBLIC_LABELS = {
  mfc: "Encyklopedia kolekcjonerska",
  goodsmile: "Katalog producenta",
  amiami: "Sklep japoński",
  hobbysearch: "Sklep japoński",
};

export async function gatherFromSources(name, series = "", opts = {}, onProgress = null) {
  const { deep = false } = opts;
  const adapters = [
    ["mfc", fromMFC],
    ["goodsmile", fromGoodSmile],
    ...(JP_SOURCES_ENABLED
      ? [["amiami", fromAmiAmi], ["hobbysearch", fromHobbySearch]]
      : []),
  ];

  const report = (payload) => {
    try {
      onProgress?.(payload);
    } catch {
      /* raportowanie postępu nie może wywalić pobierania danych */
    }
  };

  report({ type: "sources-start", total: adapters.length });

  // Równolegle — każde źródło ma własny timeout i nie blokuje pozostałych.
  // O każdym wyniku meldujemy od razu, żeby pasek postępu żył naprawdę.
  let done = 0;
  const settled = await Promise.all(
    adapters.map(async ([key, fn]) => {
      report({
        type: "source-check",
        key,
        label: SOURCE_LABELS[key] || key,
        publicLabel: PUBLIC_LABELS[key] || "Katalog figurek",
      });
      let rec = null;
      try {
        rec = await fn(name, series, { deep });
      } catch {
        rec = null;
      }
      done += 1;
      report({
        type: "source-done",
        key,
        label: SOURCE_LABELS[key] || key,
        publicLabel: PUBLIC_LABELS[key] || "Katalog figurek",
        found: !!rec,
        done,
        total: adapters.length,
      });
      return [key, rec];
    })
  );

  const merged = emptyRecord("merged");
  const sources = {};
  let bootlegWarning = false;

  for (const [key, rec] of settled) {
    if (!rec) {
      sources[key] = "brak wyniku";
      continue;
    }
    sources[key] = "ok";
    if (rec.bootleg_warning) bootlegWarning = true;

    for (const field of Object.keys(merged)) {
      if (field.startsWith("_") || field === "bootleg_warning") continue;
      if (!merged[field] && rec[field]) merged[field] = rec[field];
    }
  }

  delete merged._source;
  delete merged.bootleg_warning;
  return { data: merged, sources, bootlegWarning };
}
