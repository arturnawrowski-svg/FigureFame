import { callAIJson } from "../server-lib/aiClient.js";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { gatherFromSources } from "../server-lib/figureSources.js";
import { rehostImage, crossCheckImage } from "../server-lib/figureImage.js";
import { kluczPostaci, kluczProduktu, hasLocalBrowser } from "../server-lib/lookupShared.js";
import { wymagajModeratora } from "../server-lib/wymagajModeratora.js";

// Pamięć podręczna wyszukiwań — chroni mały limit pośrednika (patrz migracje-cache.sql).
const CACHE_DAYS = 30;

// Czy zapamiętany wynik w ogóle coś WNOSI?
//
// ⚠️ W bazie leżą wpisy zapisane pod starą, zbyt luźną regułą — wystarczał
// `manufacturer`, a ten przychodzi ZE ZGŁOSZENIA, nie z badania (patrz
// komentarz przy writeCache). Taki wpis nie niesie ani jednej rzeczy, której
// moderator sam nie wpisał, a mimo to dawał Cache HIT i blokował ponowne
// szukanie przez całe CACHE_DAYS. Traktujemy go jak BRAK wpisu, żeby stare
// zatrucia goiły się same przy pierwszym wejściu.
//
// Zdjęcie z cudzego serwera nie liczy się jako treść — i tak wytnie je
// oczyscZdjecie() niżej, więc wpis z samym takim adresem jest pusty.
function wpisMaTresc(dane) {
  if (!dane) return false;
  const zdjecieUNas =
    typeof dane.official_image_url === 'string' &&
    dane.official_image_url.includes('supabase.co');
  return Boolean(
    zdjecieUNas ||
    dane.japanese_name ||
    dane.additionalInfo ||
    dane.whereToSearch ||
    dane.strategy
  );
}

async function readCache(key) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lookup_cache")
      .select("data, created_at")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return null;

    const ageDays = (Date.now() - new Date(data.created_at).getTime()) / 86_400_000;
    if (ageDays > CACHE_DAYS) return null; // przeterminowane — poszukamy od nowa
    if (!wpisMaTresc(data.data)) {
      console.log(`Cache ODRZUCONY (${key}) — wpis bez treści, szukamy od nowa.`);
      return null;
    }
    return data.data;
  } catch {
    return null; // brak tabeli/uprawnień nie może blokować wyszukiwania
  }
}

// Odczyt wpisu POSTACI. Osobno od readCache, bo `wpisMaTresc` pyta o rzeczy
// produktowe (zdjęcie, strategia) — postać ich nie ma i nigdy mieć nie będzie.
//
// Bez terminu ważności: japońska nazwa postaci nie psuje się po 30 dniach.
// „Super Sonico" to すーぱーそに子 dziś i za rok.
async function readCachePostaci(key) {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lookup_cache")
      .select("data")
      .eq("key", key)
      .maybeSingle();
    if (error || !data?.data) return null;
    const w = data.data;
    return w.japanese_name || w.japanese_series || w.series ? w : null;
  } catch {
    return null; // brak tabeli/uprawnień nie może blokować wyszukiwania
  }
}

