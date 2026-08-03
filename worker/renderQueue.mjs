// ============================================================================
// worker (Etap 5) — LOKALNY worker kolejki shortów, OPARTY O BAZĘ. Robi 2 rzeczy:
//  1) RENDER: figurki z video_status='queued' → renderuje na TWOIM kompie,
//     wgrywa MP4 do Supabase Storage (figure-videos), status='ready' (do moderacji).
//  2) PUBLIKACJA: figurki 'approved_for_publish' (zatwierdzone przez admina) →
//     upload na Twój Google Drive (5 TB) → KASUJE z Supabase Storage (bufor nie
//     rośnie) → status='published' + drive_url. Publikacja działa, gdy w .env.local
//     są klucze GOOGLE_DRIVE_* (inaczej krok pomijany).
//
// Uruchom na kompie admina:
//   npm run worker            → przerób kolejkę raz i zakończ
//   npm run worker:watch      → pracuj w tle, sprawdzaj co 30 s
//
// Opcje shorta: figures.video_options (migracja: migracje-video-queue.sql).
// Kolumny Drive: migracje-drive.sql. Render/upload = komp admina, NIE Vercel. Free-first.
// ============================================================================
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { renderShort } from "./renderShort.mjs";
import { computeBootlegRisk } from "../src/lib/bootlegRisk.js";
import { scaleOf, defaultShortOptions, QUEUE_MAX } from "../src/lib/shortOptions.js";
import { driveConfigured, driveWymagaLogowania, getAccessToken, ensureFolder, uploadMp4 } from "./lib/gdrive.mjs";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { figureUrl } from "../src/lib/figureIdentity.js";
import { startHeartbeat } from "./lib/heartbeat.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const POLL_MS = 30000;

// Po jakim czasie uznajemy render w stanie 'rendering' za PORZUCONY.
//
// 'rendering' pełni rolę blokady — fetchQueued bierze wyłącznie 'queued', więc
// figurka w trakcie renderu nie zostanie złapana drugi raz. Ale nic tej blokady
// nie zdejmuje: gdy Studio padnie albo zostanie zamknięte w połowie pracy,
// wiersz zostaje w 'rendering' NA ZAWSZE, a panel nie pokazuje przy tym żadnego
// błędu — short po prostu nigdy nie jest gotowy. Jeden taki wisi w bazie.
//
// To ta sama pułapka, która zjadła zlecenie w lookup_queue (02.08); tam ratunek
// nazywa się tak samo i stoi w worker/lookupWorker.mjs.
//
// Próg jest HOJNIEJSZY niż przy wyszukiwaniu (10 min), bo kodowanie filmu
// w 1080×1920 trwa realnie minuty, a nie sekundy. Pół godziny oznacza awarię,
// nie wolną pracę. Pętla --watch jest w dodatku sekwencyjna (kolejny przebieg
// startuje po zakończeniu poprzedniego), więc worker nie może odblokować
// renderu, który sam właśnie wykonuje.
const PORZUCONE_PO_MS = 30 * 60 * 1000;

const teraz = () => new Date().toISOString();

/** Rendery porzucone po awarii Studia wracają do kolejki same. */
async function odblokujPorzucone(supabase) {
  const prog = new Date(Date.now() - PORZUCONE_PO_MS).toISOString();
  const { data, error } = await supabase
    .from("figures")
    .update({ video_status: "queued", video_status_at: teraz() })
    .eq("video_status", "rendering")
    // NULL = wiersz sprzed migracji video_status_at, czyli „nie wiadomo od
    // kiedy". Skoro nie wiadomo, a stan jest blokujący — zwalniamy.
    .or(`video_status_at.lt.${prog},video_status_at.is.null`)
    .select("id, name");

  if (error) {
    console.error(`  ! nie udało się odblokować porzuconych renderów: ${error.message}`);
    return;
  }
  if (data && data.length > 0) {
    console.log(`  ↺ wróciły do kolejki po awarii: ${data.map((f) => f.name).join(", ")}`);
  }
}

