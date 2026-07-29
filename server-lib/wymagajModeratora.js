import { getSupabaseAdmin } from "./supabaseAdmin.js";

// ============================================================================
// wymagajModeratora — brama dla endpointów, które pracują kluczem `service_role`.
//
// Po co: `service_role` omija WSZYSTKIE reguły dostępu do bazy. Endpoint, który
// go używa, jest tym samym co konto administratora wystawione na internet —
// i musi sam sprawdzić, kto puka. Reguły RLS tu nie pomogą, bo ten klucz je pomija.
//
// Do 29.07.2026 tych endpointów pilnowała wyłącznie zasłona na hasło. To była
// pułapka z opóźnionym zapłonem: pierwszy punkt listy „przed premierą" brzmi
// „usunąć SITE_GATE_* z Vercela" — czyli premiera OTWIERAŁABY je światu.
// Wtedy obcy mógłby wrzucać pliki do naszego Storage, kazać serwerowi pobierać
// dowolny adres i palić darmowe limity AI.
//
// Użycie na początku handlera:
//   const moderator = await wymagajModeratora(req, res);
//   if (!moderator) return;              // odpowiedź (401/403) już poszła
// ============================================================================

/**
 * Sprawdza token sesji z nagłówka Authorization i uprawnienia moderatora.
 * Sam odpowiada 401/403 i zwraca null, gdy dostępu nie ma.
 * @returns {Promise<{id: string, email: string} | null>}
 */
export async function wymagajModeratora(req, res) {
  const naglowek = req.headers?.authorization || req.headers?.Authorization || "";
  const token = naglowek.startsWith("Bearer ") ? naglowek.slice(7).trim() : "";
  if (!token) {
    res.status(401).json({ error: "Wymagane logowanie moderatora." });
    return null;
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user) {
    res.status(401).json({ error: "Sesja wygasła — zaloguj się ponownie." });
    return null;
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profil?.is_admin) {
    res.status(403).json({ error: "Ta operacja jest dostępna wyłącznie dla moderatora." });
    return null;
  }

  return { id: user.id, email: user.email };
}
