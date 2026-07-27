// ============================================================================
// ZASŁONA — strona jest zamknięta na hasło, dopóki nie ruszamy publicznie.
// ----------------------------------------------------------------------------
// Działa na brzegu sieci Vercela, czyli ZANIM cokolwiek zostanie wysłane.
// Bez hasła nikt nie zobaczy ani strony, ani zdjęć, ani odpowiedzi z API —
// w przeciwieństwie do zasłony rysowanej w przeglądarce, która tylko
// zakrywa treść już wysłaną odwiedzającemu.
//
// WŁĄCZANIE I WYŁĄCZANIE bez ruszania kodu:
//   są zmienne SITE_GATE_USER i SITE_GATE_PASSWORD  → zasłona działa
//   brak którejkolwiek                              → strona otwarta
// Po premierze wystarczy usunąć je w ustawieniach Vercela.
//
// Uwaga o sile zabezpieczenia: to zasłona, nie sejf. Hasło jest jedno i
// wspólne, więc chroni przed przypadkowym gościem i przed wyszukiwarkami —
// nie przed kimś, komu ktoś je poda dalej.
// ============================================================================

// Adresy przepuszczane bez hasła.
// robots.txt musi być czytelny dla wyszukiwarek: odpowiedź „401" one
// zignorują, a napisane wprost „nie indeksuj" — uszanują.
const BEZ_HASLA = ["/robots.txt"];

function odmowa() {
  return new Response("Strona w budowie — wymagane hasło.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="FigureFame", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
      // Nawet gdyby ktoś tu zajrzał — żadnych śladów w wyszukiwarkach.
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export default function middleware(request) {
  const uzytkownik = process.env.SITE_GATE_USER;
  const haslo = process.env.SITE_GATE_PASSWORD;

  // Brak konfiguracji = zasłona zdjęta. Świadomie w tę stronę: pomyłka
  // w ustawieniach ma otworzyć stronę, a nie zamurować ją bez ostrzeżenia.
  if (!uzytkownik || !haslo) return;

  const { pathname } = new URL(request.url);
  if (BEZ_HASLA.includes(pathname)) return;

  const naglowek = request.headers.get("authorization") || "";
  if (!naglowek.startsWith("Basic ")) return odmowa();

  let podane;
  try {
    podane = atob(naglowek.slice(6));
  } catch {
    return odmowa(); // nagłówek nie jest poprawnym Base64
  }

  // Rozdzielamy na PIERWSZYM dwukropku — hasło może go zawierać.
  const i = podane.indexOf(":");
  if (i < 0) return odmowa();

  if (podane.slice(0, i) !== uzytkownik || podane.slice(i + 1) !== haslo) {
    return odmowa();
  }

  // Hasło się zgadza — puszczamy dalej, ale nadal bez indeksowania.
  // Wyszukiwarka mogłaby dostać treść przez cudzy zapisany dostęp.
  return undefined;
}

export const config = {
  // Wszystko poza plikami budowania — te i tak nic nie zdradzają, a wykluczenie
  // ich oszczędza wywołania na brzegu sieci.
  matcher: ["/((?!_next/static|_vercel|assets).*)"],
};