function resolveImage(officialUrl) {
  if (!officialUrl) return null;
  if (officialUrl.startsWith("http")) return officialUrl;
  const base = officialUrl.replace(/\.\w+$/, "");
  return join(__dirname, "..", "public", "images", `${base}.png`);
}

async function fetchQueued(supabase) {
  const { data, error } = await supabase
    .from("figures")
    .select("*")
    .eq("video_status", "queued")
    .order("id", { ascending: true })
    .limit(QUEUE_MAX);
  if (error) throw error;
  return data || [];
}

// Gotowiec do wklejenia w opis filmu na TikToku / YouTubie / Instagramie.
// W obrazie mieści się tylko krótki kod, a platformy i tak wolą klikalny link
// w opisie — tu jest pełny adres tej konkretnej figurki, nie strony głównej.
function opisDoPublikacji(figure, adres) {
  const tagi = [figure.series, figure.manufacturer]
    .filter(Boolean)
    .map((t) => "#" + String(t).replace(/[^\p{L}\p{N}]/gu, ""))
    .join(" ");

  return [
    "",
    "  ┌── OPIS DO WKLEJENIA POD FILMEM ──────────────────────",
    `  │ ${figure.name}${figure.series ? ` — ${figure.series}` : ""}`,
    "  │",
    `  │ Pełne dane, wartość rynkowa i gdzie kupić:`,
    `  │ ${adres}`,
    "  │",
    `  │ ${tagi} #figurkianime #kolekcja`,
    "  └──────────────────────────────────────────────────────",
    "",
  ].join("\n");
}

