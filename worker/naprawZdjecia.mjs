// ============================================================================
// Ściągnięcie do siebie zdjęć, które wiszą na cudzych serwerach.
//
//   npm run zdjecia             → pokaż, co by się stało (nic nie zapisuje)
//   npm run zdjecia -- --zapisz → pobierz, przerób na webp, podmień w bazie
//
// Po co: figurka z adresem zdjęcia na static.myfigurecollection.net albo
// images.goodsmile.info wygląda dobrze do dnia, w którym tamten serwer skasuje
// plik, przestawi ścieżki albo zablokuje podlinkowanie z obcych stron. Wtedy
// w Gablocie robi się dziura, o której dowiemy się od użytkownika.
//
// Skrypt jest bezpieczny do wielokrotnego uruchomienia: rekordy, które mają już
// zdjęcie w naszym magazynie, pomija bez tknięcia.
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { rehostImage } from "../server-lib/figureImage.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const ZAPISZ = process.argv.includes("--zapisz");

const nasze = (url) => typeof url === "string" && url.includes("supabase.co");
const zewnetrzne = (url) => typeof url === "string" && url.startsWith("http") && !nasze(url);

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: figury, error } = await supabase
    .from("figures")
    .select("id, name, status, official_image_url")
    .order("status", { ascending: true });
  if (error) throw new Error(`odczyt figurek: ${error.message}`);

  const doNaprawy = figury.filter((f) => zewnetrzne(f.official_image_url));

  console.log(`Figurek w bazie: ${figury.length}`);
  console.log(`Ze zdjęciem na cudzym serwerze: ${doNaprawy.length}`);
  if (!doNaprawy.length) {
    console.log("Nie ma czego naprawiać.");
    return;
  }

  // Te z Gabloty najpierw — one są widoczne publicznie, więc ich zniknięcie
  // boli najbardziej.
  doNaprawy.sort((a, b) => (a.status === "APPROVED" ? -1 : 0) - (b.status === "APPROVED" ? -1 : 0));

  if (!ZAPISZ) {
    console.log("\nPRÓBA NA SUCHO — nic nie zostanie zapisane. Dopisz --zapisz, żeby wykonać.\n");
    doNaprawy.forEach((f) => console.log(`  [${f.status}] ${f.name}\n      ${f.official_image_url}`));
    return;
  }

  let udane = 0;
  const nieudane = [];

  for (const f of doNaprawy) {
    process.stdout.write(`  [${f.status}] ${f.name} … `);
    try {
      const nowy = await rehostImage(f.official_image_url, f.name);
      if (!nowy || !nasze(nowy)) {
        nieudane.push({ ...f, powod: "nie udało się pobrać zdjęcia" });
        console.log("NIE POBRANO");
        continue;
      }

      const { error: errZapis } = await supabase
        .from("figures")
        .update({ official_image_url: nowy })
        .eq("id", f.id);
      if (errZapis) {
        nieudane.push({ ...f, powod: errZapis.message });
        console.log("BŁĄD ZAPISU");
        continue;
      }

      udane += 1;
      console.log(`OK → ${nowy.split("/").pop()}`);
    } catch (e) {
      nieudane.push({ ...f, powod: e.message });
      console.log(`BŁĄD (${e.message})`);
    }
  }

  console.log(`\nPrzeniesione do naszego magazynu: ${udane} z ${doNaprawy.length}`);
  if (nieudane.length) {
    console.log("\nNIE UDAŁO SIĘ — zostają ze starym adresem, trzeba dodać zdjęcie ręcznie:");
    nieudane.forEach((f) => console.log(`  [${f.status}] ${f.name} — ${f.powod}`));
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
