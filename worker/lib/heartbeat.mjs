// ============================================================================
// Bicie serca Studia — informuje panel, że komputer domowy pracuje.
// ----------------------------------------------------------------------------
// Bez tego moderator nie ma jak odróżnić „system nie działa" od „Studio jest
// wyłączone". Zamiast zgadywać, panel pokazuje wprost: 🟢 aktywne / 🔴 wyłączone.
//
// Nazwa stacji: STUDIO_STATION z .env.local, a gdy jej brak — nazwa komputera.
// Dzięki temu dwa komputery (np. Twój i córki) widać w panelu osobno.
// ============================================================================
import { hostname } from "node:os";
import { getSupabaseAdmin } from "../../server-lib/supabaseAdmin.js";

const INTERVAL_MS = 60000;

export function stationName() {
  return process.env.STUDIO_STATION || hostname() || "studio";
}

async function ping(capabilities) {
  try {
    await getSupabaseAdmin()
      .from("studio_status")
      .upsert({
        station: stationName(),
        last_seen: new Date().toISOString(),
        ...capabilities,
      });
  } catch {
    // Brak tabeli albo chwilowy brak sieci nie może zatrzymać pracy Studia —
    // to tylko sygnalizacja, nie funkcja krytyczna.
  }
}

/**
 * Uruchamia cykliczne zgłaszanie obecności. Zwraca funkcję zatrzymującą.
 * @param {{ can_browse?: boolean, can_render?: boolean }} capabilities
 */
export function startHeartbeat(capabilities = {}) {
  ping(capabilities);
  const timer = setInterval(() => ping(capabilities), INTERVAL_MS);
  timer.unref?.(); // nie blokuj zamknięcia procesu
  return () => clearInterval(timer);
}
