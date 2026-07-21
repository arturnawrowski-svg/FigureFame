import sharp from "sharp";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";

// ============================================================================
// finalize-image (Etap 2) — finalizacja zdjęcia figurki:
//   1. pobiera WYBRANEGO kandydata (URL),
//   2. koduje finalny, kanoniczny WebP → figure-images/{slug}_{ts}.webp,
//   3. KASUJE cały folder roboczy _work/{figureId}/ (zostaje jeden plik).
// Wszystko na service_role (omija RLS → zero polityk Storage do dodania).
// (AVIF pominięty świadomie — render używa pojedynczego URL webp; można dodać
//  później razem z <picture>. Free-first: nie mnożymy plików w Storage.)
// ============================================================================

const PROXY_URL = process.env.PROXY_URL;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;


async function fetchImage(url) {
  const isSupabase = url.includes("supabase.co");
  const target = PROXY_URL && !isSupabase ? `${PROXY_URL}${encodeURIComponent(url)}` : url;
  return fetch(target, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    },
  });
}

async function purgeWorkFolder(supabase, figureId) {
  try {
    const prefix = `_work/${figureId}`;
    const { data: list, error } = await supabase.storage.from("figure-images").list(prefix, { limit: 100 });
    if (error || !list || list.length === 0) return 0;
    const paths = list.filter((f) => f.name).map((f) => `${prefix}/${f.name}`);
    if (paths.length === 0) return 0;
    await supabase.storage.from("figure-images").remove(paths);
    return paths.length;
  } catch (e) {
    console.error("purgeWorkFolder error:", e.message);
    return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    let body = req.body;
    if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
    else if (typeof req.body === "string") body = JSON.parse(req.body);

    const { figureId, imageUrl, figureName } = body || {};
    if (!figureId) return res.status(400).json({ error: "Brak figureId" });
    if (!imageUrl) return res.status(400).json({ error: "Brak imageUrl" });

    const supabase = getSupabaseAdmin();

    // 1. Pobierz wybranego kandydata
    const resp = await fetchImage(imageUrl);
    if (!resp.ok) throw new Error(`Nie udało się pobrać obrazu (status ${resp.status})`);
    const input = Buffer.from(await resp.arrayBuffer());
    if (input.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: "Obraz za duży (limit 20 MB)" });
    }

    // 2. Finalny kanoniczny WebP
    const webp = await sharp(input).webp({ quality: 82, effort: 6 }).toBuffer();
    const slug = (figureName || "figure").toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const filename = `${slug}_${Date.now()}.webp`;

    const { error: upErr } = await supabase.storage
      .from("figure-images")
      .upload(filename, webp, { contentType: "image/webp", cacheControl: "3600", upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("figure-images").getPublicUrl(filename);

    // 3. Sprzątanie folderu roboczego
    const purged = await purgeWorkFolder(supabase, figureId);

    return res.status(200).json({ url: pub.publicUrl, purgedWorkFiles: purged });
  } catch (err) {
    console.error("finalize-image error:", err);
    return res.status(500).json({ error: err.message });
  }
}
