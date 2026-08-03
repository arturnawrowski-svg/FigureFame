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
import { kluczPostaci, kluczProduktu } from "../server-lib/lookupShared.js";
import { startHeartbeat, stationName } from "./lib/heartbeat.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const POLL_MS = 20000;
const BATCH = 5;

// Po jakim czasie uznajemy zlecenie w stanie 'working' za PORZUCONE.
//
// Zlecenie oznaczone jako 'working' jest zablokowane — claimJobs bierze
// wyłącznie 'pending'. Gdy Studio padnie albo zostanie zamknięte w trakcie
// pracy, wiersz zostaje w tym stanie NA ZAWSZE i figurki nie da się już
// odblokować niczym poza ręcznym SQL-em. Panel nie pokazuje przy tym żadnego
// błędu — zlecenie po prostu nigdy się nie kończy.
//
// Zdarzyło się naprawdę (02.08): Studio zamilkło dwie sekundy po podjęciu
// zlecenia, a ono wisiało, dopóki nie zostało odblokowane z zewnątrz.
//
// Próg jest hojny: przebieg 'deep' z pobraniem zdjęcia mieści się w minutach,
// więc dziesięć minut oznacza awarię, a nie wolną pracę. Pętla jest w dodatku
// sekwencyjna (`for … await`, kolejny cykl startuje dopiero po zakończeniu
// poprzedniego), więc worker nie może odebrać zlecenia sam sobie.
const PORZUCONE_PO_MS = 10 * 60 * 1000;

/** Zlecenia porzucone po awarii wracają do kolejki same. */
async function odblokujPorzucone(supabase) {
  const prog = new Date(Date.now() - PORZUCONE_PO_MS).toISOString();
  const { data, error } = await supabase
    .from("lookup_queue")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("status", "working")
    .lt("updated_at", prog)
    .select("id, name");

  if (error) {
    console.error(`[kolejka] nie udało się odblokować porzuconych: ${error.message}`);
    return;
  }
  if (data && data.length > 0) {
    console.log(`  ↺ wróciły do kolejki po awarii: ${data.map((j) => j.name).join(", ")}`);
  }
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

    // ⚠️ Klucze MUSZĄ być liczone tą samą funkcją co w api/fetch-figure.js —
    // worker pisze, API czyta. Gdyby się rozjechały, pamięć po cichu przestałaby
    // trafiać: żadnego błędu, tylko każde wyszukanie znów kosztuje limit.
    //
    // Producent i skala wchodzą do klucza produktu, bo dopiero one odróżniają
    // wydanie. Bez nich trzy pobrania Silfy (kolejka: id 6, 7, 9) pisały pod
    // jeden klucz i nadpisywały się nawzajem.
    const key = kluczProduktu(job.name, job.series, job.mode, {
      manufacturer: job.manufacturer || "",
      scale: job.scale || "",
      version: job.version || "",
    });
    await supabase.from("lookup_cache").upsert({
      key,
      mode: job.mode,
      data: payload,
      created_at: new Date().toISOString(),
    });

    // Osobny wpis POSTACI — nazwa japońska i tytuł serii są wspólne dla
    // wszystkich figurek tej postaci, więc następna wersja Super Sonico
    // dostanie je bez ani jednego zapytania na zewnątrz.
    const postac = {};
    if (data.japanese_name) postac.japanese_name = data.japanese_name;
    if (data.japanese_series) postac.japanese_series = data.japanese_series;
    if (data.series) postac.series = data.series;
    if (postac.japanese_name || postac.japanese_series) {
      await supabase.from("lookup_cache").upsert({
        key: kluczPostaci(job.name, job.series),
        mode: job.mode,
        data: postac,
        created_at: new Date().toISOString(),
      });
    }

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
  await odblokujPorzucone(supabase); // najpierw sprzątanie po ewentualnej awarii
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
