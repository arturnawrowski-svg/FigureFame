// ============================================================================
// JEDNA DEFINICJA „KOMPLETU DANYCH".
// ----------------------------------------------------------------------------
// Po co osobny plik: na to samo pytanie — „czy ta figurka ma wszystko?" —
// odpowiadały trzy różne miejsca, każde po swojemu. Przycisk „Zleć FigureFame
// szukanie danych" miał własną listę pól, panel pokazywał co innego, a bazy nie
// dało się o to zapytać WCALE. Dopóki „komplet" jest wrażeniem, a nie regułą,
// „perfekcyjna baza" jest opinią i nie da się jej sprawdzić.
//
// ⚠️ TEN PLIK NIE MA IMPORTÓW I MIEĆ NIE MOŻE. Czytają go naraz przeglądarka
// (panel) i Node (`npm run audyt-bazy`). Jeden import `authFetch`, `supabase`
// albo `node:fs` odcina jedną z tych dwóch stron — a wtedy definicje znów się
// rozjadą, tylko już po cichu.
//
// Podział na DWIE warstwy jest celowy:
//
//   czegoBrakuje()    — czego NIE MA. Decyduje, kiedy szukanie ma przestać,
//                       więc każde dodane pole wydłuża pracę przy każdej figurce.
//   uwagiDoFigurki()  — co JEST, ale jest złe (śmieć, zły alfabet, pół-stan).
//                       Nie wydłuża szukania, bo szukanie tego nie naprawi —
//                       to materiał dla audytu i dla przebiegu naprawczego.
//
// Bez tej granicy jedna lista robiłaby obie rzeczy naraz: albo audyt byłby
// płytki, albo każda figurka mieliłaby pełne trzy minuty na czymś, czego
// katalogi i tak nie dostarczą.
// ============================================================================

// ----------------------------------------------------------------------------
// PUSTE
// ----------------------------------------------------------------------------
// W bazie brak jest zapisany na dwa sposoby: `NULL` i `''`. Zmierzone 03.08:
// przy `official_image_url` 3 wiersze mają NULL i 3 pusty napis. Każdy warunek
// `is null` mija wtedy połowę braków — mój pierwszy pomiar tej bazy wyszedł
// z tego powodu za dobrze. Jedna funkcja, jedna odpowiedź.
export function pusta(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v).length === 0;
  return false;
}

// ----------------------------------------------------------------------------
// ALFABET
// ----------------------------------------------------------------------------
// Bez tego testu pole „nazwa japońska" uznaje `Taihou` za wypełnione — a tak
// jest dziś w bazie w sześciu wierszach. Pole wypełnione łacinką nie jest nazwą
// japońską; jest brakiem, który WYGLĄDA na komplet, czyli najgorszym rodzajem
// błędu w tym projekcie.
//
// Zakresy podane liczbami, a nie samymi znakami, i to nie jest przesada:
// pierwsza wersja tego pliku miała je wpisane wprost i jedna edycja narzędziem,
// które zapisało plik w innym kodowaniu, zamieniła całą klasę znaków w śmieć.
// Zapis liczbowy przeżyje każde takie potknięcie.
const ZAKRESY_JAPONSKIE = [
  [0x3005, 0x3007], // znaki powtórzenia: 々 〆 〇
  [0x3040, 0x30ff], // hiragana + katakana
  [0x3400, 0x4dbf], // kanji, rozszerzenie A
  [0x4e00, 0x9fff], // kanji, zakres podstawowy
  [0xf900, 0xfaff], // kanji, formy zgodności
  [0xff66, 0xff9d], // katakana połówkowa
];

export function maZnakJaponski(v) {
  if (typeof v !== 'string') return false;
  for (const znak of v) {
    const kod = znak.codePointAt(0);
    for (const [od, do_] of ZAKRESY_JAPONSKIE) {
      if (kod >= od && kod <= do_) return true;
    }
  }
  return false;
}

/**
 * Japoński z łacińską wstawką — prawie zawsze tytuł produktu dokleiony do nazwy
 * postaci (`木之本桜 Stars Bless You`, `ゼロツー For My Darling`). To objaw
 * kolumny trzymającej dwa różne fakty; rozdziela to przebieg naprawczy,
 * nie wyszukiwanie.
 */
export function mieszaAlfabety(v) {
  return maZnakJaponski(v) && /[A-Za-z]/.test(v);
}

