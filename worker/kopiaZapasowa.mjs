// ============================================================================
// Kopia zapasowa — archiwum ZIP na dysku twardym.
//
//   npm run kopia                 → kopia do kopie/ ORAZ na Dysk Google
//   npm run kopia -- --bez-dysku  → tylko lokalnie (np. gdy nie ma sieci)
//
// Po co, skoro dane są w Supabase:
// darmowe projekty bywają usypiane po bezczynności, konto można stracić,
// a rekord skasować pomyłkowo jednym kliknięciem w panelu. Kopia leży poza tą
// infrastrukturą, więc przeżyje jej awarię.
//
// Czego ta kopia NIE robi: nie jest elementem serwowania strony. Gdy pada,
// pada tylko kopia — Gablota działa dalej. To celowe rozdzielenie.
//
// Zawartość archiwum:
//   baza/figures.json, baza/profiles.json   — dane, których nie da się odtworzyć
//   zdjecia/*.webp                          — pliki z magazynu, jeden do jednego
//   SPIS.txt                                — co, ile i kiedy
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { zbudujZip } from "./lib/zip.mjs";
import { driveConfigured, getAccessToken, ensureFolder, uploadFile } from "./lib/gdrive.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

// Wysyłka na Dysk jest DOMYŚLNA. Kopia leżąca wyłącznie na tym samym dysku,
// co projekt, nie chroni przed niczym poza pomyłkowym skasowaniem rekordu —
// awaria dysku zabrałaby ją razem z oryginałem.
const NA_DYSK = !process.argv.includes("--bez-dysku");
const KATALOG = join(__dirname, "..", "kopie");
const KUBELEK = "figure-images";

// Kopiujemy to, czego NIE DA SIĘ odtworzyć. `lookup_cache` i `lookup_queue`
// pomijamy świadomie — to wynik pracy, którą można powtórzyć.
//
// ⚠️ `characters` dopisane 04.08 i to nie jest drobiazg: po rozdzieleniu postaci
// od produktu (`npm run postacie`) TAM mieszkają wszystkie nazwy japońskie.
// Kopia bez tej tabeli oddałaby figurki bez nazw — czyli dokładnie to, nad czym
// pracowaliśmy cały dzień. Nowa tabela z danymi = nowy wpis na tej liście.
const TABELE = ["figures", "characters", "profiles", "user_collections"];

const dwie = (n) => String(n).padStart(2, "0");

// FigureFame_backup_2026-08-04_0146.zip
//
// Rok-miesiąc-dzień, bo tak posortowane alfabetycznie układają się same
// chronologicznie. Poprzedni format („280720260227") sklejał wszystko w jeden
// ciąg cyfr i nie dało się go przeczytać ani posortować.
function nazwaPliku(teraz) {
  return (
    "FigureFame_backup_" +
    teraz.getFullYear() + "-" + dwie(teraz.getMonth() + 1) + "-" + dwie(teraz.getDate()) +
    "_" + dwie(teraz.getHours()) + dwie(teraz.getMinutes()) +
    ".zip"
  );
}

async function main() {
  const supabase = getSupabaseAdmin();
  const teraz = new Date();
  const pliki = [];
  const spis = [`Kopia zapasowa FigureFame`, `Utworzona: ${teraz.toISOString()}`, ``];

  console.log("Zbieram dane:");
  for (const tabela of TABELE) {
    const { data, error } = await supabase.from(tabela).select("*");
    if (error) {
      console.log(`  ${tabela.padEnd(12)} POMINIĘTA (${error.message})`);
      spis.push(`baza/${tabela}.json — POMINIĘTA: ${error.message}`);
      continue;
    }
    pliki.push({ nazwa: `baza/${tabela}.json`, dane: Buffer.from(JSON.stringify(data, null, 2), "utf8") });
    console.log(`  ${tabela.padEnd(12)} ${data.length} wierszy`);
    spis.push(`baza/${tabela}.json — ${data.length} wierszy`);
  }

  const { data: lista, error: errLista } = await supabase.storage.from(KUBELEK).list("", { limit: 1000 });
  if (errLista) throw new Error(`lista zdjęć: ${errLista.message}`);

  let bajty = 0;
  let pobrane = 0;
  for (const obiekt of lista) {
    if (!obiekt.name || obiekt.name.startsWith(".")) continue;
    const { data, error } = await supabase.storage.from(KUBELEK).download(obiekt.name);
    if (error) {
      console.log(`  ! ${obiekt.name} — nie pobrano (${error.message})`);
      spis.push(`zdjecia/${obiekt.name} — BRAK: ${error.message}`);
      continue;
    }
    const buf = Buffer.from(await data.arrayBuffer());
    pliki.push({ nazwa: `zdjecia/${obiekt.name}`, dane: buf });
    bajty += buf.length;
    pobrane += 1;
  }
  console.log(`  zdjęcia      ${pobrane} plików, ${(bajty / 1024 / 1024).toFixed(2)} MB`);
  spis.push(`zdjecia/ — ${pobrane} plików, ${(bajty / 1024 / 1024).toFixed(2)} MB`);

  pliki.push({ nazwa: "SPIS.txt", dane: Buffer.from(spis.join("\n") + "\n", "utf8") });

  const archiwum = zbudujZip(pliki, teraz);
  mkdirSync(KATALOG, { recursive: true });
  const nazwa = nazwaPliku(teraz);
  const sciezka = join(KATALOG, nazwa);
  writeFileSync(sciezka, archiwum);

  const przed = pliki.reduce((s, p) => s + p.dane.length, 0);
  console.log(`\nZapisane: ${sciezka}`);
  console.log(`  ${pliki.length} plików · ${(archiwum.length / 1024 / 1024).toFixed(2)} MB (przed spakowaniem ${(przed / 1024 / 1024).toFixed(2)} MB)`);

  if (!NA_DYSK) {
    console.log(`\nPominięto Dysk (--bez-dysku). Kopia leży wyłącznie lokalnie.`);
    return;
  }
  if (!driveConfigured()) {
    console.log(`\nUWAGA: brak poświadczeń Dysku Google — kopia została TYLKO lokalnie.`);
    console.log(`Uruchom \`npm run gdrive-auth\`, żeby wysyłka działała.`);
    return;
  }

  // Nieudana wysyłka nie może przekreślić kopii, która już leży na dysku.
  try {
    const token = await getAccessToken();
    const folder = await ensureFolder(token, "FigureFame Kopie");
    const { link } = await uploadFile(token, folder, nazwa, archiwum, "application/zip");
    console.log(`\nWysłane na Dysk:\n  ${link}`);
  } catch (err) {
    console.log(`\nUWAGA: wysyłka na Dysk nie powiodła się (${err.message}).`);
    console.log(`Kopia lokalna jest nienaruszona: ${sciezka}`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