// Zlecenie dla lokalnego workera: gdy serwer nie ma jak pobrać danych
// (Cloudflare przepuszcza tylko prawdziwą przeglądarkę), zostawiamy zadanie
// w bazie — komputer admina je odbierze. Ten sam układ co kolejka filmów.
// ⚠️ manufacturer i scale MUSZĄ tu dojechać. Worker potwierdza nimi zdjęcie
// podane przez jedno źródło (crossCheckImage, droga 3). Gdy ich brakowało,
// MFC podawało poprawne zdjęcie, a worker je wyrzucał jako niepotwierdzone —
// patrz migracje-kolejka-producent-skala.sql.
async function enqueueLookup(name, series, mode, manufacturer = '', scale = '', version = '') {
  try {
    const supabase = getSupabaseAdmin();

    // Zwykły insert po sprawdzeniu, a nie upsert: indeks chroniący przed
    // duplikatami jest CZĘŚCIOWY (obejmuje tylko zlecenia oczekujące),
    // a do takiego indeksu upsert nie potrafi się odwołać.
    const { data: existing } = await supabase
      .from("lookup_queue")
      .select("id")
      .eq("name", name)
      .eq("series", series)
      .eq("mode", mode)
      .in("status", ["pending", "working"])
      .limit(1);

    if (existing && existing.length > 0) return true; // już czeka w kolejce

    let { error } = await supabase
      .from("lookup_queue")
      .insert({ name, series, mode, manufacturer, scale, version, status: "pending" });

    // Kod może pojechać na produkcję ZANIM ktoś uruchomi migrację w Supabase —
    // zmienne i schemat bazy nie jadą z pushem. Wtedy PostgREST odrzuca zapis
    // z powodu nieznanej kolumny. Zamiast położyć całe zlecanie, zapisujemy bez
    // tych dwóch pól: worker zadziała jak dotąd (bez potwierdzania zdjęcia
    // danymi ze zgłoszenia), zamiast nie zadziałać wcale.
    const brakKolumny = error && (error.code === "PGRST204" || error.code === "42703");
    if (brakKolumny) {
      console.warn("[kolejka] brak kolumn manufacturer/scale — uruchom migracje-kolejka-producent-skala.sql");
      ({ error } = await supabase
        .from("lookup_queue")
        .insert({ name, series, mode, status: "pending" }));
    }

    // Wyścig dwóch kliknięć naraz: indeks odrzuci drugie — to nie jest błąd.
    if (error && error.code === "23505") return true;
    if (error) console.error("[kolejka] zapis nieudany:", error.message);
    return !error;
  } catch (e) {
    console.error("[kolejka] wyjątek:", e.message);
    return false;
  }
}

// Ostatnia bramka przed oddaniem odpowiedzi z pamięci podręcznej.
//
// Reguła całego endpointu brzmi: do formularza trafia albo GOTOWE zdjęcie
// w naszym Storage, albo pusto. Świeże wyniki przechodzą przez blok obróbki
// niżej, ale odpowiedź z pamięci wracała wcześniej — omijając go bokiem.
// Wpisy zapisane, zanim ta obróbka powstała, podawały więc surowy adres
// z cudzego serwera prosto do panelu: pole wyglądało na wypełnione, podgląd
// pokazywał obrazek, a do Gabloty szedł link, który właściciel może odciąć.
//
// Nie potrafimy tu potwierdzić zdjęcia drugim źródłem (nie mamy już wyników
// wyszukiwania), więc zamiast zgadywać — czyścimy pole i mówimy wprost,
// czego brakuje.
function oczyscZdjecie(dane) {
  const url = dane?.official_image_url;
  const zewnetrzny = typeof url === 'string' && url.startsWith('http') && !url.includes('supabase.co');
  if (!zewnetrzny) return dane;

  const oczyszczone = { ...dane, official_image_url: '' };
  if (oczyszczone._provenance) {
    oczyszczone._provenance = { ...oczyszczone._provenance };
    delete oczyszczone._provenance.official_image_url;
  }
  oczyszczone._imageError =
    'Zapamiętany wynik zawierał zdjęcie z cudzego serwera — nie wpuszczamy takich do Gabloty. Zleć szukanie jeszcze raz, żeby pobrać je do naszego magazynu.';
  return oczyszczone;
}

async function writeCache(key, mode, payload) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("lookup_cache")
      .upsert({ key, mode, data: payload, created_at: new Date().toISOString() });
  } catch {
    /* zapis do cache jest opcjonalny */
  }
}

// Wpis POSTACI: wyłącznie to, co jest prawdą o postaci, a nie o produkcie.
// Producenta, skali ani ceny tu NIE MA — te różnią się między figurkami tej
// samej postaci i to właśnie ich wspólne trzymanie robiło bałagan.
function danePostaci(dane) {
  const wpis = {};
  if (dane?.japanese_name) wpis.japanese_name = dane.japanese_name;
  if (dane?.japanese_series) wpis.japanese_series = dane.japanese_series;
  if (dane?.series) wpis.series = dane.series;
  return wpis;
}

