// ============================================================================
// AUDYT BAZY — jedno polecenie, które mówi, ile brakuje do perfekcyjnej bazy.
//
//   npm run audyt-bazy              → zestawienie + lista usterek
//   npm run audyt-bazy -- --json    → to samo maszynowo (do porównywania w czasie)
//   npm run audyt-bazy -- --wszystko → także ARCHIWUM figurka po figurce
//
// Po co: „baza jest w porządku" było dotąd wrażeniem. Trzy audyty z zewnątrz
// czytały kod i nie uruchomiły ani jednego zapytania — myliły się w połowie
// przypadków, w OBIE strony (patrz TODO.md, sekcja „Sprawdzone — NIE jest
// problemem"). Ten skrypt nie czyta kodu. Pyta bazę i pokazuje liczby.
//
// NICZEGO NIE ZAPISUJE. Można go uruchamiać bez namysłu i o to chodzi:
// miernik, którego boisz się włączyć, nie jest miernikiem.
//
// Reguły „co jest kompletem" i „co jest usterką" NIE SĄ tutaj — są
// w src/lib/kompletnosc.js, wspólne z panelem. Gdyby były tu, audyt mógłby
// pokazywać komplet w chwili, gdy panel pokazuje braki.
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import {
  POLA_KOMPLETU,
  czegoBrakuje,
  uwagiDoFigurki,
  stanZdjecia,
  pusta,
} from "../src/lib/kompletnosc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KATALOG_PROJEKTU = join(__dirname, "..");
dotenv.config({ path: join(KATALOG_PROJEKTU, ".env.local") });

const JAKO_JSON = process.argv.includes("--json");
const WSZYSTKO = process.argv.includes("--wszystko");

// Statusy w kolejności, w jakiej nas obchodzą. ARCHIWUM nie musi być doskonałe
// — trzymamy je osobno, żeby dziewięć starych wierszy nie zawyżało obrazu
// dwunastu, nad którymi naprawdę pracujemy.
const STATUSY = [
  ["APPROVED", "w Gablocie"],
  ["PENDING", "do moderacji"],
  ["ARCHIVED", "archiwum"],
];

const log = (...a) => { if (!JAKO_JSON) console.log(...a); };

