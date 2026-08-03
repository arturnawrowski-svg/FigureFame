import { callAI } from "../server-lib/aiClient.js";
import { limitIP } from "../server-lib/limitIP.js";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";

// ============================================================================
// ask-catalog — asystent znający CAŁY zatwierdzony katalog.
// ----------------------------------------------------------------------------
// Różnica wobec ask-figure: tamten dostaje jedną figurkę w treści zapytania,
// ten sam ją sobie znajduje. Dzięki temu czat da się otworzyć z dowolnego
// miejsca serwisu, także z Gabloty, gdzie żadna figurka nie jest „bieżąca".
//
// ⚠️ FILTR `status = 'APPROVED'` TO WYMÓG BEZPIECZEŃSTWA, NIE OPTYMALIZACJA.
// W bazie leżą też zgłoszenia PENDING (czekające na moderację) i ARCHIVED.
// Bez tego filtra asystent opowiadałby o niezweryfikowanych zgłoszeniach —
// czyli ujawniał treść, której Gablota świadomie nie pokazuje. Ten sam warunek
// stoi w Showcase.jsx; jeśli kiedyś się rozejdą, publiczne będzie to, co
// pokazuje SŁABSZY z nich.
// ============================================================================

const MAX_Q = 500;
const ILE_FIGUREK = 8;   // ile rekordów wchodzi do promptu

// Kolumny wybrane wprost. Gdyby filtr statusu kiedyś zawiódł, przez `select('*')`
// wyciekłyby też `submitted_by` i inne pola techniczne — tu nie ma czego wycieknąć.
// ⚠️ Nazwy muszą zgadzać się z tabelą CO DO ZNAKU. Jedna zmyślona kolumna
// wywala CAŁY select, PostgREST zwraca błąd zamiast danych, a asystent mówi
// „nie mam nic w bazie" — wygląda to na głupotę modelu, a jest literówką.
// Kolumna nazywa się `market_value`, nie `market_value_average` (ta druga to
// nazwa pola w lookup_cache, co łatwo pomylić).
const KOLUMNY =
  "slug, name, japanese_name, series, manufacturer, scale, type, " +
  "original_price, market_value, additional_info, where_to_search, strategy, bootleg_risk";

// Słowa, które nic nie wnoszą do wyszukiwania. Krótka lista — nie chodzi
// o lingwistykę, tylko o to, żeby „czy", „jest", „mnie" nie trafiały do LIKE.
const PUSTE = new Set([
  "jak", "czy", "gdzie", "kiedy", "ile", "jaka", "jaki", "jakie", "co", "kto",
  "jest", "sie", "się", "nie", "tak", "dla", "oraz", "albo", "lub", "ale",
  "mnie", "mam", "masz", "mozna", "można", "warto", "figurka", "figurki",
  "figurke", "figurkę", "figurek", "kupic", "kupić", "cena", "ceny",
]);

function slowaKluczowe(pytanie) {
  return [...new Set(
    String(pytanie)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !PUSTE.has(w))
  )].slice(0, 4);
}

// Wybór figurek do promptu. Całego katalogu wrzucić się nie da — przy 500
// pozycjach to dziesiątki tysięcy tokenów na KAŻDE pytanie, a darmowe limity
// providerów skończyłyby się po kilku rozmowach.
async function znajdzFigurki(supabase, pytanie, figureId) {
  const wybrane = [];

  // Wejście z karty figurki: ta figurka ma pierwszeństwo, bo rozmowa
  // najpewniej dotyczy właśnie jej. Też tylko gdy APPROVED.
  // ⚠️ Błędy MUSZĄ trafiać do logu. Pierwsza wersja pisała `const { data }`
  // i połykała `error` — literówka w nazwie kolumny dawała wtedy zero wyników
  // bez śladu w logach, a jedynym objawem był asystent twierdzący, że baza
  // jest pusta. Godzina szukania nie tam, gdzie trzeba.
  const zapytaj = async (opis, budowniczy) => {
    const { data, error } = await budowniczy;
    if (error) console.error(`[ask-catalog] ${opis}: ${error.code} ${error.message}`);
    return data || [];
  };

  if (figureId) {
    const [f] = await zapytaj("figurka z karty", supabase
      .from("figures").select(KOLUMNY)
      .eq("id", figureId).eq("status", "APPROVED").limit(1));
    if (f) wybrane.push(f);
  }

  const slowa = slowaKluczowe(pytanie);
  if (slowa.length) {
    const warunek = slowa
      .flatMap((s) => [`name.ilike.%${s}%`, `series.ilike.%${s}%`, `manufacturer.ilike.%${s}%`])
      .join(",");
    const trafione = await zapytaj("szukanie po słowach", supabase
      .from("figures").select(KOLUMNY)
      .eq("status", "APPROVED").or(warunek).limit(ILE_FIGUREK));
    for (const f of trafione) {
      if (!wybrane.some((x) => x.slug === f.slug)) wybrane.push(f);
    }
  }

  // Nic nie pasuje — dajemy przekrój katalogu, żeby asystent mógł uczciwie
  // powiedzieć, co w ogóle mamy, zamiast milczeć albo zmyślać.
  if (wybrane.length === 0) {
    const przekroj = await zapytaj("przekrój katalogu", supabase
      .from("figures").select(KOLUMNY)
      .eq("status", "APPROVED")
      .order("created_at", { ascending: false })
      .limit(ILE_FIGUREK));
    return { figurki: przekroj, trafienie: false };
  }

  return { figurki: wybrane.slice(0, ILE_FIGUREK), trafienie: true };
}