// ----------------------------------------------------------------------------
// ZDJĘCIE
// ----------------------------------------------------------------------------
// Reguła bezwzględna: liczy się WYŁĄCZNIE gotowy plik w naszym magazynie.
// Adres na cudzym serwerze właściciel odcina, kiedy chce — Kotobukiya skasowało
// zdjęcie Leviego, zanim je ściągnęliśmy, i dziś ten adres oddaje 301 na stronę
// główną. Pole z takim adresem wygląda na wypełnione, a Gablota pokazuje dziurę.
//
// Rozpoznajemy pięć stanów, bo w bazie są wszystkie pięć:
//
//   magazyn  — nasz Storage, plik gotowy                     ← jedyny komplet
//   roboczy  — nasz Storage, ale katalog /_work/ (przed finalizacją)
//   obcy     — http na cudzym serwerze                       ← łamie regułę
//   lokalny  — nazwa pliku z /public/images (zasiew, np. „miku_figure")
//   brak     — NULL albo pusty napis
//
// Sprawdzenie po `includes('supabase.co')` — tak było do tej pory w siedmiu
// miejscach — przepuszcza `https://cudzy.example/?x=supabase.co`. Rozbieramy
// więc adres na host i ścieżkę.
export function stanZdjecia(raw) {
  if (pusta(raw)) return { stan: 'brak' };
  const v = String(raw).trim();

  if (!/^https?:\/\//i.test(v)) {
    // Nie adres — czyli bazowa nazwa pliku z /public/images (patrz getImageUrl).
    return { stan: 'lokalny', plik: v.replace(/^\/+/, '').replace(/\.(png|jpe?g|webp|avif)$/i, '') };
  }

  let url;
  try {
    url = new URL(v);
  } catch {
    return { stan: 'obcy' }; // adres, którego nie da się rozebrać, nie jest naszym plikiem
  }

  const nasz = /(^|\.)supabase\.co$/i.test(url.hostname) && url.pathname.startsWith('/storage/');
  if (!nasz) return { stan: 'obcy' };
  // Katalog roboczy: plik już u nas, ale przed kompresją i sprzątaniem.
  // Panel finalizuje go przy zapisie (`needsFinalize` w AdminDashboard.jsx).
  if (url.pathname.includes('/_work/')) return { stan: 'roboczy' };
  return { stan: 'magazyn' };
}

/** Skrót do najczęstszego pytania: czy to gotowe zdjęcie w naszym magazynie. */
export function zdjecieUNas(raw) {
  return stanZdjecia(raw).stan === 'magazyn';
}

// ============================================================================
// WARSTWA 1 — CZEGO BRAKUJE
// ----------------------------------------------------------------------------
// Ta lista rozstrzyga, kiedy jedno kliknięcie „Zleć FigureFame szukanie danych"
// ma przestać pracować. Za łagodna — komplet nie przychodzi i trzeba klikać
// w kółko. Za surowa — każda figurka mieli pełne trzy minuty bez sensu.
// Dlatego są tu tylko cztery pola, wszystkie dostarczalne przez katalogi.
// ============================================================================
export const POLA_KOMPLETU = [
  ['japanese_name', 'nazwa japońska', (v) => maZnakJaponski(v)],
  ['manufacturer', 'producent', (v) => !pusta(v)],
  ['scale', 'skala', (v) => !pusta(v)],
  ['official_image_url', 'zdjęcie', (v) => zdjecieUNas(v)],
];

/** Czego jeszcze brakuje do kompletu — nazwami do pokazania moderatorowi. */
export function czegoBrakuje(dane) {
  if (!dane) return POLA_KOMPLETU.map(([, etykieta]) => etykieta);
  return POLA_KOMPLETU
    .filter(([pole, , ma]) => !ma(dane[pole]))
    .map(([, etykieta]) => etykieta);
}

/** Czy można przestać szukać. */
export function jestPewny(dane) {
  return czegoBrakuje(dane).length === 0;
}

// ============================================================================
// WARSTWA 2 — CO JEST, ALE JEST ZŁE
// ----------------------------------------------------------------------------
// Każda pozycja odpowiada usterce ZMIERZONEJ w tej bazie 03.08.2026, nie
// wyobrażonej. `waga: 'blad'` znaczy „dane są nieprawdziwe albo złamana jest
// reguła projektu"; `'uwaga'` znaczy „stan pośredni, do domknięcia dalej".
// ============================================================================

// Kolumny tekstowe JEDNOWIERSZOWE — biały znak na brzegu, pusty napis
// i złamanie linii są w nich usterką.
//
// `manufacturer` wchodzi do klucza tożsamości i do klucza pamięci podręcznej,
// więc „Kotobukiya " ze spacją na końcu to nie kosmetyka: to chybienie
// w pamięć i drugie, gorsze pobranie tej samej figurki.
//
// Ta sama lista pilnuje wejścia do bazy (`przygotujDoZapisu` w kolumnyFigurki.js)
// i wyjścia z audytu — celowo jedna, bo dwie rozjechałyby się przy pierwszej
// nowej kolumnie. NIE ma tu pól listowych (`additional_info`, `strategy`…):
// w nich złamanie linii jest treścią, nie usterką.
export const POLA_JEDNOWIERSZOWE = [
  'name', 'japanese_name', 'series', 'japanese_series',
  'manufacturer', 'scale', 'version', 'japanese_version',
  'official_image_url', 'image_credit', 'source_url',
  'original_price', 'release_date', 'type',
];

