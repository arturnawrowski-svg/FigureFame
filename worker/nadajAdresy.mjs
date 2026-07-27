// ============================================================================
// Nadanie stałych adresów figurkom, które ich jeszcze nie mają.
//
//   npm run adresy            → pokaż, co by się stało (nic nie zapisuje)
//   npm run adresy -- --zapisz → zapisz do bazy
//
// Adres raz nadany NIE JEST tu zmieniany. Short opublikowany na TikToku zostaje
// w sieci na zawsze i wypalonego w nim adresu nie da się już poprawić — więc
// adres musi być nietykalny, nawet gdy później poprawimy nazwę figurki.
//
// Wymaga wcześniejszego uruchomienia migracji: migracje-adresy-figurek.sql
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { identityKey, makeSlug, makeShortCode } from "../src/lib/figureIdentity.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const ZAPISZ = process.argv.includes("--zapisz");

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: figures, error } = await supabase
    .from("figures")
    .select("id, name, series, manufacturer, scale, status, slug, short_code, identity_key")
    .order("created_at", { ascending: true });

  if (error) {
    if (/column .* does not exist/i.test(error.message)) {
      console.error("\nBrak kolumn adresowych. Uruchom najpierw w Supabase → SQL Editor:");
      console.error("  migracje-adresy-figurek.sql\n");
      process.exitCode = 1;
      return;
    }
    throw error;
  }

  // Zajęte wartości — żeby nie wydać dwa razy tego samego adresu ani kodu.
  const zajeteSlugi = new Set(figures.filter((f) => f.slug).map((f) => f.slug));
  const zajeteKody = new Set(figures.filter((f) => f.short_code).map((f) => f.short_code));
  const odciski = new Map();

  let nadane = 0;
  let pominiete = 0;
  const duplikaty = [];

  for (const fig of figures) {
    if (fig.slug && fig.short_code) {
      pominiete += 1;
      continue; // ma już adres — nie ruszamy, patrz komentarz na górze
    }

    const odcisk = identityKey(fig);

    // Duplikat wykrywamy PO NASZYCH danych, nie po numerze z cudzego katalogu.
    if (odcisk && odciski.has(odcisk)) {
      duplikaty.push([odciski.get(odcisk), fig]);
      continue;
    }
    if (odcisk) odciski.set(odcisk, fig);

    // Adres czytelny; gdy nazwa jest wyłącznie japońska, zostaje sam kod.
    let slug = makeSlug(fig);
    if (slug && zajeteSlugi.has(slug)) {
      // Ta sama postać, producent i skala u dwóch różnych wydań (np. wersja
      // limitowana) — dopisujemy licznik zamiast odmawiać adresu.
      let n = 2;
      while (zajeteSlugi.has(`${slug}-${n}`)) n += 1;
      slug = `${slug}-${n}`;
    }
    if (slug) zajeteSlugi.add(slug);

    let kod = makeShortCode();
    let proby = 0;
    while (zajeteKody.has(kod) && proby < 50) {
      kod = makeShortCode();
      proby += 1;
    }
    zajeteKody.add(kod);

    console.log(`  ${fig.name}`);
    console.log(`    adres: /f/${slug || kod}${slug ? `   kod: /f/${kod}` : "   (nazwa nie daje się zapisać w adresie — sam kod)"}`);

    if (ZAPISZ) {
      const zmiany = { short_code: kod };
      if (slug) zmiany.slug = slug;
      if (odcisk) zmiany.identity_key = odcisk;

      const { error: upErr } = await supabase.from("figures").update(zmiany).eq("id", fig.id);
      if (upErr) {
        console.log(`    ✗ nie zapisano: ${upErr.message}`);
        continue;
      }
    }
    nadane += 1;
  }

  console.log(`\nNadano: ${nadane} · miało już adres: ${pominiete}`);

  if (duplikaty.length > 0) {
    console.log(`\nTE SAME FIGURKI ZGŁOSZONE DWA RAZY (${duplikaty.length}):`);
    console.log("Nie nadaję im adresu i niczego nie kasuję — to zgłoszenia użytkowników,");
    console.log("więc wybór, który wpis zostaje, należy do Ciebie.\n");
    for (const [pierwszy, drugi] of duplikaty) {
      console.log(`  „${drugi.name}" (${drugi.status})`);
      console.log(`     ten sam co: „${pierwszy.name}" (${pierwszy.status})`);
      console.log(`     do skasowania jeden z: ${pierwszy.id} / ${drugi.id}\n`);
    }
  }

  if (!ZAPISZ) console.log("\nTo była próba — nic nie zapisano. Dodaj: -- --zapisz");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exitCode = 1;
});
