// ============================================================================
// worker wyszukiwań — pobiera dane figurek PRAWDZIWĄ przeglądarką na Twoim
// komputerze i odkłada wynik do bazy.
//
// Po co: katalogi (MyFigureCollection i spółka) stoją za Cloudflare, który
// odrzuca ruch z serwerów, ale przepuszcza przeglądarkę. Na Vercelu przeglądarki
// nie ma — więc klik na żywej stronie zostawia zlecenie w tabeli lookup_queue,
// a ten worker je realizuje: Chromium (Playwright) pobiera strony, wynik ląduje
// w lookup_cache, panel go odczytuje.
//
// Ten sam sprawdzony układ co kolejka filmów: Vercel = mózg, ten komputer = ręce.
// Koszt: zero. Bez limitów, bez płatnych pośredników.
//
// Uruchom:
//   npm run lookup-worker          → przerób kolejkę raz i zakończ
//   npm run lookup-worker:watch    → pracuj w tle, sprawdzaj co 20 s
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../api/lib/supabaseAdmin.js";
import { gatherFromSources } from "../api/lib/figureSources.js";
import { closeBrowser } from "../api/lib/scrapeProviders.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const POLL_MS = 20000;
const BATCH = 5;

// Ten sam klucz co w api/fetch-figure.js — inaczej panel nie znajdzie wyniku.
function cacheKey(name, series, mode) {
  const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
  return `${mode}|${norm(name)}|${norm(series)}`;
}

async function claimJobs(supabase) {
  const { data, error } = await supabase
    .from("lookup_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);
  if (error) throw error;
  return data || [];
}

async function processJob(supabase, job) {
  const label = `${job.name}${job.series ? ` (${job.series})` : ""}`;
  console.log(`  → ${label} [${job.mode}]`);

  // 'working' pełni rolę blokady — drugi przebieg tego nie złapie.
  await supabase
    .from("lookup_queue")
    .update({ status: "working", updated_at: new Date().toISOString() })
    .eq("id", job.id);

  try {
    const { data, sources, bootlegWarning } = await gatherFromSources(
      job.name,
      job.series,
      { deep: job.mode === "deep" }
    );

    const found = Object.values(sources).some((s) => s === "ok");
    if (!found) throw new Error("żadne źródło nie znalazło tej figurki");

    const payload = { ...data, _sources: sources };
    if (bootlegWarning) {
      payload._bootlegWarning = "MyFigureCollection ostrzega: istnieje podrobiona wersja tej figurki.";
    }

    const key = cacheKey(job.name, job.series, job.mode);
    await supabase.from("lookup_cache").upsert({
      key,
      mode: job.mode,
      data: payload,
      created_at: new Date().toISOString(),
    });

    await supabase
      .from("lookup_queue")
      .update({ status: "done", cache_key: key, updated_at: new Date().toISOString() })
      .eq("id", job.id);

    console.log(`  ✓ ${label} → ${JSON.stringify(sources)}`);
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`);
    await supabase
      .from("lookup_queue")
      .update({ status: "failed", error: err.message, updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .then(() => {}, () => {});
  }
}

async function runOnce() {
  const supabase = getSupabaseAdmin();
  const jobs = await claimJobs(supabase);

  if (jobs.length === 0) {
    console.log("Kolejka wyszukiwań pusta.");
    return 0;
  }

  console.log(`Wyszukiwanie: ${jobs.length} zleceń.`);
  for (const job of jobs) await processJob(supabase, job);
  return jobs.length;
}

const watch = process.argv.includes("--watch");

if (watch) {
  console.log(`Worker wyszukiwań w trybie --watch (co ${POLL_MS / 1000}s). Ctrl+C aby zakończyć.`);
  const loop = async () => {
    try {
      await runOnce();
    } catch (e) {
      console.error(e.message);
    }
    setTimeout(loop, POLL_MS);
  };
  loop();
  // Przeglądarka zostaje otwarta między przebiegami — kolejne zlecenia ruszają
  // od razu, bez ponownego startu Chromium.
  process.on("SIGINT", async () => {
    await closeBrowser();
    process.exit(0);
  });
} else {
  runOnce()
    .then(async (n) => {
      await closeBrowser();
      console.log(`Zakończono (${n}).`);
    })
    .catch(async (e) => {
      await closeBrowser();
      console.error("BŁĄD:", e.message);
      // exitCode zamiast process.exit() — pozwalamy Node zamknąć uchwyty
      // spokojnie (natychmiastowe wyjście wywoływało awarię libuv na Windows).
      process.exitCode = 1;
    });
}