/**
 * Lista usterek jednego wiersza `figures`.
 *
 * Nie zagląda na dysk ani do bazy — istnienie pliku z /public/images
 * i duplikaty między wierszami sprawdza `worker/audytBazy.mjs`, bo do tego
 * trzeba odpowiednio `node:fs` i całej tabeli.
 *
 * @returns {{kod: string, opis: string, waga: 'blad'|'uwaga'}[]}
 */
export function uwagiDoFigurki(fig) {
  if (!fig) return [];
  const out = [];
  const dodaj = (kod, opis, waga = 'uwaga') => out.push({ kod, opis, waga });

  // --- higiena napisów ---
  for (const pole of POLA_JEDNOWIERSZOWE) {
    const v = fig[pole];
    if (typeof v !== 'string') continue;
    if (v === '') dodaj('pusty-napis', `${pole}: pusty napis zamiast NULL`, 'blad');
    else if (v !== v.trim()) dodaj('biale-znaki', `${pole}: „${v}" — biały znak na brzegu`, 'blad');
    // Złamanie linii w polu jednowierszowym to nie kosmetyka: `¥440\nEach`
    // w `original_price` trafia tak w kartę figurki i w napisy shorta.
    else if (/[\n\r]/.test(v)) dodaj('napis-wieloliniowy', `${pole}: „${v.replace(/\s+/g, ' ')}" — złamanie linii w polu jednowierszowym`, 'uwaga');
    else if (/\s{2,}/.test(v)) dodaj('podwojna-spacja', `${pole}: „${v}" — podwójna spacja`, 'uwaga');
  }

  // --- alfabet pól japońskich ---
  if (!pusta(fig.japanese_name) && !maZnakJaponski(fig.japanese_name)) {
    dodaj('jp-po-lacinie', `japanese_name: „${fig.japanese_name}" bez ani jednego znaku japońskiego`, 'blad');
  }
  if (!pusta(fig.japanese_series) && !maZnakJaponski(fig.japanese_series)) {
    dodaj('seria-jp-po-lacinie', `japanese_series: „${fig.japanese_series}" bez ani jednego znaku japońskiego`, 'blad');
  }
  if (mieszaAlfabety(fig.japanese_name)) {
    dodaj('jp-z-wersja', `japanese_name: „${fig.japanese_name}" — nazwa postaci zlepiona z tytułem produktu`, 'uwaga');
  }

  // --- zdjęcie ---
  const zdj = stanZdjecia(fig.official_image_url);
  if (zdj.stan === 'obcy') {
    dodaj('zdjecie-obce', 'official_image_url: adres na cudzym serwerze — łamie regułę „albo nasz magazyn, albo pusto"', 'blad');
  } else if (zdj.stan === 'lokalny') {
    dodaj('zdjecie-zasiew', `official_image_url: „${zdj.plik}" to plik z /public/images (zasiew), nie nasz magazyn`, 'uwaga');
  } else if (zdj.stan === 'roboczy') {
    dodaj('zdjecie-robocze', 'official_image_url: plik w /_work/ — finalizacja się nie dokończyła', 'blad');
  }
  // Podpis praw: puste pole NIE zostawia zdjęcia bez podpisu — to zobowiązanie
  // z regulaminu (punkt o „Fot."), więc brak podpisu przy zdjęciu jest błędem.
  if (zdj.stan !== 'brak' && pusta(fig.image_credit)) {
    dodaj('brak-podpisu', 'jest zdjęcie, brak image_credit („Fot. …")', 'blad');
  }

  // --- tożsamość ---
  // Figurka bez adresu jest groźniejsza, niż wygląda: indeks unikalności obejmuje
  // wyłącznie wartości niepuste, czyli przy pustym `identity_key` wykrywanie
  // duplikatów po prostu nie działa.
  if (pusta(fig.identity_key)) dodaj('brak-identity', 'brak identity_key — duplikat tej figurki nie odbije się od indeksu', 'blad');
  if (pusta(fig.short_code)) dodaj('brak-kodu', 'brak short_code', 'blad');
  if (pusta(fig.slug)) dodaj('brak-slug', 'brak slug (adres /f/…)', 'blad');

  // --- rozdzielenie postaci od produktu ---
  if (pusta(fig.character_id)) dodaj('brak-postaci', 'character_id puste — wiersz nie jest podłączony do postaci');

  // --- zaufanie do danych ---
  if (pusta(fig.provenance)) dodaj('brak-pochodzenia', 'provenance puste — nie wiadomo, co z katalogu, a co ze zgadywania AI');
  if (pusta(fig.source_url) && pusta(fig.external_ids)) dodaj('brak-zrodla', 'brak source_url i external_ids — nie ma kotwicy do ponownego pobrania');

  return out;
}

/** Skrót dla panelu: ile błędów, ile uwag. */
export function podsumujUwagi(fig) {
  const uwagi = uwagiDoFigurki(fig);
  return {
    bledy: uwagi.filter((u) => u.waga === 'blad'),
    uwagi: uwagi.filter((u) => u.waga === 'uwaga'),
  };
}
