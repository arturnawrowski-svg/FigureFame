// ============================================================================
// FigureFame — warstwa dostawców scrapingu (analogicznie do aiClient.js)
// ----------------------------------------------------------------------------
// Problem: część katalogów stoi za Cloudflare, który odrzuca ruch z serwerów.
// Potrzebny pośrednik. Każdy dostawca ma jednak MAŁY darmowy limit (~1000/mies.),
// co przy jednym dostawcy kończy się po ~25 figurkach.
//
// Rozwiązanie w duchu FREE-FIRST: łańcuch dostawców. Zużywamy pierwszego, a gdy
// odmówi (limit / błąd rotacji), automatycznie sięgamy po kolejnego. Kilka
// darmowych pakietów daje wielokrotnie większą pulę bez wydawania złotówki.
//
// Dostawca jest AKTYWNY tylko wtedy, gdy ma klucz w zmiennych środowiskowych.
// Kolejność można zmienić przez SCRAPE_PROVIDER_ORDER (lista po przecinku).
// ============================================================================

import { BROWSER_UA as UA, isServerless } from "./lookupShared.js";

// ---------------------------------------------------------------------------
// Dostawca „playwright" — prawdziwa przeglądarka na TWOIM komputerze.
// Cloudflare przepuszcza ją, bo ma prawdziwy odcisk TLS i wykonuje JavaScript.
// Darmowy, bez limitów i szybszy od płatnych pośredników (~1,2 s vs ~7 s).
// Działa WYŁĄCZNIE lokalnie — w środowisku serverless nie ma przeglądarki,
// dlatego na Vercelu jest automatycznie pomijany.
// ---------------------------------------------------------------------------
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    // Import dynamiczny: brak playwrighta (np. na produkcji) nie może wywalić modułu.
    browserPromise = import("playwright")
      .then(({ chromium }) => chromium.launch({ headless: true }))
      .catch(() => null);
  }
  return browserPromise;
}

// Zamyka przeglądarkę — worker woła to na koniec, żeby proces nie wisiał.
export async function closeBrowser() {
  const browser = await browserPromise?.catch(() => null);
  if (browser) await browser.close().catch(() => {});
  browserPromise = null;
}

async function fetchViaBrowser(url, timeoutMs) {
  const browser = await getBrowser();
  if (!browser) return null;

  const context = await browser.newContext({ userAgent: UA, locale: "en-US" });
  try {
    const page = await context.newPage();
    // Normalizacja adresu: część serwisów (MFC) gubi się przy „%20" po
    // przekierowaniu i szuka wtedy dosłownego ciągu ze znakami procenta.
    const normalized = new URL(url);
    normalized.search = new URLSearchParams(normalized.search).toString();

    const res = await page.goto(normalized.toString(), {
      waitUntil: "domcontentloaded",
      timeout: timeoutMs,
    });
    if (!res || !res.ok()) return null;
    return await page.content();
  } catch {
    return null;
  } finally {
    await context.close().catch(() => {});
  }
}

// Klucze czytamy w RUNTIME — przy imporcie dotenv może jeszcze nie działać.
function env() {
  return {
    // scrape.do obsługujemy też przez stare PROXY_URL (zgodność wstecz).
    SCRAPEDO: process.env.SCRAPEDO_API_KEY,
    PROXY_URL: process.env.PROXY_URL,
    SCRAPINGBEE: process.env.SCRAPINGBEE_API_KEY,
    ZENROWS: process.env.ZENROWS_API_KEY,
    SCRAPFLY: process.env.SCRAPFLY_API_KEY,
    SCRAPERAPI: process.env.SCRAPERAPI_KEY,
    BRIGHTDATA: process.env.BRIGHTDATA_API_KEY,
  };
}