async function processFigure(supabase, figure) {
  const opts = { ...defaultShortOptions(), ...(figure.video_options || {}) };
  const outPath = join(tmpdir(), `short_${figure.id}_${Date.now()}.mp4`);

  try {
    const imageSrc = resolveImage(figure.official_image_url);
    if (!imageSrc) throw new Error("Figurka nie ma zdjęcia");

    // 'rendering' pełni też rolę prostej blokady (nie złapie jej drugi przebieg).
    // Znacznik czasu MUSI iść razem ze statusem — bez niego blokady nie da się
    // później zdjąć i porzucony render wisi w nieskończoność (odblokujPorzucone).
    await supabase
      .from("figures")
      .update({ video_status: "rendering", video_status_at: teraz() })
      .eq("id", figure.id);

    const risk = computeBootlegRisk(figure);
    const price = figure.original_price || figure.market_value?.average || "";

    // Adres, pod który ma trafić widz. Ten sam kod jest wypalany w obrazie,
    // a pełny adres wędruje do opisu przy publikacji (patrz niżej).
    const adres = figureUrl(figure, process.env.SITE_URL || "https://figurefame.com");
    if (!figure.short_code) {
      console.warn(`  ! ${figure.name}: brak kodu figurki — outro pokaże samą domenę. Uruchom: npm run adresy`);
    }

    console.log(`  → render ${figure.name} [${opts.preset}/${opts.accent}/${opts.music}/${opts.resolution}] → ${adres}`);
    await renderShort(
      { name: figure.name, series: figure.series, manufacturer: figure.manufacturer, price, riskLevel: risk.level, shortCode: figure.short_code || '' },
      { imageSrc, out: outPath, scale: scaleOf(opts.resolution), preset: opts.preset, accent: opts.accent, music: opts.music, cta: opts.cta, lang: opts.lang }
    );

    const mp4 = await readFile(outPath);
    const slug = (figure.name || "figure").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const filename = `${slug}_${Date.now()}.mp4`;
    const { error: upErr } = await supabase.storage.from("figure-videos").upload(filename, mp4, { contentType: "video/mp4", upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("figure-videos").getPublicUrl(filename);

    await supabase
      .from("figures")
      .update({ video_status: "ready", video_url: pub.publicUrl, video_status_at: teraz() })
      .eq("id", figure.id);
    console.log(`  ✓ gotowe: ${pub.publicUrl}`);
    console.log(opisDoPublikacji(figure, adres));
  } catch (err) {
    console.error(`  ✗ błąd (${figure.id}): ${err.message}`);
    await supabase
      .from("figures")
      .update({ video_status: "failed", video_status_at: teraz() })
      .eq("id", figure.id)
      .then(() => {}, () => {});
  } finally {
    await unlink(outPath).catch(() => {});
  }
}

// nazwa pliku w buckecie figure-videos wyciągnięta z publicznego video_url
function storageNameFromUrl(url) {
  const m = url && url.match(/figure-videos\/(.+)$/);
  return m ? decodeURIComponent(m[1].split("?")[0]) : null;
}

// PUBLIKACJA: zaakceptowane shorty → Google Drive → kasowanie z Supabase → 'published'
async function publishApproved(supabase) {
  if (!driveConfigured()) return 0;
  const { data, error } = await supabase
    .from("figures")
    .select("*")
    .eq("video_status", "approved_for_publish")
    .limit(QUEUE_MAX);
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  // Bez dostępu do Dysku nie ma po co ogłaszać, że publikujemy — filmy
  // poczekają w kolejce, a okno nie zapełni się powtórzonym błędem.
  if (driveWymagaLogowania()) return 0;

  console.log(`Publikacja: ${data.length} zaakceptowanych → Google Drive.`);
  const token = await getAccessToken();
  const folderId = await ensureFolder(token);

  for (const fig of data) {
    try {
      const name = storageNameFromUrl(fig.video_url);
      if (!name) throw new Error("nie rozpoznano pliku z video_url");

      const dl = await supabase.storage.from("figure-videos").download(name);
      if (dl.error) throw dl.error;
      const buf = Buffer.from(await dl.data.arrayBuffer());

      const up = await uploadMp4(token, folderId, name, buf);

      // dopiero po udanym uploadzie kasujemy z Supabase (zwolnienie bufora)
      await supabase.storage.from("figure-videos").remove([name]);
      await supabase.from("figures").update({
        video_status: "published",
        drive_file_id: up.id,
        drive_url: up.link,
        video_url: null,
        video_status_at: teraz(),
      }).eq("id", fig.id);

      console.log(`  ✓ opublikowano ${fig.name} → ${up.link}`);
    } catch (e) {
      console.error(`  ✗ publish błąd (${fig.id}): ${e.message}`);
    }
  }
  return data.length;
}

async function runOnce() {
  const supabase = getSupabaseAdmin();

  // Najpierw sprzątanie po ewentualnej awarii — inaczej porzucony render
  // zostałby pominięty także w tym przebiegu (fetchQueued bierze 'queued').
  await odblokujPorzucone(supabase);

  // 1) RENDER kolejki
  const queued = await fetchQueued(supabase);
  if (queued.length > 0) {
    console.log(`Render: ${queued.length} figurek (max ${QUEUE_MAX}/przebieg).`);
    for (const fig of queued) await processFigure(supabase, fig);
  } else {
    console.log("Kolejka renderu pusta.");
  }

  // 2) PUBLIKACJA zaakceptowanych na Drive
  let published = 0;
  try {
    published = await publishApproved(supabase);
    if (!driveConfigured()) console.log("Publikacja pominięta (brak kluczy GOOGLE_DRIVE_* w .env.local).");
  } catch (e) {
    console.error("Publikacja — błąd:", e.message);
  }

  return queued.length + published;
}

const watch = process.argv.includes("--watch");
if (watch) {
  console.log(`Worker kolejki w trybie --watch (co ${POLL_MS / 1000}s). Ctrl+C aby zakończyć.`);
  startHeartbeat({ can_render: true }); // panel widzi, że renderowanie jest dostępne
  const loop = async () => { try { await runOnce(); } catch (e) { console.error(e.message); } setTimeout(loop, POLL_MS); };
  loop();
} else {
  runOnce().then((n) => console.log(`Zakończono (${n}).`)).catch((e) => { console.error("BŁĄD:", e.message); process.exit(1); });
}
