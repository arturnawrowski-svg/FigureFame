// ============================================================================
// BIAŁA LISTA KOLUMN TABELI `figures`.
// ----------------------------------------------------------------------------
// Po co: wynik wyszukiwania wpada do formularza w całości, a katalogi zwracają
// WIĘCEJ pól, niż mamy kolumn. `server-lib/figureSources.js` podaje np.
// `product_url` (adres strony produktu w MyFigureCollection) — pożyteczna rzecz,
// ale kolumny o takiej nazwie nie ma. Formularz szedł do bazy jak leci i zapis
// kończył się błędem:
//
//     Could not find the 'product_url' column of 'figures' in the schema cache
//
// Objaw dla moderatora: wyszukiwanie działa, dane widać na ekranie, a przycisk
// „Zapisz Edycję" nie działa i nie wiadomo dlaczego. Zdarzyło się 03.08 —
// dopiero gdy katalogi zaczęły odpowiadać, bo wcześniej to pole nie dochodziło.
//
// ⚠️ NOWA KOLUMNA W BAZIE = NOWY WPIS TUTAJ. Bez tego zapis po cichu ją pominie
// — a to gorsze niż błąd, bo wygląda jak udany zapis. Lista jest w tej samej
// kolejności co tabela, żeby dało się ją porównać jednym spojrzeniem.
// ============================================================================

// Rozszerzenie `.js` obowiązkowo — patrz nadajTozsamosc.js. Bez niego Node
// (czyli skrypty w `worker/`) nie znajdzie modułu.
import { POLA_JEDNOWIERSZOWE, stanZdjecia } from './kompletnosc.js';

export const KOLUMNY_FIGURKI = [
  'name', 'japanese_name', 'series', 'japanese_series',
  'manufacturer', 'scale', 'type', 'status',
  'original_price', 'official_image_url', 'light_class',
  'additional_info', 'market_value', 'where_to_search', 'strategy',
  'submitted_by', 'release_date',
  'image_source_type', 'image_rights_ack', 'source_url', 'image_credit',
  'bootleg_risk', 'rarity_score', 'last_price_check',
  'video_status', 'video_status_at', 'video_url', 'video_options',
  'youtube_video_id', 'tiktok_post_id', 'instagram_reel_id', 'pinterest_pin_id',
  'affiliate_links_json', 'drive_file_id', 'drive_url',
  'slug', 'short_code', 'identity_key', 'external_ids',
  // Rozdzielenie postaci od produktu (migracje-postacie.sql)
  'character_id', 'version', 'japanese_version', 'provenance',
];

const DOZWOLONE = new Set(KOLUMNY_FIGURKI);

// Nazwy pól po polsku. Panel pokazuje rozbieżności moderatorowi, a `japanese_name`
// obok `official_image_url` w komunikacie po polsku czyta się jak zrzut z bazy,
// nie jak pytanie do człowieka.
export const ETYKIETY_POL = {
  name: 'nazwa postaci',
  japanese_name: 'nazwa japońska',
  series: 'seria',
  japanese_series: 'seria po japońsku',
  manufacturer: 'producent',
  scale: 'skala',
  version: 'wersja',
  japanese_version: 'wersja po japońsku',
  type: 'typ',
  original_price: 'cena pierwotna',
  release_date: 'data premiery',
  official_image_url: 'zdjęcie',
  image_credit: 'podpis zdjęcia',
  source_url: 'adres źródła',
  market_value: 'wartość rynkowa',
  additional_info: 'dodatkowe informacje',
  where_to_search: 'gdzie szukać',
  strategy: 'strategia',
};

/** Nazwa pola po polsku; gdy jej nie znamy, oddajemy nazwę kolumny bez udawania. */
export function etykietaPola(pole) {
  return ETYKIETY_POL[pole] || pole;
}