// Uzupełnienie pól postaci z jej wspólnego wpisu.
//
// TU LEŻY ODPOWIEDŹ NA „ZNOWU NIE UZUPEŁNIA NAZW JAPOŃSKICH": nazwa japońska
// pobrana raz przy pierwszej figurce Super Sonico trafia od tego momentu do
// każdej kolejnej sama, nawet gdy dla TEGO producenta i TEJ skali nie mamy
// jeszcze nic. Nadpisujemy wyłącznie pustki — dane produktu są ważniejsze.
function dolozPostac(dane, postac) {
  if (!postac) return dane;
  const out = { ...dane };
  let cokolwiek = false;
  for (const pole of ["japanese_name", "japanese_series", "series"]) {
    if (!out[pole] && postac[pole]) {
      out[pole] = postac[pole];
      cokolwiek = true;
      out._provenance = { ...(out._provenance || {}), [pole]: "catalog" };
    }
  }
  if (cokolwiek) out._zPostaci = true;
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Jedno wyszukanie to kilkanaście zapytań do katalogów, kredyty pośredników
  // scrapingu i zapytanie do AI. Wołane wyłącznie z panelu moderatora.
  // Brama MUSI iść przed writeHead — po otwarciu strumienia SSE nie da się już
  // odesłać zwykłego 401.
  if (!(await wymagajModeratora(req, res))) return;

  const { name, series = '', manufacturer = '', scale = '', version = '', stream, deep, refresh } = req.query;
  if (!name) {
    return res.status(400).json({ error: 'Missing figure name' });
  }

  const mode = deep === '1' ? 'deep' : 'quick';

  console.log(`Rozpoczęto kaskadowe pobieranie danych dla: ${name}`);

  // Tryb strumieniowy (SSE): panel pokazuje NA ŻYWO, co właśnie sprawdzamy.
  // Postęp jest prawdziwy — każde zdarzenie to faktycznie zakończony krok.
  const streaming = stream === '1';
  if (streaming) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });
  }
  const send = (event, payload) => {
    if (!streaming) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
    } catch { /* klient się rozłączył */ }
  };

  try {
    // Najpierw własna baza — zero zapytań na zewnątrz, odpowiedź natychmiastowa.
    //
    // DWA KLUCZE, DWIE RÓŻNE RZECZY. Produkt rozróżnia producenta, skalę
    // i wersję — bez tego Kotobukiya 1/6 i Alter 1/8 dzieliły jeden wpis
    // i nadpisywały się nawzajem. Postać trzyma to, co dla wszystkich figurek
    // Super Sonico jest wspólne.
    const key = kluczProduktu(name, series, mode, { manufacturer, scale, version });
    const keyPostaci = kluczPostaci(name, series);

    // Wpis postaci czytamy ZAWSZE, także przy świeżym pobraniu. Nazwa japońska nie
    // robi się prawdziwsza od ponownego pobrania, a bez niej pole zostaje
    // puste — dokładnie ten objaw naprawiamy.
    const postac = await readCachePostaci(keyPostaci);

    if (refresh !== '1') {
      const cached = await readCache(key);
      if (cached) {
        console.log(`Cache HIT (${key}) — bez odpytywania źródeł.`);
        send('progress', { step: 'cache', label: 'Mam to już w naszej bazie', percent: 100 });
        const zPamieci = { ...dolozPostac(oczyscZdjecie(cached), postac), _fromCache: true };
        if (streaming) {
          send('result', zPamieci);
          return res.end();
        }
        return res.status(200).json(zPamieci);
      }
    }

    let figureData = {
      name: name,
      japanese_name: "",
      series: "",
      japanese_series: "",
      manufacturer: "",
      scale: "",
      original_price: "",
      official_image_url: ""
    };

    // KROK 1: twarde źródła (MFC, AmiAmi, HobbySearch, GSC) — równolegle.
    // To dane z katalogów producentów i encyklopedii, nie domysły modelu.
    console.log("-> Krok 1: twarde źródła (drabina)...");
    send('progress', { step: 'start', label: 'Przeszukuję katalogi figurek…', percent: 5 });

    const { data: sourced, sources, bootlegWarning, records } = await gatherFromSources(
      name,
      series,
      { deep: mode === 'deep', manufacturer, scale },
      (ev) => {
        // label  → ogólny opis (dla odwiedzających; nie zdradza doboru źródeł)
        // adminLabel → dokładna nazwa, tylko do panelu moderatora
        if (ev.type === 'source-check') {
          send('progress', {
            step: 'source',
            label: `Sprawdzam: ${ev.publicLabel}…`,
            adminLabel: `Sprawdzam: ${ev.label}…`,
            percent: 10,
          });
        } else if (ev.type === 'source-done') {
          // Katalogi zajmują 10–70% paska; reszta to zdjęcie i AI.
          const percent = 10 + Math.round((ev.done / ev.total) * 60);
          send('progress', {
            step: 'source',
            label: ev.found ? `✓ Potwierdzono: ${ev.publicLabel}` : `— Brak w: ${ev.publicLabel}`,
            adminLabel: ev.found ? `✓ Znaleziono w: ${ev.label}` : `— Brak w: ${ev.label}`,
            percent,
          });
        }
      }
    );
    console.log("Źródła:", JSON.stringify(sources));

    // Pochodzenie KAŻDEGO pola z osobna: 'catalog' = potwierdzone przez katalog,
    // 'ai' = domysł modelu. Moderator musi widzieć różnicę, bo pole wypełnione
    // przez AI wygląda tak samo jak zweryfikowane, a bywa nieprawdziwe.
    const provenance = {};

    Object.keys(figureData).forEach(k => {
      if (!figureData[k] && sourced[k]) {
        figureData[k] = sourced[k];
        provenance[k] = 'catalog';
      }
    });
    // Nazwa z katalogu bywa pełniejsza niż to, co wpisał zgłaszający.
    if (sourced.name) {
      figureData.name = sourced.name;
      provenance.name = 'catalog';
    }

    // Cena rynku wtórnego prosto z agregatora ofert. Do tej pory to pole
    // zmyślał model („~22 500 JPY" dla figurki wartej 52 980) — a wartość
    // rynkowa to jedna z rzeczy, po które kolekcjoner tu przychodzi.
    if (sourced.market_value_average) {
      figureData.marketValueAverage = sourced.market_value_average;
      provenance.market_value = 'catalog';
    }

    figureData._sources = sources;

    // Encyklopedia (MFC) to jedyne źródło japońskich nazw i danych kanonicznych.
    // Gdy ona zawiedzie, reszta niewiele daje — nawet jeśli katalog producenta
    // coś zwrócił. Dlatego zlecenie dla komputera admina wysyłamy już wtedy,
    // a nie dopiero gdy padną wszystkie źródła.
    const encyclopediaMissing = sources.mfc !== 'ok';
    if (encyclopediaMissing && !hasLocalBrowser()) {
      const queued = await enqueueLookup(name, series, mode, manufacturer, scale, version);
      if (queued) {
        figureData._queued = 'Zlecono pobranie danych — FigureFame Studio na Twoim komputerze pobierze je z katalogów. Kliknij ponownie za chwilę.';
        send('progress', { step: 'queue', label: 'Zlecono pobranie lokalne…', percent: 72 });
      }

      // ⚠️ Chmura nie dosięgnie MFC — Cloudflare przepuszcza tylko prawdziwą
      // przeglądarkę. Jeśli worker kiedyś przyniósł dane, są one Z KATALOGU,
      // a więc twardsze od wszystkiego, co dopisze tu AI. Zwracamy je zamiast
      // zgadywanki — także przy świeżym pobraniu.
      //
      // Bez tego TOP działał wprost przeciwnie do swojej nazwy: pomijał pamięć
      // podręczną (czyli dorobek workera), pytał chmurę, dostawał zero
      // z katalogów i pokazywał moderatorowi domysł AI — innego producenta
      // i inną skalę niż w rzeczywistości. Im mocniej klikałeś TOP, tym gorsze
      // dane widziałeś. Zlecenie dla workera i tak zostało złożone wyżej,
      // więc następne kliknięcie pokaże świeży wynik.
      const zWorkera = await readCache(key);
      if (zWorkera) {
        const wynik = { ...dolozPostac(oczyscZdjecie(zWorkera), postac), _fromCache: true };
        if (figureData._queued) wynik._queued = figureData._queued;
        console.log(`Chmura bez MFC — oddaję dane workera z pamięci (${key}).`);
        send('progress', { step: 'cache', label: 'Mam dane z Twojego komputera', percent: 100 });
        if (streaming) {
          send('result', wynik);
          return res.end();
        }
        return res.status(200).json(wynik);
      }
    }

    if (bootlegWarning) {
      figureData._bootlegWarning = "MyFigureCollection ostrzega: istnieje podrobiona wersja tej figurki.";
    }

    // Czy po twardych źródłach nadal są braki?
    const stillHasMissingFields = Object.entries(figureData)
      .filter(([k]) => !k.startsWith('_'))
      .some(([, val]) => !val);

    // Japońskie nazwy zapamiętujemy PRZED krokiem AI. Modele notorycznie je
    // zmyślają — potrafią zwrócić ciągi znaków, które wyglądają po japońsku,
    // ale nic nie znaczą (np. „エトヴァインサラバースバース" zamiast 泉こなた).
    // Takie pole gorzej niż puste: wygląda na zweryfikowane, a jest fałszem.
    const japaneseFromCatalog = {
      japanese_name: figureData.japanese_name,
      japanese_series: figureData.japanese_series,
    };

    // KROK 2: AI — TYLKO na braki po twardych źródłach. Dane z katalogów mają
    // pierwszeństwo; model nie ma prawa ich nadpisać (patrz scalanie niżej).
    if (stillHasMissingFields) {
      console.log("-> Krok 2: AI (uzupełnianie braków)...");
      send('progress', { step: 'ai', label: 'Uzupełniam braki przez AI (z wyszukiwarką)…', percent: 75 });
      try {
        // Do promptu idą wyłącznie dane figurki — bez kluczy technicznych (_sources itp.).
        const known = Object.fromEntries(
          Object.entries(figureData).filter(([k]) => !k.startsWith('_'))
        );
        const prompt = `Jesteś ekspertem ds. figurek anime. Uzupełnij brakujące dane (jeśli możliwe, korzystając z wyszukiwarki Google) dla figurki anime z poniższych danych: ${JSON.stringify(known)}.
        Wyszukaj również po japońskiej nazwie aby mieć pewność.
        Zwróć wynik TYLKO jako czysty obiekt JSON (bez znaczników markdown typu \`\`\`json i bez dodatkowego tekstu), z ewentualnie poprawionymi lub uzupełnionymi kluczami:
        - name (angielska nazwa postaci i wersji)
        - japanese_name (jeśli puste, znajdź japońskie znaki)
        - series (pełna nazwa serii anime/mangi)
        - manufacturer (np. Good Smile Company, Kotobukiya)
        - scale (jeśli dotyczy)
        - original_price (np. 14800 JPY)
        - official_image_url (bezpośredni link do największego oficjalnego zdjęcia produktu, absolutnie kluczowe)
        - additional_info (krótki, 2-zdaniowy zarys kim jest ta postać lub z czego słynie figurka)
        - market_value_average (jaka jest jej średnia wartość rynkowa na rynku wtórnym obecnie. ZAWSZE podawaj w JPY, a w nawiasie w przybliżeniu w USD i PLN, schemat: "~ 22 500 JPY (ok. 150 USD / 600 PLN)")
        - where_to_search (gdzie obecnie najlepiej szukać tej figurki żeby ją kupić, wymień ze 3 serwisy)
        - strategy (czy radzisz kupić teraz bo drożeje, czy poczekać na re-release itp.)
        Klucze muszą być dokładnie w języku angielskim jak wyżej. Nie pomijaj żadnego klucza. Jeśli nie znalazłeś info - zostaw wartość jako pusty string.`;

        // groundQuery → realne wyniki z sieci (Tavily) doklejone do promptu.
        // Bez tego modele bez własnego wyszukiwania zmyślają adresy zdjęć.
        const { data: aiData, provider } = await callAIJson(prompt, {
          groundQuery: `${name} anime figure official product photo manufacturer price`,
        });
        console.log(`Dane AI uzupełnione przez providera: ${provider}`);
        // Uwaga: nie dopinamy providera do figureData — trafiłby do formularza
        // edycji i przy zapisie próbował wejść jako nieistniejąca kolumna.

        Object.keys(aiData).forEach(k => {
          if (k === 'market_value_average') {
            // Cena z katalogu jest twarda — model jej nie rusza.
            if (!figureData.marketValueAverage && aiData[k]) {
              figureData.marketValueAverage = aiData[k];
              provenance.market_value = 'ai';
            }
          } else if (k === 'additional_info') {
            figureData.additionalInfo = aiData[k];
            if (aiData[k]) provenance.additional_info = 'ai';
          } else if (k === 'where_to_search') {
            figureData.whereToSearch = aiData[k];
            if (aiData[k]) provenance.where_to_search = 'ai';
          } else if (k === 'strategy') {
            figureData.strategy = aiData[k];
            if (aiData[k]) provenance.strategy = 'ai';
          } else if (!figureData[k] && aiData[k]) {
            figureData[k] = aiData[k];
            provenance[k] = 'ai'; // domysł modelu — do weryfikacji
          }
        });
      } catch (aiError) {
        console.error("Błąd AI podczas dopełniania:", aiError.message);
        figureData._aiError = aiError.message;
      }
    }

    // Japońskie nazwy przyjmujemy WYŁĄCZNIE z katalogów. Cokolwiek dopisała tu
    // AI, zostaje skasowane: puste pole uczciwie mówi „nie wiemy", a zmyślone
    // znaki wyglądają na zweryfikowane i trafiłyby do bazy jako fałsz.
    figureData.japanese_name = japaneseFromCatalog.japanese_name || '';
    figureData.japanese_series = japaneseFromCatalog.japanese_series || '';
    if (!figureData.japanese_name) delete provenance.japanese_name;
    if (!figureData.japanese_series) delete provenance.japanese_series;
    if (!figureData.japanese_name && !figureData._queued) {
      figureData._japaneseMissing =
        'Japońskiej nazwy nie potwierdził żaden katalog — pole zostawiono puste zamiast wpisywać domysł AI.';
    }

    // Zdjęcie. Zasada: do formularza trafia albo GOTOWE zdjęcie w naszym
    // Storage, albo pusto + _imageError. Nigdy „surowy" adres z zewnątrz — bo
    // pole wyglądałoby na wypełnione, a podgląd i Studio dostawałyby link,
    // który cudzy serwer może odciąć.
    const rawImageUrl = figureData.official_image_url;

    if (rawImageUrl && rawImageUrl.startsWith('http') && !rawImageUrl.includes('supabase.co')) {
      // Zanim cokolwiek pobierzemy: czy ten sam produkt potwierdza DRUGIE
      // źródło? Pojedynczy katalog potrafi trafić w inną wersję tej samej
      // postaci — i wtedy do Gabloty weszłoby ładne zdjęcie nie tej figurki.
      const check = crossCheckImage(records || [], { manufacturer, scale });
      const fromCatalog = provenance.official_image_url === 'catalog';

      if (!check.agreed) {
        figureData.official_image_url = '';
        delete provenance.official_image_url;
        figureData._imageError = fromCatalog
          ? 'Zdjęcie podało tylko jedno źródło — za mało, żeby mieć pewność, że to ta wersja figurki. Dodaj je ręcznie albo zleć szukanie jeszcze raz.'
          : 'Adres zdjęcia pochodzi wyłącznie od AI i nie potwierdza go żaden katalog — dodaj zdjęcie ręcznie.';
      } else {
        console.log(`Zdjęcie potwierdzone (${check.reason}) przez: ${check.by.join(' + ')}`);
        send('progress', { step: 'image', label: 'Pobieram i zapisuję zdjęcie…', percent: 88 });

        const hosted = await rehostImage(check.imageUrl, name);
        if (hosted) {
          figureData.official_image_url = hosted;
          provenance.official_image_url = 'catalog';
          console.log(`Zdjęcie zapisane: ${hosted}`);
        } else {
          figureData.official_image_url = '';
          delete provenance.official_image_url;
          figureData._imageError = 'Nie udało się pobrać zdjęcia ze znalezionego adresu — dodaj je ręcznie.';
        }
      }
    }

    figureData._provenance = provenance;

    // Zapisujemy tylko wyniki, za którymi stoi PRACA — nie echo zgłoszenia.
    //
    // ⚠️ Wcześniej wystarczył tu sam `manufacturer`. To był błąd, bo producent
    // przychodzi ZE ZGŁOSZENIA, a nie z badania — jest w danych, zanim
    // cokolwiek odpytamy. Skutek: wynik, w którym katalogi milczały, AI
    // zwróciła puste stringi, a zdjęcia nie było, i tak przechodził jako
    // „sensowny". Potem każde kolejne wejście dostawało Cache HIT i tę samą
    // pustkę — natychmiast, bez ponowienia, w nieskończoność. Objaw dla
    // moderatora: „tyle źródeł, a wszystkie pola puste".
    //
    // Warunek musi więc pytać o DOWÓD pracy: czy jakieś źródło odpowiedziało,
    // albo czy mamy treść, której zgłoszenie nie zawierało.
    const cokolwiekOdpowiedzialo = Object.values(sources).some((s) => s === 'ok');
    const mamyWlasnaTresc = Boolean(
      figureData.official_image_url ||
      figureData.japanese_name ||
      figureData.additionalInfo ||
      figureData.whereToSearch
    );
    if (cokolwiekOdpowiedzialo || mamyWlasnaTresc) {
      await writeCache(key, mode, figureData);

      // Osobno to, co należy do POSTACI. Dzięki temu następna figurka tej samej
      // postaci — inny producent, inna skala — dostanie japońską nazwę bez
      // jednego zapytania na zewnątrz. Zapisujemy tylko gdy jest co zapisać:
      // pusty wpis postaci zasłaniałby późniejszy dobry.
      const postacDoZapisu = danePostaci(figureData);
      if (postacDoZapisu.japanese_name || postacDoZapisu.japanese_series) {
        await writeCache(keyPostaci, mode, postacDoZapisu);
      }
    } else {
      console.log(`Cache POMINIĘTY (${key}) — zero źródeł i zero treści, nie utrwalamy pustki.`);
    }

    // Gdyby katalogi nie podały nazwy japońskiej, a mamy ją z poprzedniej
    // figurki tej postaci — dołóż ją do odpowiedzi. Po zapisie, żeby nie
    // utrwalać w produkcie tego, co i tak leży na poziomie postaci.
    figureData = dolozPostac(figureData, postac);

    if (streaming) {
      send('progress', { step: 'done', label: 'Gotowe', percent: 100 });
      send('result', figureData);
      return res.end();
    }
    res.status(200).json(figureData);
  } catch (error) {
    console.error("Błąd głównej funkcji API:", error);
    if (streaming) {
      send('error', { error: error.message });
      return res.end();
    }
    res.status(500).json({ error: error.message });
  }
}
