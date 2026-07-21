// ============================================================================
// Kurowany katalog sklepów + deep-linki wyszukiwania (Etap 3, warstwa „Gdzie kupić").
// ----------------------------------------------------------------------------
// FILOZOFIA: nie 200 linków — 8–12 NAJLEPSZYCH, pogrupowanych. Kurowanie i
// zaufanie sprzedają lepiej niż farma linków (patrz ryzyko „spam/afiliacja" z PDF).
//
// Każdy sklep buduje link WYSZUKIWANIA po nazwie figurki (+ opcjonalnie japońskiej).
// Gdy dołączysz do programu afiliacyjnego, wpisz swoje ID w AFFILIATE_IDS —
// funkcje `wrap` doczepią je do linku. Puste ID = zwykły (działający) link.
// ============================================================================

// >>> Uzupełnij, gdy zdobędziesz konta afiliacyjne (na razie linki działają bez nich):
export const AFFILIATE_IDS = {
  amazonJp: '',   // Amazon Associates tag, np. "figurefame-22"
  ebay: '',       // eBay Partner Network campid
  rakuten: '',    // Rakuten afiliate id
  hlj: '',        // HobbyLink Japan affiliate id
  buyee: '',      // Buyee affiliate id
};

const enc = (s) => encodeURIComponent((s || '').trim());

// Wybór frazy: sklepy japońskie wolą japońską nazwę, jeśli jest.
function q(figure, preferJapanese) {
  const jp = figure?.japanese_name || figure?.japaneseName;
  const en = [figure?.name, figure?.manufacturer].filter(Boolean).join(' ');
  return preferJapanese && jp ? jp : (figure?.name || en || '');
}

export const STORE_GROUPS = [
  {
    group: 'Nowe / oficjalne',
    stores: [
      { id: 'amiami', name: 'AmiAmi', jp: true, build: (f) => `https://www.amiami.com/eng/search/list/?s_keywords=${enc(q(f, true))}` },
      { id: 'hlj', name: 'HobbyLink Japan', jp: false, build: (f) => `https://www.hlj.com/search/?Word=${enc(q(f, false))}` },
      { id: 'solaris', name: 'Solaris Japan', jp: false, build: (f) => `https://solarisjapan.com/search?q=${enc(q(f, false))}` },
      { id: 'gsc', name: 'Good Smile Company', jp: false, build: (f) => `https://www.goodsmile.com/en/products?query=${enc(q(f, false))}` },
      { id: 'amazonjp', name: 'Amazon JP', jp: false, build: (f) => wrapAmazon(`https://www.amazon.co.jp/s?k=${enc(q(f, false))}`) },
    ],
  },
  {
    group: 'Rynek wtórny',
    stores: [
      { id: 'ebay', name: 'eBay', jp: false, build: (f) => wrapEbay(`https://www.ebay.com/sch/i.html?_nkw=${enc(q(f, false))}`) },
      { id: 'mandarake', name: 'Mandarake', jp: true, build: (f) => `https://order.mandarake.co.jp/order/listPage/list?keyword=${enc(q(f, true))}` },
      { id: 'surugaya', name: 'Suruga-ya', jp: true, build: (f) => `https://www.suruga-ya.com/search?search_word=${enc(q(f, true))}` },
      { id: 'rakuten', name: 'Rakuten', jp: true, build: (f) => `https://search.rakuten.co.jp/search/mall/${enc(q(f, true))}/` },
    ],
  },
  {
    group: 'Pośrednicy (aukcje JP)',
    stores: [
      { id: 'buyee', name: 'Buyee', jp: true, build: (f) => `https://buyee.jp/item/search/query/${enc(q(f, true))}` },
      { id: 'zenmarket', name: 'ZenMarket', jp: true, build: (f) => `https://zenmarket.jp/en/yahoo.aspx?q=${enc(q(f, true))}` },
    ],
  },
  {
    group: 'Ostrożnie (ryzyko podróbek)',
    warn: true,
    stores: [
      { id: 'aliexpress', name: 'AliExpress', jp: false, warn: true, build: (f) => `https://www.aliexpress.com/wholesale?SearchText=${enc(q(f, false))}` },
    ],
  },
];

// --- doczepianie ID afiliacyjnych (bezpieczne, gdy puste) ---
function wrapAmazon(url) {
  if (!AFFILIATE_IDS.amazonJp) return url;
  return `${url}&tag=${encodeURIComponent(AFFILIATE_IDS.amazonJp)}`;
}
function wrapEbay(url) {
  if (!AFFILIATE_IDS.ebay) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('mkcid', '1');
    u.searchParams.set('campid', AFFILIATE_IDS.ebay);
    u.searchParams.set('toolid', '10001');
    return u.toString();
  } catch {
    return url;
  }
}
