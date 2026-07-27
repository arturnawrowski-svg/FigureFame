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
//   3. openrouter— agregator, jeden klucz → wiele darmowych modeli
//   4. github    — GitHub Models (Llama 4 Scout / DeepSeek / GPT), darmowe z tokenem GH
//   5. github2   — drugi token GH → inny model (Mistral Small)
//   6. sambanova — bardzo szybki, Llama 3.3 70B, darmowy tier
//   7. hf        — Hugging Face router, fallback awaryjny (bywa zimny start)
//
// Grounding dla modeli BEZ własnego wyszukiwania (Groq/OpenRouter/GitHub):
// opcjonalnie Tavily (TAVILY_API_KEY) — patrz callAI(prompt, { groundQuery }).
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
    OPENROUTER_KEY: process.env.OPENROUTER_API_KEY,
    GITHUB_KEY: process.env.GITHUB_MODELS_TOKEN,
    GITHUB_KEY_2: process.env.GITHUB_MODELS_TOKEN_2,
    GITHUB_KEY_3: process.env.GITHUB_MODELS_TOKEN_3,
    GITHUB_KEY_4: process.env.GITHUB_MODELS_TOKEN_4,
    SAMBANOVA_KEY: process.env.SAMBANOVA_API_KEY,
    HF_KEY: process.env.HF_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-flash-latest",
    GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || "openai/gpt-oss-20b:free",
    GITHUB_MODEL: process.env.GITHUB_MODEL || "meta/Llama-4-Scout-17B-16E-Instruct",
    GITHUB_MODEL_2: process.env.GITHUB_MODEL_2 || "mistral-ai/mistral-small-2503",
    GITHUB_MODEL_3: process.env.GITHUB_MODEL_3 || "openai/gpt-4.1-mini",
    GITHUB_MODEL_4: process.env.GITHUB_MODEL_4 || "openai/gpt-4o-mini",
    SAMBANOVA_MODEL: process.env.SAMBANOVA_MODEL || "Meta-Llama-3.3-70B-Instruct",
    HF_MODEL: process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
  };
}

// Domyślna kolejność: najpierw zweryfikowane działające (Groq, OpenRouter),
// potem Gemini z groundingiem (nowy klucz).
// Aby przywrócić grounding jako pierwszy:
//   AI_PROVIDER_ORDER=gemini,groq,openrouter,github,github2,github3,github4,sambanova,hf
const DEFAULT_ORDER = ["groq", "openrouter", "sambanova", "github", "github2", "github3", "github4", "gemini", "hf"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Wywołanie OpenAI-compatible /chat/completions (Groq, OpenRouter)
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
    github: e.GITHUB_KEY
      ? {
          name: "github",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://models.github.ai/inference",
              apiKey: e.GITHUB_KEY,
              model: e.GITHUB_MODEL,
              prompt,
            }),
        }
      : null,
    github2: e.GITHUB_KEY_2
      ? {
          name: "github2",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://models.github.ai/inference",
              apiKey: e.GITHUB_KEY_2,
              model: e.GITHUB_MODEL_2,
              prompt,
            }),
        }
      : null,
    github3: e.GITHUB_KEY_3
      ? {
          name: "github3",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://models.github.ai/inference",
              apiKey: e.GITHUB_KEY_3,
              model: e.GITHUB_MODEL_3,
              prompt,
            }),
        }
      : null,
    github4: e.GITHUB_KEY_4
      ? {
          name: "github4",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://models.github.ai/inference",
              apiKey: e.GITHUB_KEY_4,
              model: e.GITHUB_MODEL_4,
              prompt,
            }),
        }
      : null,
    sambanova: e.SAMBANOVA_KEY
      ? {
          name: "sambanova",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://api.sambanova.ai/v1",
              apiKey: e.SAMBANOVA_KEY,
              model: e.SAMBANOVA_MODEL,
              prompt,
            }),
        }
      : null,
    hf: e.HF_KEY
      ? {
          name: "hf",
          call: (prompt) =>
            callOpenAICompatible({
              baseURL: "https://router.huggingface.co/v1",
              apiKey: e.HF_KEY,
              model: e.HF_MODEL,
              prompt,
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
// Tavily — wyszukiwarka zbudowana pod LLM. Zwraca zwięzły kontekst z sieci,
// który doklejamy do promptu modeli BEZ własnego groundingu (Groq/OpenRouter/
// GitHub). Gemini ma grounding natywnie, więc jego nie dotyczy. Aktywna tylko
// z TAVILY_API_KEY. Przy braku klucza lub błędzie zwraca "" (grounding pomijany).
// ---------------------------------------------------------------------------
export async function tavilySearch(query, { maxResults = 5 } = {}) {
  const key = process.env.TAVILY_API_KEY;
  if (!key || !query) return "";
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: maxResults, search_depth: "basic", include_answer: true }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    const answer = data?.answer ? `Podsumowanie: ${data.answer}\n` : "";
    const results = (data?.results || [])
      .map((r) => `- ${r.title}: ${(r.content || "").slice(0, 300)} (${r.url})`)
      .join("\n");
    return (answer + results).trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// PUBLICZNE: callAI — próbuje providerów po kolei, zwraca pierwszą udaną odpowiedź.
// Zwraca { text, provider }. Rzuca, gdy wszyscy zawiodą.
// opts.groundQuery — jeśli podane i jest TAVILY_API_KEY, dokleja realny kontekst
// z sieci do promptu (dla modeli bez własnego wyszukiwania). Domyślnie brak = bez zmian.
// ---------------------------------------------------------------------------
export async function callAI(prompt, opts = {}) {
  const providers = buildProviders();
  const order = getOrder();
  const active = order.map((k) => providers[k]).filter(Boolean);

  if (active.length === 0) {
    throw new Error(
      "Brak skonfigurowanych providerów AI — ustaw GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY"
    );
  }

  let finalPrompt = prompt;
  if (opts.groundQuery) {
    const ctx = await tavilySearch(opts.groundQuery);
    if (ctx) finalPrompt = `Aktualny kontekst z internetu (oprzyj się na nim, nie zmyślaj):\n${ctx}\n\n---\n${prompt}`;
  }

  const errors = [];
  for (const provider of active) {
    try {
      const text = await provider.call(finalPrompt);
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
export async function callAIJson(prompt, opts = {}) {
  const { text, provider } = await callAI(prompt, opts);
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
