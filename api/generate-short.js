import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile, unlink } from "node:fs/promises";
import { renderShort } from "../worker/renderShort.mjs";
import { computeBootlegRisk } from "../src/lib/bootlegRisk.js";
import { scaleOf, defaultShortOptions } from "../src/lib/shortOptions.js";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";

// ============================================================================
// generate-short (Etap 4) — renderuje 20s short dla figurki i zapisuje MP4.
//   POST { figureId } → render (worker) → upload do figure-videos → video_url.
// UWAGA: render (ffmpeg) należy do środowiska z fs + czasem (VPS/worker lub dev).
// Na Vercelu-hobby może przekroczyć limity — docelowo webhook do workera na VPS.
// ============================================================================

function resolveImage(officialUrl) {
  if (!officialUrl) return null;
  if (officialUrl.startsWith("http")) return officialUrl;
  const base = officialUrl.replace(/\.\w+$/, "");
  return `./public/images/${base}.png`; // lokalny asset (dev/worker)
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
  else if (typeof req.body === "string") body = JSON.parse(req.body);
  const { figureId, options } = body || {};
  if (!figureId) return res.status(400).json({ error: "Brak figureId" });
  const opts = { ...defaultShortOptions(), ...(options || {}) };

  const supabase = getSupabaseAdmin();
  const outPath = join(tmpdir(), `short_${figureId}_${Date.now()}.mp4`);

  try {
    const { data: figure, error } = await supabase.from("figures").select("*").eq("id", figureId).single();
    if (error || !figure) throw new Error("Nie znaleziono figurki");

    const imageSrc = resolveImage(figure.official_image_url);
    if (!imageSrc) throw new Error("Figurka nie ma zdjęcia — najpierw dodaj zdjęcie.");

    await supabase.from("figures").update({ video_status: "rendering" }).eq("id", figureId);

    const risk = computeBootlegRisk(figure);
    const price = figure.original_price || figure.market_value?.average || "";

    await renderShort(
      { name: figure.name, series: figure.series, manufacturer: figure.manufacturer, price, riskLevel: risk.level },
      {
        imageSrc,
        out: outPath,
        scale: scaleOf(opts.resolution),
        preset: opts.preset,
        accent: opts.accent,
        music: opts.music,
        cta: opts.cta,
        lang: opts.lang,
      }
    );

    const mp4 = await readFile(outPath);
    const slug = (figure.name || "figure").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const filename = `${slug}_${Date.now()}.mp4`;

    const { error: upErr } = await supabase.storage
      .from("figure-videos")
      .upload(filename, mp4, { contentType: "video/mp4", upsert: true });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("figure-videos").getPublicUrl(filename);

    await supabase.from("figures").update({ video_status: "ready", video_url: pub.publicUrl }).eq("id", figureId);

    return res.status(200).json({ url: pub.publicUrl, video_status: "ready" });
  } catch (err) {
    console.error("generate-short error:", err);
    await supabase.from("figures").update({ video_status: "failed" }).eq("id", figureId).then(() => {}, () => {});
    return res.status(500).json({ error: err.message });
  } finally {
    await unlink(outPath).catch(() => {});
  }
}