/** Tabelka o stałej szerokości — czytelna w terminalu i przy kopiowaniu. */
function tabela(naglowki, wiersze) {
  const szer = naglowki.map((h, i) =>
    Math.max(String(h).length, ...wiersze.map((w) => String(w[i] ?? "").length))
  );
  const linia = (znak) => szer.map((s) => znak.repeat(s + 2)).join("+");
  const wiersz = (kom) =>
    "| " + kom.map((c, i) => {
      const t = String(c ?? "");
      return i === 0 ? t.padEnd(szer[i]) : t.padStart(szer[i]);
    }).join(" | ") + " |";

  log(linia("-"));
  log(wiersz(naglowki));
  log(linia("="));
  for (const w of wiersze) log(wiersz(w));
  log(linia("-"));
}

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: figures, error } = await supabase
    .from("figures")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { count: liczbaPostaci } = await supabase
    .from("characters")
    .select("*", { count: "exact", head: true });

  const { data: cache } = await supabase.from("lookup_cache").select("key");

  // --------------------------------------------------------------------------
  // Usterki wiersz po wierszu. Do listy z kompletnosc.js dokładamy jedną rzecz,
  // której tamten plik sprawdzić nie może, bo nie wolno mu importować `node:fs`:
  // czy lokalny plik z zasiewu w ogóle ISTNIEJE. Dwa wiersze Taihou wskazują na
  // `taihou_figure`, a takiego pliku w /public/images nie ma — Gablota pokazuje
  // tam dziurę i nie mówi o tym ani słowa.
  // --------------------------------------------------------------------------
  const raport = figures.map((fig) => {
    const uwagi = [...uwagiDoFigurki(fig)];
    const zdj = stanZdjecia(fig.official_image_url);
    if (zdj.stan === "lokalny") {
      const jest = ["png", "jpg", "jpeg", "webp", "avif"].some((ext) =>
        existsSync(join(KATALOG_PROJEKTU, "public", "images", `${zdj.plik}.${ext}`))
      );
      if (!jest) {
        // Podmieniamy łagodną uwagę „to zasiew" na twardy błąd — pliku NIE MA.
        const i = uwagi.findIndex((u) => u.kod === "zdjecie-zasiew");
        if (i >= 0) uwagi.splice(i, 1);
        uwagi.push({
          kod: "zdjecie-znikad",
          waga: "blad",
          opis: `official_image_url: „${zdj.plik}" — takiego pliku nie ma ani w naszym magazynie, ani w /public/images`,
        });
      }
    }
    return {
      id: fig.id,
      nazwa: fig.name,
      status: fig.status,
      braki: czegoBrakuje(fig),
      bledy: uwagi.filter((u) => u.waga === "blad"),
      uwagi: uwagi.filter((u) => u.waga === "uwaga"),
    };
  });

  const wgStatusu = (status) => raport.filter((r) => r.status === status);
  const doPracy = raport.filter((r) => r.status !== "ARCHIVED");

  log("");
  log("=".repeat(78));
  log(`  AUDYT BAZY FIGUREFAME — ${new Date().toLocaleString("pl-PL")}`);
  log("=".repeat(78));
  log(`  figurek: ${figures.length}  ·  postaci: ${liczbaPostaci ?? 0}  ·  wpisów w pamięci: ${cache?.length ?? 0}`);
  for (const [status, opis] of STATUSY) {
    log(`  ${status.padEnd(9)} ${opis.padEnd(14)} ${wgStatusu(status).length}`);
  }

  // --------------------------------------------------------------------------
  // 1. KOMPLET — te cztery pola kończą szukanie danych
  // --------------------------------------------------------------------------
  log("");
  log("1. KOMPLET DANYCH (to samo, czego pilnuje przycisk szukania)");
  log("");
  tabela(
    ["pole", ...STATUSY.map(([s]) => s), "razem brak"],
    [
      ...POLA_KOMPLETU.map(([pole, etykieta, ma]) => {
        const brakiWg = STATUSY.map(([status]) =>
          figures.filter((f) => f.status === status && !ma(f[pole])).length
        );
        return [etykieta, ...brakiWg, brakiWg.reduce((a, b) => a + b, 0)];
      }),
      [
        "— figurki z KOMPLETEM",
        ...STATUSY.map(([status]) => wgStatusu(status).filter((r) => r.braki.length === 0).length),
        raport.filter((r) => r.braki.length === 0).length,
      ],
    ]
  );

  // --------------------------------------------------------------------------
  // 2. TOŻSAMOŚĆ I POCHODZENIE — bez tego nie ma czym naprawiać
  // --------------------------------------------------------------------------
  const POLA_DODATKOWE = [
    ["identity_key", "odcisk (identity_key)"],
    ["slug", "adres (slug)"],
    ["short_code", "kod (short_code)"],
    ["character_id", "postać (character_id)"],
    ["version", "wersja produktu"],
    ["provenance", "pochodzenie (provenance)"],
    ["source_url", "adres źródła"],
    ["external_ids", "numery w katalogach"],
    ["image_credit", "podpis zdjęcia"],
    ["japanese_series", "japońska seria"],
    ["release_date", "data premiery"],
    ["submitted_by", "zgłaszający"],
  ];
  log("");
  log("2. TOŻSAMOŚĆ, POCHODZENIE, RESZTA POL (liczby to BRAKI)");
  log("");
  tabela(
    ["pole", ...STATUSY.map(([s]) => s), "razem brak"],
    POLA_DODATKOWE.map(([pole, etykieta]) => {
      const wg = STATUSY.map(([status]) =>
        figures.filter((f) => f.status === status && pusta(f[pole])).length
      );
      return [etykieta, ...wg, wg.reduce((a, b) => a + b, 0)];
    })
  );

  // --------------------------------------------------------------------------
  // 3. BŁĘDY — dane nieprawdziwe albo złamana reguła projektu
  // --------------------------------------------------------------------------
  const wgKodu = new Map();
  for (const r of raport) {
    for (const u of [...r.bledy, ...r.uwagi]) {
      if (!wgKodu.has(u.kod)) wgKodu.set(u.kod, { waga: u.waga, wiersze: [] });
      wgKodu.get(u.kod).wiersze.push({ nazwa: r.nazwa, status: r.status, opis: u.opis });
    }
  }
  const kody = [...wgKodu.entries()].sort(
    (a, b) => (a[1].waga === b[1].waga ? b[1].wiersze.length - a[1].wiersze.length : a[1].waga === "blad" ? -1 : 1)
  );

  log("");
  log("3. USTERKI (■ błąd — nieprawda albo złamana reguła · □ uwaga — stan pośredni)");
  log("");
  tabela(
    ["kod", "waga", "ile wierszy"],
    kody.map(([kod, v]) => [kod, v.waga === "blad" ? "■ błąd" : "□ uwaga", v.wiersze.length])
  );

  for (const [kod, v] of kody) {
    if (v.waga !== "blad") continue;
    log("");
    log(`■ ${kod} (${v.wiersze.length})`);
    for (const w of v.wiersze) log(`    ${w.status.padEnd(9)} ${w.nazwa} — ${w.opis}`);
  }

  // --------------------------------------------------------------------------
  // 4. DUPLIKATY — sprawdzenie MIĘDZY wierszami, więc nie da się go zrobić
  //    w kompletnosc.js (tamten widzi jeden wiersz).
  //
  //    Uwaga na indeks: `figures_identity_unikat` obejmuje wyłącznie APPROVED
  //    i PENDING, więc dwa identyczne wpisy w ARCHIWUM przechodzą przez bazę
  //    bez protestu. To zapewne zamierzone (archiwum nie musi być czyste),
  //    ale trzeba je zobaczyć, żeby zdecydować.
  // --------------------------------------------------------------------------
  const wgOdcisku = new Map();
  for (const f of figures) {
    if (pusta(f.identity_key)) continue;
    if (!wgOdcisku.has(f.identity_key)) wgOdcisku.set(f.identity_key, []);
    wgOdcisku.get(f.identity_key).push(f);
  }
  const duplikaty = [...wgOdcisku.entries()].filter(([, v]) => v.length > 1);

  log("");
  log(`4. TEN SAM ODCISK W KILKU WIERSZACH (${duplikaty.length})`);
  if (duplikaty.length === 0) log("    brak");
  for (const [klucz, wiersze] of duplikaty) {
    log("");
    log(`  ${klucz}`);
    for (const f of wiersze) log(`    ${f.status.padEnd(9)} ${f.slug || "(bez adresu)"}  ${f.id}`);
  }

  // --------------------------------------------------------------------------
  // 5. POSTAĆ POD DWOMA KLUCZAMI W PAMIĘCI
  //
  //    Klucz postaci (`char|nazwa|seria`) ma dawać JEDEN wpis na postać — na tym
  //    stoi obietnica „japońską nazwę pobieramy raz". W bazie są dziś dwa wpisy
  //    na Konatę (`konataizumi` i `izumikonata`) i dwa na Sawatari (raz seria
  //    `hesmymaster`, raz `koregawatashinogoshujinsama`). Kolejność imienia
  //    i alias serii rozdwajają postać, a wtedy tłumaczenie leci drugi raz.
  //    Wykrywamy to po posortowanych literach nazwy — anagram nie jest dowodem,
  //    ale trafia dokładnie w te dwa przypadki i nie hałasuje przy innych.
  // --------------------------------------------------------------------------
  const kluczePostaci = (cache || []).map((c) => c.key).filter((k) => k?.startsWith("char|"));
  const wgOdciskuNazwy = new Map();
  for (const k of kluczePostaci) {
    const [, nazwa = "", seria = ""] = k.split("|");
    const odcisk = [...nazwa].sort().join("");
    if (!wgOdciskuNazwy.has(odcisk)) wgOdciskuNazwy.set(odcisk, new Map());
    wgOdciskuNazwy.get(odcisk).set(k, seria);
  }
  const rozdwojone = [...wgOdciskuNazwy.values()].filter((m) => m.size > 1);

  log("");
  log(`5. POSTAĆ POD KILKOMA KLUCZAMI W PAMIĘCI (${rozdwojone.length})`);
  if (rozdwojone.length === 0) log("    brak");
  for (const m of rozdwojone) {
    log("");
    for (const k of m.keys()) log(`    ${k}`);
  }

  // --------------------------------------------------------------------------
  // 6. FIGURKA PO FIGURCE — to jest lista roboczej pracy
  // --------------------------------------------------------------------------
  const doWypisania = WSZYSTKO ? raport : doPracy;
  log("");
  log(`6. FIGURKA PO FIGURCE (${doWypisania.length}${WSZYSTKO ? "" : " — bez archiwum, dodaj --wszystko"})`);
  for (const r of doWypisania) {
    const czyste = r.braki.length === 0 && r.bledy.length === 0 && r.uwagi.length === 0;
    log("");
    log(`  ${czyste ? "✔" : r.bledy.length ? "■" : "□"} ${r.nazwa}  [${r.status}]`);
    if (r.braki.length) log(`      brakuje: ${r.braki.join(", ")}`);
    for (const u of r.bledy) log(`      ■ ${u.opis}`);
    for (const u of r.uwagi) log(`      □ ${u.opis}`);
  }

  // --------------------------------------------------------------------------
  // WERDYKT
  // --------------------------------------------------------------------------
  const bledowRazem = raport.reduce((s, r) => s + r.bledy.length, 0);
  const bledowDoPracy = doPracy.reduce((s, r) => s + r.bledy.length, 0);
  const brakowDoPracy = doPracy.reduce((s, r) => s + r.braki.length, 0);
  const gotowe = doPracy.filter((r) => r.braki.length === 0 && r.bledy.length === 0).length;

  log("");
  log("=".repeat(78));
  log(`  BEZ ARCHIWUM (${doPracy.length} figurek): ${gotowe} bez zarzutu · ${brakowDoPracy} braków · ${bledowDoPracy} błędów`);
  log(`  Z ARCHIWUM (${raport.length} figurek): ${bledowRazem} błędów`);
  log("=".repeat(78));
  log("");
  log('  Docelowo: „bez zarzutu" równe liczbie figurek, zero braków, zero błędów.');
  log("  Skrypt niczego nie zapisał.");
  log("");

  if (JAKO_JSON) {
    console.log(JSON.stringify({
      kiedy: new Date().toISOString(),
      figurek: figures.length,
      postaci: liczbaPostaci ?? 0,
      wgStatusu: Object.fromEntries(STATUSY.map(([s]) => [s, wgStatusu(s).length])),
      brakiWgPola: Object.fromEntries(POLA_KOMPLETU.map(([pole, , ma]) => [
        pole, figures.filter((f) => !ma(f[pole])).length,
      ])),
      usterkiWgKodu: Object.fromEntries(kody.map(([kod, v]) => [kod, v.wiersze.length])),
      duplikaty: duplikaty.map(([k, v]) => ({ odcisk: k, ile: v.length })),
      figurki: raport.map((r) => ({
        nazwa: r.nazwa, status: r.status, braki: r.braki,
        bledy: r.bledy.map((u) => u.kod), uwagi: r.uwagi.map((u) => u.kod),
      })),
    }, null, 2));
  }

  // Kod wyjścia mówi o tym, co można naprawić: błędy w wierszach, nad którymi
  // pracujemy. Archiwum nie blokuje, bo tam część usterek jest zamierzona.
  process.exitCode = bledowDoPracy > 0 ? 1 : 0;
}

main().catch((e) => {
  console.error("BŁĄD AUDYTU:", e.message);
  process.exitCode = 2;
});
