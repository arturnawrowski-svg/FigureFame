import { createClient } from "@supabase/supabase-js";

// ============================================================================
// /api/figure-meta — wizytówka POJEDYNCZEJ figurki dla robotów.
// ----------------------------------------------------------------------------
// Po co to istnieje:
// Nasza strona to aplikacja składana w przeglądarce. Roboty TikToka, Discorda,
// Facebooka czy WhatsAppa NIE uruchamiają kodu strony — czytają wyłącznie
// surowy HTML. Do tej pory każdy adres oddawał im ten sam plik, więc link do
// figurki podklejony pod filmem pokazywał ogólną wizytówkę serwisu zamiast
// zdjęcia i nazwy tej figurki.
//
// Doszedł do tego błąd, który po cichu kasował nas w wyszukiwarce: znacznik
// „canonical" na KAŻDEJ podstronie wskazywał stronę główną, czyli mówił Google
// „to wszystko są kopie strony głównej". Tutaj ustawiamy go poprawnie.
//
// Ludzie tu nie trafiają — vercel.json kieruje pod ten adres tylko roboty
// (dopasowanie po nagłówku User-Agent). Odwiedzający dostaje normalną stronę.
// Gdyby jednak ktoś tu wszedł, dostanie natychmiastowe przekierowanie.
// ============================================================================

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url, key);
}

// Klucz techniczny (stary link /dossier/<uuid>) kontra adres czytelny/kod.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHORT_CODE = /^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/i;

// Treść z bazy trafia wprost do HTML — bez tego nazwa z cudzysłowem rozwaliłaby
// znacznik, a w gorszym wypadku pozwoliła wstrzyknąć obcy kod.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Zdanie, które zobaczy człowiek w podglądzie linku pod filmem. Piszemy je
// z tego, co PEWNE — bez zmyślania i bez pustych obietnic.
function buildDescription(figure) {
  const parts = [];
  if (figure.series) parts.push(figure.series);
  if (figure.manufacturer) parts.push(figure.manufacturer);
  if (figure.scale && figure.scale !== "Non-scale") parts.push(`skala ${figure.scale}`);

  const wartosc = figure.market_value?.average || figure.market_value;
  const cena = typeof wartosc === "string"
    // „98200 JPY" → „98 200 JPY". Katalogi podają liczby ciągiem, a to ma
    // przeczytać człowiek w podglądzie linku pod filmem.
    ? wartosc.replace(/\b(\d{4,})\b/g, (n) => n.replace(/\B(?=(\d{3})+(?!\d))/g, " ")).replace(/\.+$/, "")
    : "";
  const ogon = cena
    ? `Wartość rynkowa: ${cena}.`
    : "Dane producenta, wartość rynkowa i ryzyko podróbki.";

  return `${parts.join(" · ")}${parts.length ? ". " : ""}${ogon}`;
}

export default async function handler(req, res) {
  const base = (process.env.SITE_URL || "https://figurefame.com").replace(/\/+$/, "");
  const key = String(req.query.key || req.query.slug || "").trim();

  try {
    let figure = null;
    if (key) {
      const supabase = getSupabase();

      // Kolumny adresowe pojawiają się dopiero po migracji, a wdrożenie potrafi
      // ją wyprzedzić. Przy ich braku schodzimy na wyszukanie po identyfikatorze
      // — stare linki działają dalej, zamiast oddawać robotowi błąd.
      const BAZOWE = "id, name, japanese_name, series, manufacturer, scale, official_image_url, market_value";
      const szukaj = async (kolumny, kolumnaKlucza) => {
        // Widok, nie tabela — nazwa japońska mieszka od 04.08 w `characters`,
        // a to ona trafia w opis dla wyszukiwarek i w podgląd linku.
        let q = supabase.from("figures_full").select(kolumny).eq("status", "APPROVED");
        q = kolumnaKlucza === "id" ? q.eq("id", key)
          : kolumnaKlucza === "short_code" ? q.eq("short_code", key.toUpperCase())
          : q.eq("slug", key);
        return await q.maybeSingle();
      };

      const kolumnaKlucza = UUID.test(key) ? "id" : SHORT_CODE.test(key) ? "short_code" : "slug";
      let { data, error } = await szukaj(`${BAZOWE}, slug, short_code`, kolumnaKlucza);

      if (error && /does not exist/i.test(error.message || "")) {
        ({ data } = UUID.test(key) ? await szukaj(BAZOWE, "id") : { data: null });
      }
      figure = data || null;
    }

    // Nie ma takiej figurki → wizytówka serwisu i adres strony głównej.
    // Robotowi nie wolno pokazać „strony figurki", której nie ma.
    if (!figure) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=300");
      return res.status(404).send(page({
        title: "Nie znaleziono figurki — FigureFame",
        description: "Ta pozycja nie istnieje w bazie FigureFame.",
        image: `${base}/og-image.png`,
        url: `${base}/`,
        redirect: `${base}/`,
      }));
    }

    const canonical = `${base}/f/${figure.slug || figure.short_code || figure.id}`;
    const nazwa = [figure.name, figure.japanese_name].filter(Boolean).join(" / ");

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Pięć minut świeżości, godzina „starego, ale podanego od ręki".
    // Roboty potrafią odpytywać ten sam adres wielokrotnie przy każdym
    // udostępnieniu filmu, więc bufor jest potrzebny — ale przy godzinie
    // poprawiona nazwa lub podmienione zdjęcie potrafiły przez ten czas nie
    // dojść do podglądu linku, a moderator poprawia figurkę TUŻ przed publikacją.
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).send(page({
      title: `${nazwa} — FigureFame`,
      description: buildDescription(figure),
      image: figure.official_image_url?.startsWith("http")
        ? figure.official_image_url
        : `${base}/og-image.png`,
      url: canonical,
      redirect: canonical,
      figure,
    }));
  } catch (err) {
    console.error("[figure-meta]", err.message);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(200).send(page({
      title: "FigureFame",
      description: "Baza japońskich figurek kolekcjonerskich.",
      image: `${base}/og-image.png`,
      url: `${base}/`,
      redirect: `${base}/`,
    }));
  }
}

function page({ title, description, image, url, redirect, figure }) {
  // Dane uporządkowane dla wyszukiwarek — dzięki nim wynik w Google może
  // pokazać zdjęcie, producenta i cenę zamiast samego odnośnika.
  const dane = figure
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        name: figure.name,
        image: image,
        description: description,
        brand: figure.manufacturer ? { "@type": "Brand", name: figure.manufacturer } : undefined,
        url: url,
      })}</script>`
    : "";

  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="product">
<meta property="og:site_name" content="FigureFame">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:locale" content="pl_PL">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${dane}
<meta http-equiv="refresh" content="0; url=${esc(redirect)}">
</head>
<body>
<p><a href="${esc(redirect)}">${esc(title)}</a></p>
</body>
</html>`;
}
