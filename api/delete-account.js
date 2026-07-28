import { getSupabaseAdmin } from "../server-lib/supabaseAdmin.js";

// ============================================================================
// delete-account — TRWAŁE usunięcie konta na żądanie właściciela (RODO, art. 17).
//
// Dlaczego to musi być endpoint serwerowy: konto w Supabase kasuje wyłącznie
// klucz `service_role`. Nigdy nie może trafić do przeglądarki — kto go ma,
// ten może wszystko w całej bazie. Dlatego przeglądarka przysyła tu tylko
// swój token sesji, a serwer sprawdza, CZYJE to konto, i kasuje wyłącznie je.
//
// CO SIĘ DZIEJE Z FIGURKAMI: zostają w bazie i PRZECHODZĄ NA KONTO MODERATORA
// — od tej pory to on widnieje jako zgłaszający. Dane figurki to fakty
// o produkcie, nie dane osobowe; kasowanie ich razem z kontem wycięłoby dziury
// w Gablocie i skasowało pracę moderatora. RODO wymaga usunięcia POWIĄZANIA
// z osobą — i to robimy: po przejęciu w bazie nie zostaje ślad, kto zgłosił.
//
// Dlaczego moderator, a nie puste pole: figurka bez właściciela to sierota,
// której nikt nie ma prawa poprawić (reguły RLS pytają o zgłaszającego).
// Puste pole zostaje wyłącznie awaryjnie — gdyby w bazie nie było moderatora.
//
// Użytkownik jest o tym uprzedzony w oknie potwierdzenia (ProfilePage.jsx) —
// nie może to być niespodzianka.
// ============================================================================

// Hasło potwierdzenia wpisywane ręcznie w oknie. Sprawdzamy je także tutaj:
// zabezpieczenie w przeglądarce chroni przed pomyłką, ale nie przed kimś,
// kto woła endpoint z pominięciem strony.
const POTWIERDZENIE = "USUWAM KONTO";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Bez klucza service_role nie da się skasować konta. Sprawdzamy to ZANIM
    // cokolwiek ruszymy — inaczej odpięlibyśmy figurki od użytkownika, a samo
    // konto zostałoby żywe (najgorszy możliwy stan pośredni).
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: "Serwer nie ma klucza service_role — usuwanie konta jest wyłączone.",
      });
    }

    let body = req.body;
    if (Buffer.isBuffer(body)) body = JSON.parse(body.toString());
    else if (typeof body === "string") body = JSON.parse(body || "{}");

    if ((body?.potwierdzenie || "").trim().toUpperCase() !== POTWIERDZENIE) {
      return res.status(400).json({ error: `Brak potwierdzenia („${POTWIERDZENIE}").` });
    }

    const naglowek = req.headers?.authorization || req.headers?.Authorization || "";
    const token = naglowek.startsWith("Bearer ") ? naglowek.slice(7).trim() : "";
    if (!token) {
      return res.status(401).json({ error: "Brak tokenu sesji." });
    }

    const supabase = getSupabaseAdmin();

    // Tożsamość bierzemy WYŁĄCZNIE z tokenu. Identyfikator przysłany w body
    // byłby zaproszeniem do skasowania cudzego konta.
    const { data: dane, error: bladTokenu } = await supabase.auth.getUser(token);
    const user = dane?.user;
    if (bladTokenu || !user) {
      return res.status(401).json({ error: "Sesja wygasła — zaloguj się ponownie." });
    }

    // Moderator nie kasuje się jednym kliknięciem. Bez tego da się zostać
    // bez żadnego admina i stracić dostęp do panelu na własnej stronie.
    const { data: profil } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (profil?.is_admin) {
      return res.status(403).json({
        error: "To konto ma uprawnienia moderatora. Najpierw odbierz je w bazie (profiles.is_admin = false).",
      });
    }

    // 1. Kto przejmuje figurki. Najstarszy moderator — konto założyciela,
    //    a nie przypadkowy admin dodany później.
    const { data: moderatorzy } = await supabase
      .from("profiles")
      .select("id")
      .eq("is_admin", true)
      .order("created_at", { ascending: true })
      .limit(1);
    const przejmujacy = moderatorzy?.[0]?.id || null;

    // 2. Przepisanie figurek. Musi iść PRZED kasowaniem konta: dopóki wiersze
    //    wskazują na użytkownika, baza nie pozwoli go usunąć.
    const { data: przepisane, error: bladFigurek } = await supabase
      .from("figures")
      .update({ submitted_by: przejmujacy })
      .eq("submitted_by", user.id)
      .select("id");
    if (bladFigurek) throw bladFigurek;

    // 3. Konto w Auth. Profil i kolekcje znikają razem z nim (ON DELETE CASCADE).
    const { error: bladKasowania } = await supabase.auth.admin.deleteUser(user.id);
    if (bladKasowania) throw bladKasowania;

    // 4. Gdyby kaskada nie zadziałała (starsze bazy potrafią mieć profil bez
    //    powiązania z auth.users), profil musi zniknąć tak czy inaczej.
    await supabase.from("profiles").delete().eq("id", user.id);

    return res.status(200).json({
      ok: true,
      przepisaneFigurki: przepisane?.length || 0,
      przejetePrzezModeratora: !!przejmujacy,
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return res.status(500).json({ error: err.message });
  }
}
