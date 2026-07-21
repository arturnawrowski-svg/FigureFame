// ============================================================================
// FigureFame — warstwa multi-AI (Etap 1 z planu plan_claude_210720026.md)
// ----------------------------------------------------------------------------
// Jedna abstrakcja dla wielu DARMOWYCH modeli z łańcuchem fallbacków.
// Zasada FREE-FIRST: darmowe tiery + omijanie limitów przez zmianę providera,
// a nie przez płatny plan. Zero nowych zależności — czysty fetch.
//
// Kolejność prób (konfigurowalna przez env AI_PROVIDER_ORDER):
//   1. gemini    — natywny REST + grounding Google Search (najlepsza faktyczność)
//   2. groq      — najszybszy (LPU), Llama 3.1 8B
//   3. cerebras  — bardzo szybki, Llama 3.3 70B
//   4. openrouter— agregator, jeden klucz → wiele darmowych modeli
//
// Provider jest AKTYWNY tylko, gdy ma ustawiony klucz w env.
// ============================================================================

// UWAGA: env czytamy w RUNTIME (wewnątrz funkcji), nie na poziomie modułu —
// przy imporcie w vite.config dotenv jeszcze nie załadował .env.local.
function env() {
  return {
    GEMINI_KEY: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY,
    GEMINI_KEY_2: process.env.VITE_GEMINI_API_KEY_2,
    GROQ_KEY: process.env.GROQ_API_KEY,
    CEREBRAS_KEY: process.env.CEREBRAS_API_KEY,
    OPENROUTER_KEY: process.env.OPENROUTER_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-flash-latest",
    GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    CEREBRAS_MODEL: process.env.CEREBRAS_MODEL || "gpt-oss-120b",
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free",
  };
}

// Domyślna kolejność: najpierw zweryfikowane działające (Groq, OpenRouter),
// potem Cerebras (dziś 402 — konto bez kredytów) i Gemini (stary klucz wyciekł).
// Aby przywrócić grounding jako pierwszy (po nowym kluczu Gemini):
//   AI_PROVIDER_ORDER=gemini,groq,openrouter,cerebras
const DEFAULT_ORDER = ["groq", "openrouter", "cerebras", "gemini"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Wywołanie OpenAI-compatible /chat/completions (Groq, Cerebras, OpenRouter)
// ---------------------------------------------------------------------------
async function callOpenAICompatible({ baseURL, apiKey, model, prompt, extraHeaders = {} }) {
  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Pusta odpowiedź modelu");
  return content;
}

// ---------------------------------------------------------------------------
// Gemini natywny REST + grounding (Google Search). Obsługuje klucz zapasowy.
// ---------------------------------------------------------------------------
async function callGemini(prompt) {
  const { GEMINI_KEY, GEMINI_KEY_2, GEMINI_MODEL } = env();
  const keys = [GEMINI_KEY, GEMINI_KEY_2].filter(Boolean);
  let lastErr;
  for (const key of keys) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }], // grounding — realne wyszukiwanie zamiast halucynacji
          generationConfig: { temperature: 0.4 },
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`Gemini HTTP ${res.status}: ${text.slice(0, 300)}`);
        err.status = res.status;
        throw err;
      }
      const data = await res.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const content = parts.map((p) => p.text || "").join("").trim();
      if (!content) throw new Error("Pusta odpowiedź Gemini");
      return content;
    } catch (e) {
      lastErr = e;
      // klucz wyczerpany/nieprawidłowy → spróbuj kolejnego klucza Gemini
    }
  }
  throw lastErr || new Error("Brak klucza Gemini");
}

// ---------------------------------------------------------------------------
// Definicje providerów (aktywne tylko z kluczem)
// ---------------------------------------------------------------------------
function buildProviders() {
  const e = env();
  return {
    gemini: e.GEMINI_KEY
      ? { name: "gemini", call: (prompt) => callGemini(prompt) }
      : null,
    groq: e.GROQ_KEY
      ? {
          name: "groq",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://api.groq.com/openai/v1",
              apiKey: e.GROQ_KEY,
              model: e.GROQ_MODEL,
              prompt,
            }),
        }
      : null,
    cerebras: e.CEREBRAS_KEY
      ? {
          name: "cerebras",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://api.cerebras.ai/v1",
              apiKey: e.CEREBRAS_KEY,
              model: e.CEREBRAS_MODEL,
              prompt,
            }),
        }
      : null,
    openrouter: e.OPENROUTER_KEY
      ? {
          name: "openrouter",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://openrouter.ai/api/v1",
              apiKey: e.OPENROUTER_KEY,
              model: e.OPENROUTER_MODEL,
              prompt,
              extraHeaders: {
                "HTTP-Referer": "https://figure-fame.vercel.app",
                "X-Title": "FigureFame",
              },
            }),
        }
      : null,
  };
}

function getOrder() {
  const raw = process.env.AI_PROVIDER_ORDER;
  if (!raw) return DEFAULT_ORDER;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// PUBLICZNE: callAI — próbuje providerów po kolei, zwraca pierwszą udaną odpowiedź.
// Zwraca { text, provider }. Rzuca, gdy wszyscy zawiodą.
// ---------------------------------------------------------------------------
export async function callAI(prompt) {
  const providers = buildProviders();
  const order = getOrder();
  const active = order.map((k) => providers[k]).filter(Boolean);

  if (active.length === 0) {
    throw new Error(
      "Brak skonfigurowanych providerów AI — ustaw GROQ_API_KEY / GEMINI_API_KEY / CEREBRAS_API_KEY / OPENROUTER_API_KEY"
    );
  }

  const errors = [];
  for (const provider of active) {
    try {
      const text = await provider.call(prompt);
      return { text, provider: provider.name };
    } catch (e) {
      console.error(`[aiClient] provider "${provider.name}" nieudany:`, e.message);
      errors.push(`${provider.name}: ${e.message}`);
      // Przy limicie (429) daj chwilę odetchnąć zanim ruszymy dalej.
      if (e.status === 429) await sleep(800);
    }
  }

  throw new Error(`Wszyscy providerzy AI zawiedli → ${errors.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// PUBLICZNE: callAIJson — jak callAI, ale czyści markdown i parsuje JSON.
// ---------------------------------------------------------------------------
export async function callAIJson(prompt) {
  const { text, provider } = await callAI(prompt);
  const clean = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    return { data: JSON.parse(clean), provider };
  } catch {
    // Ostatnia deska: wytnij pierwszy blok { ... }
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) return { data: JSON.parse(match[0]), provider };
    throw new Error(`Odpowiedź AI (${provider}) nie jest poprawnym JSON: ${clean.slice(0, 200)}`);
  }
}
