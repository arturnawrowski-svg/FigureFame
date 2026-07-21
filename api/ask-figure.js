import { callAI } from "./lib/aiClient.js";

// ============================================================================
// ask-figure (flagowy wyróżnik z PDF: „Ask AI about this figure")
// ----------------------------------------------------------------------------
// Kontekstowy asystent kolekcjonera: bierze dane figurki + pytanie użytkownika,
// odpowiada po polsku, rzeczowo. Korzysta z darmowej warstwy multi-AI.
// Bez bazy, bez zapisów — czysty Q&A.
// ============================================================================

const MAX_Q = 500;

function buildPrompt(figure, question, history) {
  const ctx = {
    name: figure?.name,
    japanese_name: figure?.japanese_name || figure?.japaneseName,
    series: figure?.series,
    manufacturer: figure?.manufacturer,
    scale: figure?.scale,
    type: figure?.type,
    original_price: figure?.original_price || figure?.originalPrice,
    market_value: figure?.market_value || figure?.marketValue,
    additional_info: figure?.additional_info || figure?.additionalInfo,
    where_to_search: figure?.where_to_search || figure?.whereToSearch,
    strategy: figure?.strategy,
  };

  const hist = Array.isArray(history) && history.length
    ? "\nWcześniejsza rozmowa:\n" + history.slice(-6).map(m => `${m.role === 'user' ? 'Użytkownik' : 'Asystent'}: ${m.content}`).join("\n")
    : "";

  return `Jesteś asystentem kolekcjonera japońskich figurek na portalu FigureFame.
Odpowiadasz PO POLSKU, rzeczowo i zwięźle (maks. kilka zdań, w razie potrzeby lista).
Trzymaj się tematu figurek, kolekcjonerstwa, cen, autentyczności (bootlegi), zakupu i pielęgnacji.

Dane figurki (kontekst):
${JSON.stringify(ctx, null, 2)}

Zasady:
- Jeśli pytają o autentyczność/bootlegi — podaj praktyczne sygnały ostrzegawcze (cena za niska, podejrzany sprzedawca, jakość malowania, pudełko, brak numeru serii).
- Jeśli pytają o cenę rynkową — możesz odnieść się do danych w kontekście; NIE zmyślaj konkretnych aktualnych ofert aukcyjnych. Gdy nie wiesz, powiedz wprost.
- Jeśli pytanie wykracza poza temat figurek — grzecznie skieruj z powrotem na temat.
${hist}

Pytanie użytkownika: ${question}

Odpowiedź:`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    let body = req.body;
    if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
    else if (typeof req.body === "string") body = JSON.parse(req.body);

    const { figure, question, history } = body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Brak pytania" });
    }
    const q = String(question).slice(0, MAX_Q);

    const { text, provider } = await callAI(buildPrompt(figure || {}, q, history));
    return res.status(200).json({ answer: text.trim(), provider });
  } catch (err) {
    console.error("ask-figure error:", err);
    return res.status(500).json({ error: err.message });
  }
}
