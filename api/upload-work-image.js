import sharp from "sharp";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";

// ============================================================================
// upload-work-image (Etap 2) — zapisuje zdjęcie-KANDYDATA do folderu roboczego:
//   figure-images/_work/{figureId}/{uuid}.webp
// Klient przysyła już webp (base64). Serwer używa service_role (omija RLS —
// ZERO polityk Storage do dodania). sharp re-koduje dla pewności/spójności.
// ============================================================================

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    let body = req.body;
    if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
    else if (typeof req.body === "string") body = JSON.parse(req.body);

    const { figureId, imageBase64 } = body || {};
    if (!figureId) return res.status(400).json({ error: "Brak figureId" });
    if (!imageBase64) return res.status(400).json({ error: "Brak danych obrazu" });

    const input = Buffer.from(imageBase64, "base64");
    if (input.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({ error: "Obraz za duży (limit 15 MB)" });
    }

    // Re-kodowanie do webp (spójność + odcięcie ewentualnych dziwnych danych).
    const webp = await sharp(input).webp({ quality: 82 }).toBuffer();

    const uid = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const path = `_work/${figureId}/${uid}.webp`;

    const supabase = getSupabaseAdmin();
    const { error: upErr } = await supabase.storage
      .from("figure-images")
      .upload(path, webp, { contentType: "image/webp", upsert: false });
    if (upErr) throw upErr;

    const { data: pub } = supabase.storage.from("figure-images").getPublicUrl(path);
    return res.status(200).json({ url: pub.publicUrl, path });
  } catch (err) {
    console.error("upload-work-image error:", err);
    return res.status(500).json({ error: err.message });
  }
}
