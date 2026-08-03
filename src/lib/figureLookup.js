// ============================================================================
// Wyszukiwanie danych figurki po stronie przeglądarki.
// ----------------------------------------------------------------------------
// Wydzielone z panelu admina: to logika sieciowa (strumień zdarzeń, składanie
// odpowiedzi), a nie widok. Dzięki temu komponent zajmuje się wyświetlaniem,
// a tę część da się testować i użyć ponownie — np. w przyszłej wyszukiwarce
// publicznej.
// ============================================================================

import { authFetch } from './authFetch';

/**
 * Czyta strumień zdarzeń (SSE) z /api/fetch-figure.
 * onProgress dostaje kolejne etapy (do paska postępu), funkcja zwraca finalne
 * dane figurki albo null, gdy serwer ich nie przysłał.
 */
export async function streamLookup(name, series, onProgress, opts = {}) {
  const url =
    `/api/fetch-figure?stream=1&name=${encodeURIComponent(name)}` +
    (series ? `&series=${encodeURIComponent(series)}` : '') +
    // Producent nie wchodzi do klucza pamięci podręcznej — jest wskazówką dla
    // katalogów, która z kilkunastu wersji tej samej postaci jest właściwa.
    (opts.manufacturer ? `&manufacturer=${encodeURIComponent(opts.manufacturer)}` : '') +
    // Skala jedzie razem z producentem i NIE jest ozdobnikiem: dopiero para
    // „producent + skala" pozwala workerowi potwierdzić zdjęcie podane przez
    // jedno źródło (crossCheckImage, droga 3). Sama skala albo sam producent
    // nic nie dają — warunek wymaga obu naraz.
    (opts.scale ? `&scale=${encodeURIComponent(opts.scale)}` : '') +
    // Wersja („Tiger Hoodie Ver.") — trzeci człon odróżniający wydanie.
    // Bez niej dwie wersje tej samej figurki od tego samego producenta
    // w tej samej skali dzieliłyby jeden wpis w pamięci podręcznej.
    (opts.version ? `&version=${encodeURIComponent(opts.version)}` : '') +
    (opts.deep ? '&deep=1' : '') +
    (opts.refresh ? '&refresh=1' : '') +
    // Tryb czekania: TYLKO zajrzyj do pamięci i wróć. Używany przez panel,
    // gdy odpytuje co kilka sekund w oczekiwaniu na Studio. Bez tego każde
    // takie zapytanie uruchamiałoby pełne wyszukiwanie ze wszystkimi kosztami.
    (opts.tylkoPamiec ? '&czekam=1' : '');

  const res = await authFetch(url);
  if (!res.ok || !res.body) throw new Error(`Serwer odpowiedział ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Zdarzenia SSE rozdziela pusta linia; ostatni fragment może być niepełny.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const event = (chunk.match(/^event:\s*(.+)$/m) || [])[1];
      const raw = (chunk.match(/^data:\s*([\s\S]+)$/m) || [])[1];
      if (!event || !raw) continue;

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        continue; // uszkodzone zdarzenie pomijamy, reszta strumienia jest ważna
      }

      if (event === 'progress') onProgress?.(payload);
      else if (event === 'result') result = payload;
      else if (event === 'error') throw new Error(payload.error || 'Błąd serwera');
    }
  }
  return result;
}

// ============================================================================
// KIEDY WYNIK JEST „PEWNY"
// ----------------------------------------------------------------------------
// Jedno kliknięcie ma dowieźć komplet, a nie „coś". Dlatego szukanie nie kończy
// się po pierwszej odpowiedzi, tylko dopiero wtedy, gdy komplet jest na stole
// albo skończy się czas. Ta lista mówi, czego pilnujemy.
//
// Zdjęcie liczy się WYŁĄCZNIE wtedy, gdy leży w naszym magazynie. Adres
// z cudzego serwera właściciel może odciąć w dowolnej chwili, a wtedy Gablota
// pokazuje dziurę — dlatego api/fetch-figure.js i tak takie pole czyści.
// ============================================================================
const KOMPLET = [
  ['japanese_name', 'nazwa japońska'],
  ['manufacturer', 'producent'],
  ['scale', 'skala'],
  ['official_image_url', 'zdjęcie'],
];

/** Czego jeszcze brakuje do kompletu — nazwami do pokazania moderatorowi. */
export function czegoBrakuje(dane) {
  if (!dane) return KOMPLET.map(([, etykieta]) => etykieta);
  return KOMPLET.filter(([pole]) => {
    const v = dane[pole];
    if (!v || String(v).trim() === '') return true;
    // Zdjęcie spoza naszego magazynu to brak zdjęcia.
    if (pole === 'official_image_url') return !String(v).includes('supabase.co');
    return false;
  }).map(([, etykieta]) => etykieta);
}

/** Czy można przestać szukać. */
export function jestPewny(dane) {
  return czegoBrakuje(dane).length === 0;
}

// Pola, przy których cicha podmiana boli najbardziej — bo wyglądają na
// zweryfikowane, a decydują o tożsamości figurki.
const IDENTITY_FIELDS = ['name', 'series', 'manufacturer', 'scale', 'original_price'];

// Producent jest naszą WSKAZÓWKĄ dla katalogów — to po nim rozróżniamy
// kilkanaście figurek tej samej postaci. Jeśli katalog mimo to odpowiada innym
// producentem, znaczy że trafił w inny produkt. To rozbieżność do rozstrzygnięcia,
// nigdy „ulepszenie" do cichego zapisania.
const NEVER_SILENTLY_REPLACED = ['manufacturer'];

/**
 * Scala dane z wyszukiwania z formularzem edycji.
 *
 * Zasady: puste wartości nic nie nadpisują, klucze techniczne (_sources,
 * _aiError…) to komunikaty i nie mogą trafić do zapisu w bazie, a pola
 * tekstowo-listowe rozbijamy na linie.
 *
 * NAJWAŻNIEJSZA ZASADA — wypełnione pole jest chronione.
 * Wcześniej wynik wyszukiwania nadpisywał wszystko. Wystarczyło, że katalog
 * trafił w inną wersję figurki, i „Clayz / 1/8" zamieniało się w „Good Smile
 * Company / 1/4" bez śladu i bez pytania. Teraz pole z wartością zmieniamy
 * tylko wtedy, gdy nowa dana pochodzi z KATALOGU (_provenance = 'catalog'),
 * a dotychczasowa nie była potwierdzona. Każdą inną rozbieżność zgłaszamy
 * w `_conflicts` — moderator rozstrzyga sam, zamiast dowiadywać się po fakcie.
 *
 * @param {object} form   aktualny formularz
 * @param {object} data   odpowiedź z /api/fetch-figure
 * @param {object} [opts] { confirmed: Set<string> } — pola już potwierdzone przez katalog
 * @returns {object} nowy formularz; ewentualne rozbieżności w `_conflicts`
 */
export function mergeLookupIntoForm(form, data, opts = {}) {
  const out = { ...form };
  const confirmed = opts.confirmed || new Set();
  const provenance = data?._provenance || {};
  const conflicts = [];

  const assign = (key, val, isList) => {
    if (val === null || val === undefined || val === '') return;

    if (isList) {
      // Listy (opis, gdzie szukać, strategia) uzupełniamy tylko gdy są puste —
      // to teksty redakcyjne, moderator mógł je świadomie napisać po swojemu.
      const current = out[key];
      const hasCurrent = Array.isArray(current) ? current.length > 0 : Boolean(current);
      if (hasCurrent) return;

      if (typeof val === 'string' && val.trim() !== '') {
        out[key] = val.split('\n').filter((line) => line.trim() !== '');
      } else if (Array.isArray(val) && val.length > 0) {
        out[key] = val;
      }
      return;
    }

    const next = typeof val === 'string' ? val.trim() : val;
    if (next === '') return;

    const current = typeof out[key] === 'string' ? out[key].trim() : out[key];
    if (!current) {
      out[key] = next; // puste pole — wypełniamy bez pytania
      return;
    }
    if (String(current) === String(next)) return; // ta sama wartość, nie ma tematu

    const fromCatalog = provenance[key] === 'catalog';
    const alreadyConfirmed = confirmed.has(key) || NEVER_SILENTLY_REPLACED.includes(key);

    if (fromCatalog && !alreadyConfirmed) {
      out[key] = next; // katalog bije niepotwierdzone zgłoszenie
      return;
    }

    // Pozostałe przypadki: zostawiamy to, co jest, i meldujemy różnicę.
    if (IDENTITY_FIELDS.includes(key)) {
      conflicts.push({ field: key, current: String(current), found: String(next), source: provenance[key] || 'ai' });
    }
  };

  for (const key in data) {
    if (key.startsWith('_')) continue; // komunikaty, nie dane figurki

    if (key === 'additionalInfo' || key === 'additional_info') assign('additional_info', data[key], true);
    else if (key === 'whereToSearch' || key === 'where_to_search') assign('where_to_search', data[key], true);
    else if (key === 'strategy') assign('strategy', data[key], true);
    else if (key === 'marketValueAverage' || key === 'market_value_average') {
      if (data[key] && !out.market_value) out.market_value = { average: data[key] };
    } else {
      assign(key, data[key], false);
    }
  }

  if (conflicts.length > 0) out._conflicts = conflicts;
  return out;
}
