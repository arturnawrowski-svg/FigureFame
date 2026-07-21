import { createClient } from "@supabase/supabase-js";

// ============================================================================
// /api/sitemap — dynamiczny sitemap.xml z listy zatwierdzonych figurek.
// Read-only (klucz anon, RLS pozwala czytać tylko APPROVED). Bez zapisów.
// ============================================================================

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url, key);
}

export default async function handler(req, res) {
  const base = (process.env.SITE_URL || "https://figure-fame.vercel.app").replace(/\/+$/, "");
  try {
    let ids = [];
    try {
      const supabase = getSupabase();
      const { data } = await supabase.from("figures").select("id").eq("status", "APPROVED");
      ids = (data || []).map((f) => f.id);
    } catch (_e) {
      // Gdy baza nieosiągalna — sam URL główny (sitemap nadal poprawny).
    }

    const urls = [
      { loc: `${base}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${base}/about`, priority: "0.4", changefreq: "monthly" },
      { loc: `${base}/faq`, priority: "0.5", changefreq: "monthly" },
      ...ids.map((id) => ({ loc: `${base}/dossier/${id}`, priority: "0.8", changefreq: "weekly" })),
    ];

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls
        .map((u) => `  <url><loc>${u.loc}</loc><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`)
        .join("\n") +
      `\n</urlset>\n`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.statusCode = 200;
    res.end(xml);
  } catch (err) {
    res.statusCode = 500;
    res.end(`<!-- sitemap error: ${err.message} -->`);
  }
}
