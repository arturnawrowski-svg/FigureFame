// ============================================================================
// Czy ZWYKŁY GOŚĆ widzi to, co ma widzieć?
//
//   node scripts/sprawdz-odczyt-goscia.mjs
//
// Po co osobne narzędzie: wszystkie nasze skrypty chodzą po bazie kluczem
// `service_role`, który OMIJA reguły dostępu. Zapytanie działające w audycie
// może więc zwracać zero wierszy odwiedzającemu — a wtedy Gablota jest pusta
// i nie ma o tym ani słowa w konsoli. Ten skrypt pyta bazę kluczem publicznym,
// czyli dokładnie tak, jak pyta przeglądarka gościa.
//
// Niczego nie zapisuje.
// ============================================================================
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env.local") });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Co gość MUSI widzieć i ile najmniej wierszy się spodziewamy.
const SPRAWDZENIA = [
  {
    opis: "Gablota (figures_full, APPROVED)",
    minimum: 1,
    zapytanie: () => supabase
      .from("figures_full")
      .select("id, name, japanese_name, character_name, version, manufacturer")
      .eq("status", "APPROVED"),
  },
  {
    opis: "Postacie (characters)",
    minimum: 1,
    zapytanie: () => supabase.from("characters").select("id, slug, name, japanese_name"),
  },
];

// Czego gość widzieć NIE MOŻE — granica moderacji.
const ZAKAZANE = [
  {
    opis: "zgłoszenia PENDING przez widok",
    zapytanie: () => supabase.from("figures_full").select("id").eq("status", "PENDING"),
  },
];

let bledy = 0;

for (const s of SPRAWDZENIA) {
  const { data, error } = await s.zapytanie();
  if (error) {
    console.log(`✗ ${s.opis}: ${error.message}`);
    bledy += 1;
  } else if ((data?.length || 0) < s.minimum) {
    console.log(`✗ ${s.opis}: gość widzi ${data?.length || 0} wierszy, a powinien co najmniej ${s.minimum}`);
    bledy += 1;
  } else {
    console.log(`✔ ${s.opis}: ${data.length} wierszy`);
    const p = data[0];
    console.log(`    przykład: ${JSON.stringify(p)}`);
  }
}

for (const z of ZAKAZANE) {
  const { data, error } = await z.zapytanie();
  // Błąd też jest dobrą odpowiedzią — znaczy, że reguły nie przepuściły.
  const ile = error ? 0 : data?.length || 0;
  if (ile > 0) {
    console.log(`✗ GRANICA MODERACJI: gość widzi ${ile} × ${z.opis}`);
    bledy += 1;
  } else {
    console.log(`✔ gość NIE widzi: ${z.opis}`);
  }
}

console.log(bledy === 0 ? "\nWszystko w porządku." : `\n${bledy} problem(ów).`);
process.exitCode = bledy === 0 ? 0 : 1;
