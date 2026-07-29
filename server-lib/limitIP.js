// ============================================================================
// limitIP — prosty licznik zapytań na adres IP, trzymany w pamięci funkcji.
//
// Dla endpointów, które MUSZĄ zostać publiczne (asystent AI na karcie figurki),
// więc nie da się ich zamknąć logowaniem. Każde takie wywołanie zjada nasz
// darmowy limit u providera AI — bez licznika jeden skrypt wyczerpuje go w minutę.
//
// Uczciwie o skuteczności: funkcje na Vercelu żyją krótko i jest ich wiele
// równolegle, więc licznik nie jest wspólny dla całej strony. To próg
// zwalniający, nie mur — ma zatrzymać pętlę w przeglądarce i przypadkowego
// skrypciarza, a nie wytrwały atak. Mur kosztowałby bazę lub Redisa
// (czyli pieniądze albo kolejną usługę), a zasada brzmi FREE-FIRST.
// ============================================================================

const OKNO_MS = 60_000;
const licznik = new Map(); // ip → { ile, reset }

/**
 * @returns {boolean} true = można obsłużyć, false = limit wyczerpany (odpowiedź już poszła)
 */
export function limitIP(req, res, { naMinute = 10 } = {}) {
  const ip =
    (req.headers?.["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "nieznany";

  const teraz = Date.now();
  const wpis = licznik.get(ip);

  if (!wpis || teraz > wpis.reset) {
    licznik.set(ip, { ile: 1, reset: teraz + OKNO_MS });
    // Sprzątanie: bez tego mapa rosłaby w nieskończoność przy dłuższym życiu funkcji.
    if (licznik.size > 5000) {
      for (const [klucz, w] of licznik) if (teraz > w.reset) licznik.delete(klucz);
    }
    return true;
  }

  if (wpis.ile >= naMinute) {
    const zaIle = Math.ceil((wpis.reset - teraz) / 1000);
    res.status(429).json({ error: `Za dużo pytań naraz. Spróbuj ponownie za ${zaIle} s.` });
    return false;
  }

  wpis.ile += 1;
  return true;
}
