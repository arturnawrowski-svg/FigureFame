import { fetchAllOffers } from "./lib/priceProviders.js";
import { getSupabaseAdmin } from "./lib/supabaseAdmin.js";

// ============================================================================
// refresh-prices (Etap 3) — pobiera oferty dla figurki i zapisuje snapshot cen.
//   POST { figureId, query }  →  replace price_snapshots dla figurki + last_price_check.
// service_role (omija RLS). Gdy brak kluczy providera → nic nie psuje, zwraca info.
// ============================================================================

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    let body = req.body;
    if (Buffer.isBuffer(req.body)) body = JSON.parse(req.body.toString());
    else if (typeof req.body === "string") body = JSON.parse(req.body);

    const { figureId, query } = body || {};
    if (!figureId) return res.status(400).json({ error: "Brak figureId" });
    if (!query || !query.trim()) return res.status(400).json({ error: "Brak zapytania (nazwa figurki)" });

    const { offers, providers } = await fetchAllOffers(query.trim());

    const supabase = getSupabaseAdmin();

    // Zapis tylko gdy cokolwiek zebrano — inaczej nie kasujemy istniejących danych.
    if (offers.length > 0) {
      await supabase.from("price_snapshots").delete().eq("figure_id", figureId);
      const rows = offers.map((o) => ({ ...o, figure_id: figureId }));
      const { error: insErr } = await supabase.from("price_snapshots").insert(rows);
      if (insErr) throw insErr;
    }

    await supabase.from("figures").update({ last_price_check: new Date().toISOString() }).eq("id", figureId);

    return res.status(200).json({ count: offers.length, providers });
  } catch (err) {
    console.error("refresh-prices error:", err);
    return res.status(500).json({ error: err.message });
  }
}
