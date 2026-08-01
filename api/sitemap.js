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
  const base = (process.env.SITE_URL || "https://figurefame.com").replace(/\/+$/, "");
  try {
    let sciezki = [];
    try {
      const supabase = getSupabase();
      // Kolumny adresowe dochodzą dopiero z migracją; do tego czasu zgłaszamy
      // identyfikatory, żeby mapa strony nie zrobiła się nagle pusta.
      let { data, error } = await supabase
        .from("figures")
        .select("id, slug, short_code")
        .eq("status", "APPROVED");
      if (error && /does not exist/i.test(error.message || "")) {
        ({ data } = await supabase.from("figures").select("id").eq("status", "APPROVED"));
      }
      // Zgłaszamy WYŁĄCZNIE adresy kanoniczne (/f/...). Wcześniej trafiały tu
      // identyfikatory techniczne (/dossier/<uuid>) — nieczytelne dla człowieka
      // i bezwartościowe dla wyszukiwarki.
      sciezki = (data || []).map((f) => f.slug || f.short_code || f.id);
    } catch (_e) {
      // Gdy baza nieosiągalna — sam URL główny (sitemap nadal poprawny).
    }

    const urls = [
      { loc: `${base}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${base}/about`, priority: "0.4", changefreq: "monthly" },
      { loc: `${base}/faq`, priority: "0.5", changefreq: "monthly" },
      ...sciezki.map((p) => ({ loc: `${base}/f/${p}`, priority: "0.8", changefreq: "weekly" })),
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