// Każdy dostawca: jak zbudować adres i jak wyciągnąć HTML z odpowiedzi.
// Uwaga na koszty: tryby „premium/JS rendering" potrafią kosztować 10–25× więcej
// kredytów. Wszędzie zostajemy przy trybie podstawowym — dla naszych stron wystarcza.
function buildProviders() {
  const e = env();
  const list = [];

  // Najpierw własna przeglądarka: za darmo, bez limitów, najszybciej.
  // Płatni pośrednicy zostają jako zapas, gdy jej nie ma (np. na Vercelu).
  if (!isServerless() && process.env.SCRAPE_DISABLE_BROWSER !== "1") {
    list.push({ name: "playwright", fetchHtml: fetchViaBrowser });
  }

  if (e.SCRAPEDO || e.PROXY_URL) {
    list.push({
      name: "scrapedo",
      build: (url) =>
        e.SCRAPEDO
          ? `http://api.scrape.do/?token=${e.SCRAPEDO}&url=${encodeURIComponent(url)}`
          : `${e.PROXY_URL}${encodeURIComponent(url)}`,
      extract: (res) => res.text(),
    });
  }

  if (e.SCRAPINGBEE) {
    list.push({
      name: "scrapingbee",
      build: (url) =>
        `https://app.scrapingbee.com/api/v1/?api_key=${e.SCRAPINGBEE}` +
        `&url=${encodeURIComponent(url)}&render_js=false`,
      extract: (res) => res.text(),
    });
  }

  if (e.ZENROWS) {
    list.push({
      name: "zenrows",
      build: (url) =>
        `https://api.zenrows.com/v1/?apikey=${e.ZENROWS}&url=${encodeURIComponent(url)}`,
      extract: (res) => res.text(),
    });
  }

  if (e.SCRAPFLY) {
    list.push({
      name: "scrapfly",
      build: (url) =>
        `https://api.scrapfly.io/scrape?key=${e.SCRAPFLY}&url=${encodeURIComponent(url)}`,
      // Scrapfly pakuje stronę w JSON — HTML siedzi w result.content.
      extract: async (res) => {
        const data = await res.json();
        return data?.result?.content || null;
      },
    });
  }

  if (e.SCRAPERAPI) {
    list.push({
      name: "scraperapi",
      build: (url) =>
        `http://api.scraperapi.com/?api_key=${e.SCRAPERAPI}&url=${encodeURIComponent(url)}`,
      extract: (res) => res.text(),
    });
  }

  if (e.BRIGHTDATA) {
    list.push({
      name: "brightdata",
      build: (url) =>
        `https://api.brightdata.com/request?url=${encodeURIComponent(url)}`,
      headers: { Authorization: `Bearer ${e.BRIGHTDATA}` },
      extract: (res) => res.text(),
    });
  }

  return list;
}

function getOrder(providers) {
  const raw = process.env.SCRAPE_PROVIDER_ORDER;
  if (!raw) return providers;
  const wanted = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const byName = Object.fromEntries(providers.map((p) => [p.name, p]));
  const ordered = wanted.map((n) => byName[n]).filter(Boolean);
  // Dostawcy spoza listy trafiają na koniec — nie gubimy zapasowych kluczy.
  return [...ordered, ...providers.filter((p) => !wanted.includes(p.name))];
}

// Strona wyzwania Cloudflare nie jest danymi — traktujemy ją jak porażkę,
// żeby spróbować kolejnego dostawcy zamiast parsować śmieci.
function looksBlocked(html) {
  return (
    !html ||
    html.length < 500 ||
    html.includes("Just a moment") ||
    html.includes("cf-browser-verification") ||
    html.includes("ROTATION_FAILED")
  );
}

/**
 * Pobiera stronę przez pierwszego działającego dostawcę.
 * Zwraca { html, provider } albo null, gdy wszyscy zawiodą.
 */
export async function scrapeFetch(url, { timeoutMs = 20000 } = {}) {
  const providers = getOrder(buildProviders());
  if (providers.length === 0) return null;

  for (const provider of providers) {
    // Dostawca „przeglądarkowy" ma własny sposób pobierania (nie jest to fetch).
    if (provider.fetchHtml) {
      try {
        const html = await provider.fetchHtml(url, timeoutMs);
        if (!looksBlocked(html)) return { html, provider: provider.name };
      } catch {
        /* kolejny dostawca */
      }
      continue;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(provider.build(url), {
        headers: { "User-Agent": UA, ...(provider.headers || {}) },
        signal: ctrl.signal,
      });
      if (!res.ok) continue; // limit wyczerpany albo błąd — próbujemy dalej

      const html = await provider.extract(res);
      if (looksBlocked(html)) continue;

      return { html, provider: provider.name };
    } catch {
      // timeout / błąd sieci — kolejny dostawca
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// Ilu dostawców jest realnie skonfigurowanych (do panelu i diagnostyki).
export function scrapeProvidersStatus() {
  return buildProviders().map((p) => p.name);
}
