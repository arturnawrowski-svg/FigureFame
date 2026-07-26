// ============================================================================
// FigureFame — warstwa afiliacyjna (plan: affiliation.md)
// ----------------------------------------------------------------------------
// Zasada: monetyzujemy KONKRETNE OFERTY, nie linki do wyszukiwarek sklepów.
// Ten moduł nie tworzy ofert — bierze prawdziwy adres oferty (z eBay/Rakuten
// lub innego źródła danych) i dokleja do niego nasz identyfikator partnerski.
//
// Dlaczego tak:
//   • link do wyszukiwarki („zobacz wyniki dla Miku") jest bezwartościowy dla
//     kolekcjonera i słabo konwertuje — liczy się konkretny egzemplarz i cena,
//   • konkretną ofertę da się pokazać tylko tam, gdzie mamy dostęp do danych
//     (oficjalne API albo plik produktowy sieci afiliacyjnej).
//
// BEZPIECZEŃSTWO PROGRAMU: dopóki w env nie ma identyfikatora dla danej
// platformy, zwracamy adres NIEZMIENIONY. Nigdy nie wysyłamy tagów partnerskich
// przed akceptacją konta — to najczęstszy powód blokady w programach afiliacyjnych.
// ============================================================================

// Rejestr platform. `env` to nazwa zmiennej z identyfikatorem partnerskim;
// `decorate` dokłada parametry zgodnie z zasadami danego programu.
const PLATFORMS = [
  {
    id: "ebay",
    hosts: ["ebay.com", "ebay.co.uk", "ebay.de", "ebay.pl"],
    env: "EBAY_AFFILIATE_CAMPAIGN_ID",
    decorate: (u, id) => {
      u.searchParams.set("mkcid", "1");
      u.searchParams.set("mkrid", "711-53200-19255-0");
      u.searchParams.set("campid", id);
      u.searchParams.set("toolid", "10001");
      u.searchParams.set("customid", "figurefame");
    },
  },
  {
    id: "rakuten",
    hosts: ["rakuten.co.jp", "rakuten.com"],
    env: "RAKUTEN_AFFILIATE_ID",
    // Rakuten zwraca gotowe affiliateUrl przez API; tu tylko awaryjny znacznik.
    decorate: (u, id) => u.searchParams.set("scid", id),
  },
  {
    id: "amazon",
    hosts: ["amazon.com", "amazon.co.jp", "amazon.de", "amazon.pl", "amzn.to"],
    env: "AMAZON_ASSOCIATE_TAG",
    decorate: (u, id) => u.searchParams.set("tag", id),
  },
  {
    id: "aliexpress",
    hosts: ["aliexpress.com", "aliexpress.ru"],
    env: "ALIEXPRESS_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("aff_short_key", id),
  },
  {
    id: "solaris",
    hosts: ["solarisjapan.com"],
    env: "SOLARIS_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("ref", id),
  },
  {
    id: "playasia",
    hosts: ["play-asia.com"],
    env: "PLAYASIA_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("tagid", id),
  },
  {
    id: "tokyootakumode",
    hosts: ["otakumode.com"],
    env: "TOM_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("cr", id),
  },
  {
    id: "cdjapan",
    hosts: ["cdjapan.co.jp"],
    env: "CDJAPAN_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("aff", id),
  },
  {
    id: "entertainmentearth",
    hosts: ["entertainmentearth.com"],
    env: "EE_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("id", id),
  },
  {
    id: "sideshow",
    hosts: ["sideshow.com"],
    env: "SIDESHOW_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("affiliate", id),
  },
  {
    id: "buyee",
    hosts: ["buyee.jp"],
    env: "BUYEE_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("affiliate", id),
  },
  {
    id: "zenmarket",
    hosts: ["zenmarket.jp"],
    env: "ZENMARKET_AFFILIATE_ID",
    decorate: (u, id) => u.searchParams.set("ref", id),
  },
];

function platformFor(host) {
  const h = host.replace(/^www\./, "").toLowerCase();
  return PLATFORMS.find((p) => p.hosts.some((x) => h === x || h.endsWith(`.${x}`))) || null;
}

// Dokłada identyfikator partnerski do adresu KONKRETNEJ oferty.
// Bez skonfigurowanego identyfikatora zwraca adres bez zmian.
export function decorateOfferUrl(url) {
  if (!url || typeof url !== "string") return url;
  try {
    const u = new URL(url);
    const platform = platformFor(u.hostname);
    if (!platform) return url;

    const id = process.env[platform.env];
    if (!id) return url; // program jeszcze niezatwierdzony — nie znaczymy

    platform.decorate(u, id);
    return u.toString();
  } catch {
    return url;
  }
}

// Które programy są realnie aktywne (mają identyfikator). Do panelu admina,
// żeby było widać, co już zarabia, a co czeka na akceptację konta.
export function affiliateStatus() {
  return PLATFORMS.map((p) => ({
    id: p.id,
    configured: !!process.env[p.env],
    env: p.env,
  }));
}

// Znacznik dla interfejsu: czy dana oferta jest linkiem partnerskim (obowiązek
// informacyjny wobec użytkownika — w UE trzeba to jasno oznaczyć).
export function isAffiliate(url) {
  if (!url) return false;
  try {
    const platform = platformFor(new URL(url).hostname);
    return !!(platform && process.env[platform.env]);
  } catch {
    return false;
  }
}
