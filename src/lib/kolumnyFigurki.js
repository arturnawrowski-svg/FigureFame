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
