import sharp from "sharp";
import * as cheerio from "cheerio";
import { callAIJson } from "../server-lib/aiClient.js";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { gatherFromSources } from "../server-lib/figureSources.js";
import { cacheKey, hasLocalBrowser } from "../server-lib/lookupShared.js";

const PROXY_URL = process.env.PROXY_URL; // np. "https://api.scraperapi.com?api_key=TWÓJ_KLUCZ&url="

// Helper do odpytywania stron z ominięciem Cloudflare jeśli ustalone jest PROXY
async function fetchWithProxy(url, options = {}) {
  if (PROXY_URL) {
    const fullUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    console.log("Fetching via proxy:", fullUrl);
    return fetch(fullUrl, options);
  }
  return fetch(url, options);
}

// ---------------------------------------------------------------------------
// Pobranie zdjęcia ze znalezionego adresu. Zwraca Buffer albo null.
// AI bywa niedokładne: potrafi podać link do STRONY produktu zamiast pliku,
// albo adres, który w ogóle nie istnieje (404). Dlatego:
//   1) sprawdzamy content-type — tylko image/* uznajemy za zdjęcie,
//   2) gdy dostaliśmy HTML, wyciągamy og:image / itemprop=image i pobieramy je,
//   3) przy niepowodzeniu zwracamy null — dzięki temu martwy URL NIE trafi
//      do formularza i nie udaje wypełnionego pola.
// ---------------------------------------------------------------------------
async function downloadImage(url, depth = 0) {
  if (!url || depth > 1) return null;

  const res = await fetchWithProxy(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;

  const type = (res.headers.get('content-type') || '').toLowerCase();
  if (type.startsWith('image/')) {
    return Buffer.from(await res.arrayBuffer());
  }

  // To strona, nie plik — poszukaj na niej zdjęcia produktu i pobierz je.
  if (type.includes('html')) {
    const $ = cheerio.load(await res.text());
    const found =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('img[itemprop="image"]').attr('src');
    if (!found) return null;
    const abs = found.startsWith('http') ? found : new URL(found, url).href;
    return await downloadImage(abs, depth + 1);
  }

  return null;
}

// Pamięć podręczna wyszukiwań — chroni mały limit pośrednika (patrz migracje-cache.sql).
const CACHE_DAYS = 30;

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
    return data.data;
  } catch {
    return null; // brak tabeli/uprawnień nie może blokować wyszukiwania
  }
}

// Zlecenie dla lokalnego workera: gdy serwer nie ma jak pobrać danych
// (Cloudflare przepuszcza tylko prawdziwą przeglądarkę), zostawiamy zadanie
// w bazie — komputer admina je odbierze. Ten sam układ co kolejka filmów.
async function enqueueLookup(name, series, mode) {
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

    const { error } = await supabase
      .from("lookup_queue")
      .insert({ name, series, mode, status: "pending" });

    // Wyścig dwóch kliknięć naraz: indeks odrzuci drugie — to nie jest błąd.
    if (error && error.code === "23505") return true;
    if (error) console.error("[kolejka] zapis nieudany:", error.message);
    return !error;
  } catch (e) {
    console.error("[kolejka] wyjątek:", e.message);
    return false;
  }
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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, series = '', stream, deep, refresh } = req.query;
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
    const key = cacheKey(name, series, mode);
    if (refresh !== '1') {
      const cached = await readCache(key);
      if (cached) {
        console.log(`Cache HIT (${key}) — bez odpytywania źródeł.`);
        send('progress', { step: 'cache', label: 'Mam to już w naszej bazie', percent: 100 });
        if (streaming) {
          send('result', { ...cached, _fromCache: true });
          return res.end();
        }
        return res.status(200).json({ ...cached, _fromCache: true });
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

    const { data: sourced, sources, bootlegWarning } = await gatherFromSources(
      name,
      series,
      { deep: mode === 'deep' },
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

    figureData._sources = sources;

    // Encyklopedia (MFC) to jedyne źródło japońskich nazw i danych kanonicznych.
    // Gdy ona zawiedzie, reszta niewiele daje — nawet jeśli katalog producenta
    // coś zwrócił. Dlatego zlecenie dla komputera admina wysyłamy już wtedy,
    // a nie dopiero gdy padną wszystkie źródła.
    const encyclopediaMissing = sources.mfc !== 'ok';
    if (encyclopediaMissing && !hasLocalBrowser()) {
      const queued = await enqueueLookup(name, series, mode);
      if (queued) {
        figureData._queued = 'Zlecono pobranie danych — FigureFame Studio na Twoim komputerze pobierze je z katalogów. Kliknij ponownie za chwilę.';
        send('progress', { step: 'queue', label: 'Zlecono pobranie lokalne…', percent: 72 });
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
            figureData.marketValueAverage = aiData[k];
            if (aiData[k]) provenance.market_value = 'ai';
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

    // Przetwarzanie i konwersja obrazka WebP.
    // Zasada: do formularza trafia albo GOTOWE zdjęcie w naszym Storage, albo
    // pusto + _imageError. Nigdy „surowy" adres od AI — bo pole wyglądałoby na
    // wypełnione, a podgląd i Studio zdjęcia dostawałyby martwy link.
    const rawImageUrl = figureData.official_image_url;

    if (rawImageUrl && rawImageUrl.startsWith('http') && !rawImageUrl.includes('supabase.co')) {
      console.log(`Pobieranie obrazka z URL: ${rawImageUrl}`);
      send('progress', { step: 'image', label: 'Pobieram i konwertuję zdjęcie…', percent: 88 });

      try {
        const buffer = await downloadImage(rawImageUrl);
        if (!buffer) throw new Error('adres nie prowadzi do zdjęcia');

        console.log('Konwersja na WebP...');
        const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

        const filename = `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.webp`;
        const supabase = getSupabaseAdmin();

        const { error: uploadError } = await supabase
          .storage
          .from('figure-images')
          .upload(filename, webpBuffer, {
            contentType: 'image/webp',
            upsert: true
          });
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('figure-images').getPublicUrl(filename);
        figureData.official_image_url = publicUrlData.publicUrl;
        console.log(`Zdjęcie zapisane: ${figureData.official_image_url}`);
      } catch (imgError) {
        console.error('Nie udało się pobrać zdjęcia:', imgError.message);
      }

      // Nic nie podmieniło adresu → pobranie/zapis padły. Czyścimy pole.
      if (figureData.official_image_url === rawImageUrl) {
        figureData.official_image_url = '';
        figureData._imageError = 'Nie udało się pobrać zdjęcia ze znalezionego adresu — dodaj je ręcznie.';
        delete provenance.official_image_url;
      }
    }

    figureData._provenance = provenance;

    // Zapisujemy tylko sensowne wyniki — inaczej utrwalilibyśmy pustą porażkę.
    if (figureData.official_image_url || figureData.japanese_name || figureData.manufacturer) {
      await writeCache(key, mode, figureData);
    }

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
