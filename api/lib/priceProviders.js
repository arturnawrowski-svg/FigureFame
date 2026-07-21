// ============================================================================
// Dostawcy cen (Etap 3) — „drabina źródeł". Start: eBay Browse API (darmowe,
// oficjalne, wspiera afiliację EPN). Kolejne platformy dokładamy pojedynczo.
// FREE-FIRST + uczciwie: gdy brak kluczy, zwracamy [] (bez wywalania), a UI
// pokazuje pusty stan zamiast zmyślonych ofert.
// ============================================================================

// --- eBay OAuth (client credentials) z prostym cache tokenu ---
let ebayToken = { value: null, exp: 0 };

async function getEbayToken() {
  const id = process.env.EBAY_CLIENT_ID;
  const secret = process.env.EBAY_CLIENT_SECRET;
  if (!id || !secret) return null; // brak konfiguracji → provider nieaktywny

  if (ebayToken.value && Date.now() < ebayToken.exp - 60_000) return ebayToken.value;

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=" + encodeURIComponent("https://api.ebay.com/oauth/api_scope"),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`eBay OAuth ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  ebayToken = { value: data.access_token, exp: Date.now() + (data.expires_in || 7200) * 1000 };
  return ebayToken.value;
}

// Opcjonalne opakowanie afiliacyjne (EPN) — dodajemy parametr kampanii, jeśli ustawiony.
function withAffiliate(url) {
  const campid = process.env.EBAY_AFFILIATE_CAMPAIGN_ID;
  if (!url || !campid) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("mkcid", "1");
    u.searchParams.set("campid", campid);
    u.searchParams.set("toolid", "10001");
    return u.toString();
  } catch {
    return url;
  }
}

// Zwraca znormalizowane oferty [{ platform, title, condition, price_value, currency, seller, url, is_official }]
export async function fetchEbayOffers(query, limit = 30) {
  const token = await getEbayToken();
  if (!token) return { configured: false, offers: [] };

  const marketplace = process.env.EBAY_MARKETPLACE_ID || "EBAY_US";
  const url =
    "https://api.ebay.com/buy/browse/v1/item_summary/search" +
    `?q=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}&filter=buyingOptions:{FIXED_PRICE|AUCTION}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": marketplace,
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`eBay Browse ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  const items = data.itemSummaries || [];

  const offers = items
    .map((it) => {
      const price = it.price || it.currentBidPrice || {};
      const val = parseFloat(price.value);
      if (!val || Number.isNaN(val)) return null;
      return {
        platform: "eBay",
        title: it.title || "",
        condition: it.condition || "",
        price_value: val,
        currency: price.currency || "USD",
        seller: it.seller?.username || "",
        url: withAffiliate(it.itemWebUrl || it.itemAffiliateWebUrl || ""),
        is_official: false,
      };
    })
    .filter(Boolean);

  return { configured: true, offers };
}

// --- Rakuten Ichiba Item Search API (prosty GET z applicationId) ---
export async function fetchRakutenOffers(query, limit = 30) {
  const appId = process.env.RAKUTEN_APP_ID;
  if (!appId) return { configured: false, offers: [] };

  const affId = process.env.RAKUTEN_AFFILIATE_ID;
  const url =
    "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20220601" +
    `?applicationId=${encodeURIComponent(appId)}` +
    (affId ? `&affiliateId=${encodeURIComponent(affId)}` : "") +
    `&keyword=${encodeURIComponent(query)}&hits=${Math.min(limit, 30)}&sort=%2BitemPrice`;

  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Rakuten ${res.status}: ${t.slice(0, 160)}`);
  }
  const data = await res.json();
  const items = data.Items || [];
  const offers = items
    .map((wrap) => {
      const it = wrap.Item || wrap;
      const val = parseFloat(it.itemPrice);
      if (!val || Number.isNaN(val)) return null;
      return {
        platform: "Rakuten",
        title: it.itemName || "",
        condition: "",
        price_value: val,
        currency: "JPY",
        seller: it.shopName || "",
        url: it.affiliateUrl || it.itemUrl || "",
        is_official: false,
      };
    })
    .filter(Boolean);
  return { configured: true, offers };
}

// Agregator wszystkich aktywnych dostawców. Zwraca { offers, providers }.
// Kolejne platformy (Amazon PA-API, AliExpress, Yahoo! Shopping JP) dodajemy tu
// jako następne adaptery — wymagają podpisywania żądań, więc dopinamy je z kluczami.
export async function fetchAllOffers(query, limit = 40) {
  const results = [];
  const providers = {};

  const run = async (name, fn) => {
    try {
      const r = await fn();
      providers[name] = r.configured ? "ok" : "brak kluczy";
      results.push(...r.offers);
    } catch (e) {
      providers[name] = `błąd: ${e.message}`;
    }
  };

  await run("ebay", () => fetchEbayOffers(query, limit));
  await run("rakuten", () => fetchRakutenOffers(query, limit));

  results.sort((a, b) => a.price_value - b.price_value);
  return { offers: results, providers };
}
