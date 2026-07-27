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
import { BROWSER_UA as UA } from "./lookupShared.js";

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
// Słowa, które opisują WPIS, a nie figurkę. Żaden katalog ich nie indeksuje,
// za to skutecznie psują wyszukiwanie: „Miyuki Sone" znajduje się od ręki,
// a „Miyuki Sone Base" nie znajduje się nigdzie.
const NOISE_WORDS = /\b(base|ver|version|figure|figurka)\b\.?/gi;

export function queryVariants(name, series = "") {
  const full = String(name || "").trim();
  // nazwa postaci = fragment przed pierwszym separatorem wersji
  const core = full.split(/\s[-–—]\s|\(/)[0].trim();
  const cleaned = full
    .replace(/\(.*?\)/g, " ")
    .replace(NOISE_WORDS, " ")
    .replace(/[-–—:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Sam rdzeń nazwy, też oczyszczony — najskuteczniejszy wariant dla katalogów.
  const coreClean = core.replace(NOISE_WORDS, " ").replace(/\s+/g, " ").trim();

  const variants = [];
  if (coreClean && series) variants.push(`${coreClean} ${series}`);
  if (core && series && core !== coreClean) variants.push(`${core} ${series}`);
  variants.push(full);
  if (cleaned && cleaned !== full) variants.push(cleaned);
  if (coreClean && coreClean !== full) variants.push(coreClean);
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
    .filter((w) => w.length > 2 && !["ver", "version", "the", "base", "figure"].includes(w));
}

/**
 * Czy zwrócony rekord opisuje figurkę, o którą pytaliśmy.
 *
 * Wystarczy jedno wspólne słowo — kolejność bywa odwrócona („Konata Izumi"
 * ↔ „Izumi Konata"), a katalogi dopisują wersje i dodatki. Chodzi wyłącznie
 * o odsianie wyników zupełnie z innej beczki.
 * Gdy nie mamy czego porównać, przepuszczamy: to straż, nie sędzia.
 */
export function sameFigure(queryName, resultName) {
  const asked = nameTokens(queryName);
  const got = nameTokens(resultName);
  if (asked.length === 0 || got.length === 0) return true;
  return asked.some((t) => got.includes(t));
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
    market_value_average: "",
    official_image_url: "",
    product_url: "",
    bootleg_warning: false,
  };
}

// „¥6000" / „6,000 JPY" → „6000 JPY". Jeden format w całym projekcie.
// Znak waluty jest WYMAGANY: obok cen stoją znaczniki zmiany („+208%"), a samo
// „pierwsze liczby jakie widzę" wpisywało do bazy wartość rynkową „17 JPY".
function normalizeJpy(raw) {
  const m = String(raw || "").match(/¥\s*([\d,]+)|([\d,]+)\s*(?:JPY|円)/i);
  if (!m) return "";
  return `${(m[1] || m[2]).replace(/,/g, "")} JPY`;
}

// ---------------------------------------------------------------------------
// 1. MyFigureCollection — najbogatsze źródło.
// Struktura (zweryfikowana): .data-field > .data-label + .data-value,
// japońskie odpowiedniki w atrybucie: <span switch="ボーカロイド">Vocaloid</span>
// ---------------------------------------------------------------------------
export async function fromMFC(name, series = "", { deep = false, manufacturer = "", itemId = "" } = {}) {
  const out = emptyRecord("mfc");

  // Numer pozycji podany przez agregator — pomijamy wyszukiwanie i idziemy
  // prosto pod właściwy adres. Wyszukiwarka MFC nie indeksuje producenta,
  // więc bez tego skrótu przy popularnej postaci trafiała w losową figurkę.
  // Gdy skrót zawiedzie (pozycja usunięta, chwilowa blokada), NIE poddajemy
  // się — schodzimy do zwykłego szukania po nazwie.
  if (itemId) {
    const direct = await parseMfcItem(`https://myfigurecollection.net/item/${itemId}`, out);
    if (direct) {
      // Znacznik dla weryfikacji zdjęcia: ten wynik NIE jest niezależnym
      // potwierdzeniem agregatora, bo to on wskazał numer pozycji.
      direct._viaItemId = true;
      return direct;
    }
  }

  // Kolejne warianty, aż któryś trafi (kończymy na pierwszym z wynikiem,
  // żeby nie zużywać kredytów proxy bez potrzeby). Z listy wyników bierzemy
  // NAJLEPIEJ dopasowany do nazwy, nie pierwszy z brzegu.
  const tokens = nameTokens(name);
  // Ta sama postać ma w encyklopedii kilkadziesiąt figurek. Bez producenta
  // ze zgłoszenia wygrywa przypadkowa (np. gadżet Banpresto zamiast Clayz),
  // a wtedy resztę drabiny zalewają dane niewłaściwego produktu.
  const makerTokens = nameTokens(manufacturer);
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
      // Podpis zdjęcia to pełna nazwa produktu — razem z producentem w nawiasie.
      const label = $q(el).find("img").attr("alt") || "";
      const makerHit =
        makerTokens.length > 0 && makerTokens.every((t) => label.toLowerCase().includes(t));
      const score = scoreCandidate(label, tokens) + (makerHit ? 5 : 0);
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
  return await parseMfcItem(itemUrl, out);
}

// Odczyt strony pozycji w MFC. Wydzielone, bo wchodzimy tu dwiema drogami:
// przez wyszukiwanie po nazwie albo prosto po numerze podanym przez agregator.
async function parseMfcItem(itemUrl, out) {
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

  // Etykiety bywają w liczbie pojedynczej albo mnogiej, zależnie od tego ile
  // pozycji ma dana figurka („Character" vs „Characters"). Brak obsługi liczby
  // mnogiej cicho gubił japońską nazwę przy każdej figurce z dodatkiem
  // (np. Konata z kotem Nyamo).
  const pick = (...labels) => labels.map((l) => fields[l]).find(Boolean) || null;

  const origin = pick("Origin", "Origins");
  if (origin) {
    out.series = origin.text;
    out.japanese_series = origin.jp;
  }

  const character = pick("Character", "Characters");
  if (character) {
    // „Izumi Konata, Nyamo" — pierwsza pozycja to bohater figurki, reszta to
    // dodatki (zwierzak, drugi plan). Japoński odpowiednik dotyczy pierwszej.
    out.name = character.text.split(/\s*,\s*/)[0].trim();
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
// 1b. BuyFinder — agregator ofert z ~50 sklepów.
//
// DLACZEGO TO JEST WAŻNE: odpowiada WPROST z Node (HTTP 200, bez Cloudflare,
// bez pośrednika, bez limitu), a serwuje ten sam materiał co MyFigureCollection
// — łącznie ze zdjęciami hostowanymi na static.myfigurecollection.net. Czyli
// dostajemy dane klasy encyklopedycznej także na Vercelu, gdzie przeglądarki
// nie ma. Zero kredytów, zgodnie z zasadą free-first.
//
// Bonus, którego nie miało żadne inne źródło: „Current average price", czyli
// realna cena rynku wtórnego. Do tej pory to pole zmyślała AI.
//
// Adresy pozycji same opisują towar:
//   /figure/prepainted-luckystar-izumi-konata-nyamo-18-clayz
//    kategoria │ seria    │ postać      │ wersja│skala│producent
// ---------------------------------------------------------------------------

// Pierwszy człon adresu to kategoria. Odsiewamy nią gadżety skuteczniej niż
// zgadywaniem po tytule: koszulka nigdy nie trafi do bazy jako figurka.
// Serwis kataloguje też książki, gobeliny i akcesoria — a taki wpis potrafi
// wyglądać wiarygodnie (ma cenę, zdjęcie i właściwą postać), tylko opisuje
// zupełnie inny przedmiot. Gobelin „Super Sonico" podał kiedyś wartość
// rynkową 17 JPY i była to prawda — tyle że nie o figurce.
const BUYFINDER_FIGURE_CATEGORIES = {
  prepainted: 3,      // malowane figurki — to nas interesuje najbardziej
  "garage-kits": 2,   // zestawy do sklejania, wciąż figurka
  actiondolls: 1,     // Nendoroidy, figmy, lalki
  trading: 1,         // figurki kolekcjonerskie z serii
};

const BUYFINDER_NOT_FIGURES = [
  "plushes", "apparel", "linens", "hanged-up", "on-walls",
  "books", "accessories", "misc",
];

function buyfinderCategoryScore(slug) {
  const path = slug.replace("/figure/", "");
  for (const [cat, score] of Object.entries(BUYFINDER_FIGURE_CATEGORIES)) {
    if (path.startsWith(`${cat}-`)) return score;
  }
  if (BUYFINDER_NOT_FIGURES.some((cat) => path.startsWith(`${cat}-`))) return -6;
  // Kategoria nieznana — nie odrzucamy z góry (serwis dodaje nowe), ale
  // ustępuje każdej pozycji z potwierdzonej półki z figurkami.
  return -2;
}

// „Lucky☆Star - Izumi Konata - Nyamo - 1/8 (Clayz)”
//  → seria / postać / skala / producent
function parseBuyfinderTitle(title) {
  const out = { name: "", series: "", scale: "", manufacturer: "" };
  if (!title) return out;

  const maker = title.match(/\(([^()]+)\)\s*$/);
  if (maker) out.manufacturer = maker[1].trim();

  const scale = title.match(/\b(\d+\/\d+)\b/);
  if (scale) out.scale = scale[1];

  const parts = title
    .replace(/\s*\([^()]*\)\s*$/, "")
    .split(/\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length > 0) out.series = parts[0];
  // Drugi człon to postać; gdy go brak, zostaje pełny tytuł produktu.
  out.name = parts.length > 1 ? parts[1] : title.trim();
  return out;
}

export async function fromBuyfinder(name, series = "", { deep = false, manufacturer = "", scale = "" } = {}) {
  const tokens = nameTokens(`${name} ${series}`);
  // Ta sama postać ma po kilkanaście figurek różnych producentów. Sama nazwa
  // ich nie rozróżnia — dopiero producent ze zgłoszenia wskazuje właściwą
  // (np. „Clayz" wybiera wersję Nyamo zamiast pierwszej lepszej FuRyu).
  const makerTokens = nameTokens(manufacturer);
  // Skala też siedzi w adresie, tyle że bez ukośnika: „1/8" → „18".
  const scaleToken = String(scale || "").match(/(\d+)\/(\d+)/);
  const scaleHint = scaleToken ? `${scaleToken[1]}${scaleToken[2]}` : "";
  let best = null;
  let bestScore = -Infinity;

  for (const q of queryVariants(name, series).slice(0, deep ? 3 : 2)) {
    const searchHtml = await get(
      `https://buyfinder.moe/figures?search=${encodeURIComponent(q)}`
    );
    if (!searchHtml) continue;

    const slugs = [...new Set(searchHtml.match(/\/figure\/[a-z0-9-]+/g) || [])];
    for (const slug of slugs.slice(0, 40)) {
      // Adres rozbijamy na słowa, żeby punktować go tak samo jak tytuł.
      const plain = slug.replace("/figure/", "").replace(/-/g, " ");
      const makerHit = makerTokens.length > 0 && makerTokens.every((t) => plain.includes(t));
      const scaleHit = scaleHint !== "" && plain.includes(` ${scaleHint} `);
      const score =
        scoreCandidate(plain, tokens) +
        buyfinderCategoryScore(slug) +
        (makerHit ? 5 : 0) +
        (scaleHit ? 3 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = slug;
      }
    }
    // Trafienie musi mieć pokrycie w nazwie — inaczej to przypadkowa figurka
    // z listy, a taka jest gorsza niż brak wyniku.
    if (best && bestScore > 0) break;
    best = null;
  }
  if (!best) return null;

  const itemUrl = `https://buyfinder.moe${best}`;
  const itemHtml = await get(itemUrl);
  if (!itemHtml) return null;

  const $ = cheerio.load(itemHtml);
  const out = emptyRecord("buyfinder");
  out.product_url = itemUrl;

  const title =
    $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim();
  Object.assign(out, parseBuyfinderTitle(title));

  // Na stronie są DWA og:image — pierwszy to ikona serwisu. Bierzemy ten
  // wskazujący na zewnętrzny host, czyli prawdziwe zdjęcie produktu.
  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr("content") || "";
    if (src.startsWith("http") && !src.includes("buyfinder.moe")) out.official_image_url = src;
  });

  // Etykiety leżą w <strong>, a wartość w jednym z sąsiednich <span>. Bierzemy
  // pierwszy, który wygląda na KWOTĘ — obok stoją też znaczniki zmiany ceny.
  const labelled = (label) => {
    let value = "";
    $("strong").each((_, el) => {
      if (value || $(el).text().trim() !== label) return;
      $(el).parent().find("span").each((__, span) => {
        if (value) return;
        const text = $(span).text().trim();
        if (/¥\s*[\d,]+|[\d,]+\s*(?:JPY|円)/i.test(text)) value = text;
      });
    });
    return value;
  };

  out.original_price = normalizeJpy(labelled("Original list price"));
  out.market_value_average = normalizeJpy(labelled("Current average price"));

  // Zdjęcia buyfinder bierze wprost z MyFigureCollection, a nazwa pliku zaczyna
  // się od NUMERU POZYCJI w encyklopedii:
  //   .../upload/items/2/5428-e90cf.jpg  →  myfigurecollection.net/item/5428
  // To najcenniejsza rzecz na tej stronie: dzięki temu MFC nie musi już zgadywać
  // po nazwie (a zgadywało fatalnie — przy „Konata Izumi" trafiało w gadżet
  // Banpresto zamiast figurki Clayz). Podajemy mu numer i mamy pewność.
  const mfcId = out.official_image_url.match(/\/items\/\d+\/(\d+)-/);
  if (mfcId) out._mfcItemId = mfcId[1];

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
export async function fromGoodSmile(name, series = "", { manufacturer = "" } = {}) {
  // Katalog GSC zawiera WYŁĄCZNIE figurki Good Smile. Jeśli wiemy, że producent
  // jest inny, każde trafienie stąd jest z definicji fałszywe — a kosztowało nas
  // to już podmianę „Clayz" na „Good Smile Company" w panelu.
  if (manufacturer && !/good\s*smile|max\s*factory|phat/i.test(manufacturer)) return null;

  const searchHtml = await get(
    `https://www.goodsmile.info/en/products/search?utf8=%E2%9C%93&search%5Bquery%5D=${encodeURIComponent(name)}`
  );
  if (!searchHtml) return null;

  const $s = cheerio.load(searchHtml);

  // Nie „pierwszy z brzegu" — wyszukiwarka GSC zwraca też inne wersje postaci
  // i gadżety. Oceniamy dopasowanie tak samo jak w pozostałych źródłach.
  const tokens = nameTokens(`${name} ${series}`);
  let href = null;
  let bestScore = -Infinity;
  $s(".hitItem").slice(0, 25).each((_, el) => {
    const link = $s(el).find("a").first().attr("href");
    if (!link) return;
    const label = `${$s(el).text()} ${$s(el).find("img").attr("alt") || ""}`;
    const score = scoreCandidate(label, tokens);
    if (score > bestScore) {
      bestScore = score;
      href = link;
    }
  });
  if (!href || bestScore <= 0) return null;

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
  buyfinder: "BuyFinder (agregator ~50 sklepów)",
  goodsmile: "Good Smile Company (producent)",
  amiami: "AmiAmi (sklep JP)",
  hobbysearch: "HobbySearch (sklep JP)",
};

export const PUBLIC_LABELS = {
  mfc: "Encyklopedia kolekcjonerska",
  buyfinder: "Agregator ofert",
  goodsmile: "Katalog producenta",
  amiami: "Sklep japoński",
  hobbysearch: "Sklep japoński",
};

export async function gatherFromSources(name, series = "", opts = {}, onProgress = null) {
  const { deep = false, manufacturer = "", scale = "" } = opts;

  const report = (payload) => {
    try {
      onProgress?.(payload);
    } catch {
      /* raportowanie postępu nie może wywalić pobierania danych */
    }
  };

  // Reszta drabiny rusza dopiero po agregatorze — patrz komentarz niżej.
  const rest = [
    ["mfc", fromMFC],
    ["goodsmile", fromGoodSmile],
    ...(JP_SOURCES_ENABLED
      ? [["amiami", fromAmiAmi], ["hobbysearch", fromHobbySearch]]
      : []),
  ];
  const total = rest.length + 1;
  let done = 0;

  const runAdapter = async ([key, fn], extra = {}) => {
    report({
      type: "source-check",
      key,
      label: SOURCE_LABELS[key] || key,
      publicLabel: PUBLIC_LABELS[key] || "Katalog figurek",
    });
    let rec = null;
    try {
      rec = await fn(name, series, { deep, manufacturer, scale, ...extra });
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
      total,
    });
    return [key, rec];
  };

  report({ type: "sources-start", total });

  // ETAP 1 — agregator. Odpowiada wprost, bez pośrednika, więc jest szybki
  // i darmowy, a przy okazji zwraca NUMER POZYCJI w encyklopedii.
  const buyfinderEntry = await runAdapter(["buyfinder", fromBuyfinder]);
  const itemId = buyfinderEntry[1]?._mfcItemId || "";

  // ETAP 2 — reszta równolegle. MFC dostaje gotowy numer pozycji zamiast
  // szukać po nazwie. To nie jest optymalizacja, tylko warunek poprawności:
  // wyszukiwarka MFC nie indeksuje producenta, więc przy popularnej postaci
  // („Konata Izumi" — 99 wyników) trafiała w losową figurkę i zalewała resztę
  // drabiny danymi niewłaściwego produktu.
  const settled = [
    buyfinderEntry,
    ...(await Promise.all(rest.map((a) => runAdapter(a, a[0] === "mfc" ? { itemId } : {})))),
  ];

  const merged = emptyRecord("merged");
  const sources = {};
  let bootlegWarning = false;

  // Kolejność wiarygodności: encyklopedia przed agregatorem, agregator przed
  // katalogiem producenta. Pierwsze niepuste pole wygrywa.
  const byTrust = ["mfc", "buyfinder", "goodsmile", "amiami", "hobbysearch"];
  settled.sort((a, b) => byTrust.indexOf(a[0]) - byTrust.indexOf(b[0]));

  for (const [key, rec] of settled) {
    if (!rec) {
      sources[key] = "brak wyniku";
      continue;
    }

    // Straż tożsamości: wynik musi mieć CHOĆ JEDNO wspólne słowo z nazwą,
    // o którą pytaliśmy. Bez tego katalog potrafił oddać figurkę Hatsune Miku
    // w odpowiedzi na „Super Sonico" — dane wyglądały solidnie, tylko dotyczyły
    // zupełnie innej figurki. Lepszy brak wyniku niż cudze dane.
    if (!sameFigure(name, rec.name)) {
      sources[key] = "odrzucone (inna figurka)";
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
  // `records` to surowe wyniki poszczególnych źródeł — potrzebne, żeby sprawdzić,
  // czy dwa niezależne katalogi opisują ten sam produkt (patrz figureImage.js).
  return { data: merged, sources, bootlegWarning, records: settled };
}
