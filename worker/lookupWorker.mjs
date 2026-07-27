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
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { gatherFromSources } from "../server-lib/figureSources.js";
import { rehostImage, crossCheckImage } from "../server-lib/figureImage.js";
import { closeBrowser } from "../server-lib/scrapeProviders.js";
import { cacheKey } from "../server-lib/lookupShared.js";
import { startHeartbeat, stationName } from "./lib/heartbeat.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const POLL_MS = 20000;
const BATCH = 5;

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
    const { data, sources, bootlegWarning, records } = await gatherFromSources(
      job.name,
      job.series,
      { deep: job.mode === "deep", manufacturer: job.manufacturer || "", scale: job.scale || "" }
    );

    const found = Object.values(sources).some((s) => s === "ok");
    if (!found) throw new Error("żadne źródło nie znalazło tej figurki");

    // ZDJĘCIE: nie wolno odłożyć do bazy surowego adresu z cudzego serwera —
    // taki link trafiał potem wprost do formularza i do Gabloty, a właściciel
    // serwera może go odciąć w dowolnej chwili. Wymagamy zgodności dwóch
    // źródeł, a plik lądowuje w naszym Storage.
    let imageError = null;
    if (data.official_image_url) {
      const check = crossCheckImage(records || [], { manufacturer: job.manufacturer || "", scale: job.scale || "" });
      if (!check.agreed) {
        data.official_image_url = "";
        imageError = "Zdjęcie podało tylko jedno źródło — za mało, żeby mieć pewność co do wersji figurki.";
      } else {
        const hosted = await rehostImage(check.imageUrl, job.name);
        data.official_image_url = hosted || "";
        if (hosted) console.log(`    zdjęcie (${check.reason}): ${check.by.join(" + ")} → nasz Storage`);
        else imageError = "Nie udało się pobrać zdjęcia ze znalezionego adresu.";
      }
    }

    // Wszystko tutaj pochodzi z katalogów (worker nie woła AI), więc każde
    // wypełnione pole dostaje ptaszek „potwierdzone".
    const provenance = {};
    Object.entries(data).forEach(([k, v]) => {
      if (v && !k.startsWith("_")) provenance[k] = "catalog";
    });

    const payload = { ...data, _sources: sources, _provenance: provenance };
    if (imageError) payload._imageError = imageError;
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
  // Panel pokazuje dzięki temu 🟢 „Studio aktywne" — moderator nie musi zgadywać.
  startHeartbeat({ can_browse: true });
  console.log(`Stacja: ${stationName()} — zgłaszam obecność do panelu.`);
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
