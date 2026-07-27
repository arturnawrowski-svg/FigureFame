import { createClient } from "@supabase/supabase-js";

// ============================================================================
// getSupabaseAdmin — klient serwerowy Supabase dla endpointów admina/zapisu.
// Preferuje service_role (omija RLS, upload do Storage), fallback na anon (dev).
//
// UWAGA: NIE używać w publicznych endpointach read-only (np. api/sitemap.js) —
// tam świadomie używamy wyłącznie klucza anon.
// ============================================================================
export function getSupabaseAdmin() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Brak konfiguracji Supabase (VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  }
  return createClient(url, key);
}
