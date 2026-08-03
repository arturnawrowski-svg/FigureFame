// ============================================================================
// PRZEBIEG NAPRAWCZY: rozdzielenie POSTACI od PRODUKTU.
//
//   npm run postacie              → tylko pokaż, co by się stało (nic nie zapisuje)
//   npm run postacie -- --zapisz  → wykonaj
//
// Po co: „Super Sonico" to POSTAĆ, a jej figurek jest wiele — różni producenci,
// skale, wersje. Do tej pory wszystko wisiało na jednej nazwie, więc nazwa
// japońska musiała być pobierana od nowa dla każdej figurki osobno (i notorycznie
// nie była), a wersje tej samej postaci nadpisywały się nawzajem.
//
// Po rozdzieleniu: postać ustalona RAZ, produkty wiszą na niej.
//
// ⚠️ TRZY BEZPIECZNIKI, bez których ten skrypt byłby groźny:
//
//   1. ADRES FIGURKI NIE MOŻE SIĘ ZMIENIĆ — jest wypalony w opublikowanych
//      filmach, których nie da się poprawić. Dlatego `slug` i `short_code`
//      raz nadane NIE SĄ tu w ogóle ruszane; skrypt wpisuje je wyłącznie tam,
//      gdzie ich nie ma. Osobno sprawdza, czy po rozdzieleniu dwie WIDOCZNE
//      figurki nie dostają tego samego odcisku — taki wiersz pomija.
//   2. NIC NIE GINIE BEZ ŚLADU. Przed zapisem powstaje plik w `kopie/`
//      z pełną treścią wierszy sprzed zmiany.
//   3. NIE ZGADUJEMY NAZW JAPOŃSKICH. Wartość zlepiona z łacińskiego tekstu
//      nie trafia do postaci — ląduje na liście „do decyzji". Puste pole
//      uczciwie mówi „nie wiemy"; zmyślona nazwa wygląda na sprawdzoną.
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import dotenv from "dotenv";
import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";
import { identityKey, characterKey, makeSlug } from "../src/lib/figureIdentity.js";
import { tozsamoscDlaZapisu } from "../src/lib/nadajTozsamosc.js";
import { maZnakJaponski, pusta } from "../src/lib/kompletnosc.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const KATALOG = join(__dirname, "..");
dotenv.config({ path: join(KATALOG, ".env.local") });

const ZAPISZ = process.argv.includes("--zapisz");

// Wiersze widoczne dla świata. Tylko ich dotyczy warunek unikalności w bazie
// (indeks `figures_identity_unikat` obejmuje APPROVED i PENDING), więc tylko
// tam zderzenie odcisków jest problemem — w archiwum duplikaty są dopuszczone.
const WIDOCZNE = ["APPROVED", "PENDING"];

// ---------------------------------------------------------------------------
// ROZDZIELENIE NAZWY na postać i wersję.
//
// W bazie stoją trzy wzory zapisu:
//   „Zero Two: For My Darling"  — postać i wersja, dwukropek bez odstępu przed
//   „Levi - Fortitude Ver."     — postać i wersja, myślnik w odstępach
//   „Taihou - Azur Lane"        — NIE wersja: do nazwy dopisano serię
//
// Myślnik wymaga odstępów po OBU stronach, bo „HMX-17c Silfa" ma go w środku
// wyrazu i tego nie wolno tknąć. Dwukropek wystarcza z odstępem po prawej.
// ---------------------------------------------------------------------------
const SEPARATOR = /\s+[-—]\s+|:\s+/;