function budujPrompt(figurki, trafienie, pytanie, historia) {
  const hist = Array.isArray(historia) && historia.length
    ? "\nWcześniejsza rozmowa:\n" + historia.slice(-6)
        .map((m) => `${m.role === "user" ? "Użytkownik" : "Asystent"}: ${m.content}`).join("\n")
    : "";

  const katalog = figurki.length
    ? JSON.stringify(figurki, null, 2)
    : "(katalog jest na razie pusty)";

  return `Jesteś asystentem kolekcjonera na portalu FigureFame — polskiej bazie japońskich
figurek kolekcjonerskich. Odpowiadasz PO POLSKU, rzeczowo i zwięźle.

Poniżej wycinek NASZEGO katalogu, dobrany pod to pytanie. To jedyne figurki,
o których wiesz na pewno:
${katalog}

${trafienie
  ? "Te pozycje pasują do pytania."
  : "UWAGA: żadna figurka w naszym katalogu nie pasuje do pytania. Powyżej jest tylko przekrój tego, co mamy."}

Zasady — trzymaj się ich bezwzględnie:
- Mówiąc o figurce Z KATALOGU, opieraj się wyłącznie na danych powyżej.
- Jeśli pytają o figurkę, której NIE MA powyżej, powiedz wprost: „Nie mam jej
  jeszcze w bazie FigureFame". Możesz potem dodać ogólną wiedzę, ale wyraźnie
  zaznacz, że to wiedza ogólna, a nie dane z naszego katalogu.
- NIE ZMYŚLAJ pozycji, cen ani wersji, których nie ma w danych powyżej.
- Przy pytaniach o autentyczność podaj praktyczne sygnały ostrzegawcze:
  za niska cena, podejrzany sprzedawca, jakość malowania i szwów, pudełko,
  brak numeru serii, zdjęcia z cudzych aukcji.
- Przy cenach możesz odnieść się do danych z katalogu; nie wymyślaj aktualnych
  ofert aukcyjnych.
- Pytanie spoza tematu figurek — grzecznie wróć do tematu.
${hist}

Pytanie użytkownika: ${pytanie}

Odpowiedź:`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  // Endpoint jest PUBLICZNY — czat ma działać dla każdego odwiedzającego,
  // więc nie da się go zamknąć logowaniem. Zamiast tego próg na IP, bo każde
  // pytanie zjada nasz darmowy limit u providera AI.
  if (!limitIP(req, res, { naMinute: 10 })) return;

  try {
    let body = req.body;
    if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
    else if (typeof req.body === "string") body = JSON.parse(req.body);

    const { question, history, figureId } = body || {};
    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "Brak pytania" });
    }
    const q = String(question).slice(0, MAX_Q);

    const supabase = getSupabaseAdmin();
    const { figurki, trafienie } = await znajdzFigurki(supabase, q, figureId);

    const { text, provider } = await callAI(budujPrompt(figurki, trafienie, q, history));
    return res.status(200).json({
      answer: text.trim(),
      provider,
      // Do interfejsu: ile pozycji katalogu stoi za tą odpowiedzią.
      zrodel: figurki.length,
    });
  } catch (err) {
    console.error("ask-catalog error:", err);
    return res.status(500).json({ error: err.message });
  }
}