/**
 * Zostawia wyłącznie to, co baza potrafi przyjąć.
 *
 * Pola techniczne (`_provenance`, `_sources`, `_conflicts`…) i pola katalogów
 * bez własnej kolumny (`product_url`, `market_value_average`…) odpadają tutaj,
 * a nie w postaci błędu z PostgREST.
 */
export function tylkoKolumny(obiekt) {
  const out = {};
  for (const klucz of Object.keys(obiekt || {})) {
    if (DOZWOLONE.has(klucz)) out[klucz] = obiekt[klucz];
  }
  return out;
}

// ============================================================================
// BRAMA ZAPISU — ostatnie miejsce, w którym da się nie wpuścić śmiecia.
// ----------------------------------------------------------------------------
// `tylkoKolumny` pilnowało dotąd jednej rzeczy: czy kolumna istnieje. Nie
// pilnowało, czy WARTOŚĆ ma sens — i baza to pokazuje (zmierzone 03.08):
//
//   • `manufacturer` = „Kotobukiya " ze spacją na końcu. Producent wchodzi do
//     klucza tożsamości i do klucza pamięci podręcznej, więc ta spacja to
//     chybienie w zapisany wpis i drugie, gorsze pobranie tej samej figurki.
//   • brak zapisany na dwa sposoby: 3 wiersze `NULL`, 3 pusty napis. Każdy
//     warunek `is null` mija wtedy połowę braków.
//   • `original_price` = „¥440\nEach" — złamanie linii, które leci wprost
//     na kartę figurki i w napisy shorta.
//
// Naprawianie tego przebiegiem po bazie bez zamknięcia tej bramy byłoby
// czerpaniem wody z łodzi z dziurą.
// ============================================================================

/**
 * Przygotowuje dane do zapisu: przepuszcza tylko istniejące kolumny, porządkuje
 * napisy i nie wpuszcza zdjęcia z cudzego serwera.
 *
 * ⚠️ Zdjęcia z cudzego serwera NIE zerujemy i NIE blokujemy nim zapisu —
 * usuwamy KLUCZ z zapisu i mówimy o tym wprost. Zerowanie skasowałoby dobre
 * zdjęcie, które już jest w bazie, a blokada zapisu odebrałaby moderatorowi
 * możliwość zapisania pozostałych poprawek. Adres zostaje w formularzu na
 * ekranie, więc da się go pobrać jeszcze raz — a do bazy nie wchodzi, bo pole
 * wyglądałoby na wypełnione, gdy właściciel serwera odetnie plik.
 *
 * @returns {{pola: object, ostrzezenia: string[]}}
 */
export function przygotujDoZapisu(obiekt) {
  const pola = tylkoKolumny(obiekt);
  const ostrzezenia = [];

  for (const klucz of POLA_JEDNOWIERSZOWE) {
    if (!(klucz in pola)) continue;
    const v = pola[klucz];
    if (typeof v !== 'string') continue;
    // Złamania linii i wielokrotne odstępy schodzą do jednej spacji, brzegi
    // obcinamy, a puste pole zapisujemy JEDNYM sposobem: jako NULL.
    const czysty = v.replace(/\s+/g, ' ').trim();
    pola[klucz] = czysty === '' ? null : czysty;
  }

  if (typeof pola.official_image_url === 'string' && !stanZdjeciaOk(pola.official_image_url)) {
    delete pola.official_image_url;
    ostrzezenia.push(
      'Zdjęcie NIE zostało zapisane: adres wskazuje na cudzy serwer, a tam plik może zniknąć. ' +
      'Pobierz je do naszego magazynu („Studio zdjęcia") i zapisz jeszcze raz.'
    );
  }

  return { pola, ostrzezenia };
}

// Do zapisu wpuszczamy wszystko poza adresem na cudzym serwerze: nasz magazyn,
// plik roboczy (finalizacja domknie go przy wejściu do Gabloty), nazwę pliku
// z /public/images (zasiew) i pustkę.
function stanZdjeciaOk(raw) {
  return stanZdjecia(raw).stan !== 'obcy';
}