const jakKlucz = (v) => String(v || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function rozdzielNazwe(nazwa, seria) {
  const tekst = String(nazwa || "").trim();
  const czesci = tekst.split(SEPARATOR);
  if (czesci.length < 2) return { postac: tekst, wersja: "", uwaga: "" };

  const postac = czesci[0].trim();
  const ogon = czesci.slice(1).join(" ").trim();

  // Ogon powtarzający serię to nie wersja — to śmieć w nazwie.
  if (jakKlucz(ogon) === jakKlucz(seria)) {
    return { postac, wersja: "", uwaga: "z nazwy wypada powtórzona nazwa serii" };
  }

  return { postac, wersja: ogon, uwaga: "" };
}

// ---------------------------------------------------------------------------
// NAZWA JAPOŃSKA POSTACI — zasada „lepiej pusto niż źle".
//
// Wartości w tej kolumnie są dziś różnego pochodzenia i część jest nieprawdziwa
// (`先代萌絵が原` przy Hitagi to wymysł modelu). Część miesza dwa fakty:
// „木之本桜 Stars Bless You" to postać PLUS tytuł produktu.
//
// Rozcięcia takiej wartości NIE DA SIĘ zrobić regułą — raz właściwa część jest
// pierwsza („初音ミク V4X"), raz druga („ARTFX J リヴァイ ..."). Dlatego:
//
//   • sam japoński            → bierzemy (odstęp bywa rozdzieleniem nazwiska
//                               i imienia, jak „曽根 美雪" — to poprawny zapis)
//   • japoński z łacinką      → NIE bierzemy, oddajemy człowiekowi
//   • cokolwiek innego        → NIE bierzemy
//
// Każda wzięta wartość dostaje pochodzenie „nieznane": leżała w bazie od dawna
// i nie wiemy, czy przyszła z katalogu, czy od modelu. Etap D ma ją potwierdzić.
// ---------------------------------------------------------------------------
function czystaNazwaJaponska(v) {
  if (pusta(v) || !maZnakJaponski(v)) return { wartosc: "", powod: "brak albo nie po japońsku" };
  const tekst = String(v).trim();
  if (/[A-Za-z]/.test(tekst)) {
    return { wartosc: "", powod: "japoński zlepiony z tekstem łacińskim — nie wiadomo, co jest nazwą postaci" };
  }
  // Odstęp w samym japońskim bywa rozdzieleniem nazwiska i imienia, ale bywa też
  // zlepieniem linii produktowej z postacią („ハルモニアハミング レム").
  // Bierzemy, ale zgłaszamy do sprawdzenia.
  return { wartosc: tekst, powod: "", sprawdz: /\s/.test(tekst) };
}

function czystaSeriaJaponska(v) {
  if (pusta(v) || !maZnakJaponski(v)) return "";
  return /[A-Za-z]/.test(String(v)) ? "" : String(v).trim();
}

// Pola, w których zwykła spacja na brzegu psuje dopasowania („Kotobukiya ").
// Skoro i tak dotykamy tych wierszy, porządkujemy je tą samą regułą, którą od
// szczebla B stosuje brama zapisu.
const DO_OCZYSZCZENIA = ["manufacturer", "series", "scale", "type", "original_price"];

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: figures, error } = await supabase
    .from("figures")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const { data: istniejacePostacie } = await supabase.from("characters").select("*");

  // -------------------------------------------------------------------------
  // KROK 1: policz, co z czego wyjdzie.
  // -------------------------------------------------------------------------
  const postacie = new Map();
  const plan = [];
  const doDecyzji = [];

  for (const fig of figures) {
    const { postac, wersja, uwaga } = rozdzielNazwe(fig.name, fig.series);

    const odciskPrzed = fig.identity_key || identityKey(fig);
    const odciskPo = identityKey({ ...fig, name: postac, version: wersja });

    const klucz = characterKey({ name: postac, series: fig.series });
    if (!postacie.has(klucz)) {
      postacie.set(klucz, {
        klucz,
        name: postac,
        series: fig.series ? String(fig.series).trim() : null,
        japanese_name: "",
        japanese_series: "",
        warianty: new Set(),
        figurki: [],
      });
    }
    const p = postacie.get(klucz);
    p.figurki.push(fig);

    const czysta = czystaNazwaJaponska(fig.japanese_name);
    if (czysta.wartosc) {
      p.warianty.add(czysta.wartosc);
      if (!p.japanese_name) p.japanese_name = czysta.wartosc;
      if (czysta.sprawdz) {
        doDecyzji.push({
          rodzaj: "nazwa japońska — warto sprawdzić",
          figurka: fig.name,
          status: fig.status,
          opis: `„${fig.japanese_name}" — odstęp w środku. Bywa rozdzieleniem nazwiska i imienia (poprawnie), bywa nazwą linii produktowej zlepioną z postacią (błąd). Przepisuję do postaci.`,
        });
      }
    } else if (!pusta(fig.japanese_name)) {
      doDecyzji.push({
        rodzaj: "nazwa japońska — NIE przepisuję",
        figurka: fig.name,
        status: fig.status,
        opis: `„${fig.japanese_name}" — ${czysta.powod}.`,
      });
    }
    if (!p.japanese_series) p.japanese_series = czystaSeriaJaponska(fig.japanese_series);

    // Porządki w polach tekstowych — tylko gdy naprawdę jest co poprawiać.
    const porzadki = {};
    for (const pole of DO_OCZYSZCZENIA) {
      const v = fig[pole];
      if (typeof v !== "string") continue;
      const czysty = v.replace(/\s+/g, " ").trim();
      if (czysty !== v) porzadki[pole] = czysty === "" ? null : czysty;
    }

    plan.push({
      fig,
      postac,
      wersja,
      uwaga,
      klucz,
      odciskPrzed,
      odciskPo,
      porzadki,
      // Nazwa, jaką po zmianie zobaczy Gablota: widok `figures_full` składa ją
      // z postaci i wersji, więc myślnik zamienia się w dwukropek.
      nazwaNaEkranie: wersja ? `${postac}: ${wersja}` : postac,
    });
  }

  // BEZPIECZNIK 1b: czy po rozdzieleniu dwie WIDOCZNE figurki nie dostają tego
  // samego odcisku. Taki zapis odbiłby się od warunku unikalności w bazie —
  // i słusznie, bo znaczyłby, że uznaliśmy dwa różne produkty za jeden.
  const wgOdcisku = new Map();
  for (const z of plan) {
    if (!WIDOCZNE.includes(z.fig.status)) continue;
    if (!wgOdcisku.has(z.odciskPo)) wgOdcisku.set(z.odciskPo, []);
    wgOdcisku.get(z.odciskPo).push(z);
  }
  const zderzenia = [...wgOdcisku.values()].filter((g) => g.length > 1);
  const zablokowane = new Set(zderzenia.flat().map((z) => z.fig.id));

  // Ta sama postać zapisana na dwa sposoby — do decyzji, nie do scalenia
  // automatem. Zlanie dwóch postaci w jedną to podanie danych innej figurki.
  const wgNazwy = new Map();
  for (const p of postacie.values()) {
    const n = jakKlucz(p.name);
    if (!wgNazwy.has(n)) wgNazwy.set(n, []);
    wgNazwy.get(n).push(p);
  }
  for (const [, grupa] of wgNazwy) {
    if (grupa.length > 1) {
      doDecyzji.push({
        rodzaj: "ta sama postać w różnych seriach",
        figurka: grupa[0].name,
        status: "—",
        opis: `serie: ${grupa.map((g) => `„${g.series}"`).join(" / ")}. Zakładam OSOBNE postacie; scalenie to Twoja decyzja.`,
      });
    }
  }
  for (const p of postacie.values()) {
    if (p.warianty.size > 1) {
      doDecyzji.push({
        rodzaj: "rozbieżna pisownia nazwy japońskiej",
        figurka: p.name,
        status: "—",
        opis: `warianty: ${[...p.warianty].map((w) => `„${w}"`).join(" / ")}. Biorę „${p.japanese_name}".`,
      });
    }
  }

  // -------------------------------------------------------------------------
  // KROK 2: pokaż.
  // -------------------------------------------------------------------------
  const zmianaNazwy = plan.filter((z) => z.nazwaNaEkranie !== z.fig.name);
  const zmianaOdcisku = plan.filter((z) => z.odciskPrzed !== z.odciskPo);
  const bezAdresu = plan.filter((z) => pusta(z.fig.slug) || pusta(z.fig.short_code));
  const zPorzadkami = plan.filter((z) => Object.keys(z.porzadki).length > 0);
  const zJP = [...postacie.values()].filter((p) => p.japanese_name).length;

  console.log("");
  console.log("=".repeat(78));
  console.log(`  ROZDZIELENIE POSTACI OD PRODUKTU — ${ZAPISZ ? "ZAPIS" : "PODGLĄD (nic nie zapisuję)"}`);
  console.log("=".repeat(78));
  console.log(`  figurek: ${figures.length}  ·  postaci wyjdzie: ${postacie.size} (z nazwą japońską: ${zJP})  ·  jest już w bazie: ${istniejacePostacie?.length ?? 0}`);

  console.log("");
  console.log(`1. POSTACIE DO ZAŁOŻENIA (${postacie.size})`);
  console.log("");
  for (const p of [...postacie.values()].sort((a, b) => b.figurki.length - a.figurki.length)) {
    console.log(`  ${p.name}  [${p.series || "bez serii"}]  — figurek: ${p.figurki.length}`);
    console.log(`      po japońsku: ${p.japanese_name || "— (do uzupełnienia z katalogu)"}${p.japanese_series ? `  ·  seria: ${p.japanese_series}` : ""}`);
  }

  console.log("");
  console.log(`2. NAZWY, KTÓRE ZMIENIĄ WYGLĄD NA GABLOCIE (${zmianaNazwy.length})`);
  if (zmianaNazwy.length === 0) console.log("    żadna");
  for (const z of zmianaNazwy) {
    console.log(`    „${z.fig.name}"  →  „${z.nazwaNaEkranie}"${z.uwaga ? `   (${z.uwaga})` : ""}`);
  }

  console.log("");
  console.log(`3. ADRESY FIGUREK (/f/…)`);
  console.log(`    ✔ żaden istniejący adres nie jest ruszany — skrypt wpisuje adres tylko tam, gdzie go nie ma`);
  if (bezAdresu.length > 0) {
    console.log(`    Dostaną adres teraz (${bezAdresu.length}):`);
    for (const z of bezAdresu) {
      const t = tozsamoscDlaZapisu({ ...z.fig, name: z.postac, version: z.wersja }, z.fig);
      console.log(`      ${z.fig.name}  →  /f/${t.slug || t.short_code}`);
    }
  }

  console.log("");
  console.log(`4. ODCISK DUPLIKATU — przeliczany (${zmianaOdcisku.length} zmian)`);
  for (const z of zmianaOdcisku) {
    console.log(`    ${z.fig.name} [${z.fig.status}]`);
    console.log(`        ${z.odciskPrzed}  →  ${z.odciskPo}`);
  }
  if (zderzenia.length === 0) {
    console.log(`    ✔ żadne dwie widoczne figurki nie dostają tego samego odcisku`);
  } else {
    console.log(`    ✗ ZDERZENIE — te wiersze POMIJAM (dwa różne produkty wyszłyby na jeden):`);
    for (const g of zderzenia) {
      console.log(`      odcisk ${g[0].odciskPo}:`);
      for (const z of g) console.log(`        ${z.fig.name} [${z.fig.status}]`);
    }
  }

  if (zPorzadkami.length > 0) {
    console.log("");
    console.log(`5. PORZĄDKI W POLACH TEKSTOWYCH (${zPorzadkami.length})`);
    for (const z of zPorzadkami) {
      for (const [pole, wartosc] of Object.entries(z.porzadki)) {
        console.log(`    ${z.fig.name} · ${pole}: „${z.fig[pole]}"  →  „${wartosc}"`);
      }
    }
  }

  console.log("");
  console.log(`6. DO DECYZJI CZŁOWIEKA (${doDecyzji.length}) — skrypt tego NIE rozstrzyga`);
  if (doDecyzji.length === 0) console.log("    nic");
  for (const d of doDecyzji) {
    console.log(`    [${d.rodzaj}] ${d.figurka} (${d.status})`);
    console.log(`        ${d.opis}`);
  }

  // -------------------------------------------------------------------------
  // KROK 3: zapisz (tylko z --zapisz).
  // -------------------------------------------------------------------------
  if (!ZAPISZ) {
    console.log("");
    console.log("=".repeat(78));
    console.log("  To był PODGLĄD. Nic nie zostało zapisane.");
    console.log("  Gdy przejrzysz listy wyżej:  npm run postacie -- --zapisz");
    console.log("=".repeat(78));
    console.log("");
    return;
  }

  // BEZPIECZNIK 2: kopia treści sprzed zmiany.
  mkdirSync(join(KATALOG, "kopie"), { recursive: true });
  const plikKopii = join(KATALOG, "kopie", `przed-rozdzieleniem-${new Date().toISOString().slice(0, 10)}.json`);
  writeFileSync(plikKopii, JSON.stringify(figures, null, 2), "utf8");
  console.log("");
  console.log(`Kopia wierszy sprzed zmiany: ${plikKopii}`);

  const idPostaci = new Map();
  for (const p of postacie.values()) {
    const juzJest = (istniejacePostacie || []).find((c) => c.identity_key === p.klucz);
    if (juzJest) {
      idPostaci.set(p.klucz, juzJest.id);
      continue;
    }
    const { data, error: errP } = await supabase
      .from("characters")
      .insert({
        name: p.name,
        series: p.series,
        japanese_name: p.japanese_name || null,
        japanese_series: p.japanese_series || null,
        identity_key: p.klucz,
        provenance: p.japanese_name ? { japanese_name: "nieznane" } : {},
      })
      .select("id")
      .single();
    if (errP) {
      console.log(`  ✗ nie założyłem postaci „${p.name}": ${errP.message}`);
      continue;
    }
    idPostaci.set(p.klucz, data.id);
    console.log(`  + postać: ${p.name}`);
  }

  let zapisane = 0;
  let pominiete = 0;
  for (const z of plan) {
    if (zablokowane.has(z.fig.id)) {
      pominiete += 1;
      continue; // BEZPIECZNIK 1b — zderzenie odcisków
    }
    const character_id = idPostaci.get(z.klucz);
    if (!character_id) {
      pominiete += 1;
      continue;
    }

    const zmiany = {
      ...z.porzadki,
      character_id,
      name: z.postac,
      version: z.wersja || null,
      // Prawda o postaci mieszka od teraz w tabeli `characters` — Gablota czyta
      // ją stamtąd. Zostawienie starej wartości tutaj znaczyłoby dwa źródła
      // prawdy o jednym fakcie, czyli powrót do choroby, którą leczymy.
      // Kopia sprzed zmiany leży w `kopie/`, więc nic nie ginie bezpowrotnie.
      japanese_name: null,
      japanese_series: null,
      identity_key: z.odciskPo,
    };
    // ⚠️ `slug` i `short_code` NIE są tu podmieniane — wpisujemy je wyłącznie
    // tam, gdzie ich nie ma. Adres wypalony w filmie musi działać zawsze.
    const t = tozsamoscDlaZapisu({ ...z.fig, name: z.postac, version: z.wersja }, z.fig);
    if (!z.fig.slug && t.slug) zmiany.slug = t.slug;
    if (!z.fig.short_code) zmiany.short_code = t.short_code;

    const { error: errF } = await supabase.from("figures").update(zmiany).eq("id", z.fig.id);
    if (errF) {
      console.log(`  ✗ ${z.fig.name}: ${errF.message}`);
      pominiete += 1;
      continue;
    }
    zapisane += 1;
  }

  console.log("");
  console.log("=".repeat(78));
  console.log(`  Zapisane: ${zapisane}  ·  pominięte: ${pominiete}`);
  console.log("  Sprawdź teraz: npm run audyt-bazy");
  console.log("=".repeat(78));
  console.log("");
}

main().catch((e) => {
  console.error("BŁĄD:", e.message);
  process.exitCode = 1;
});
