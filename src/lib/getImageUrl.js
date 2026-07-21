// ============================================================================
// Jedno źródło prawdy dla ścieżki do zdjęcia figurki (Etap 2 z planu).
// Usuwa dawny problem 3 różnych metod liczenia URL w Showcase / Dossier / Admin.
// ----------------------------------------------------------------------------
// W bazie `official_image_url` przechowuje albo:
//   - pełny URL http(s) (np. własna chmura Supabase, lub link zewnętrzny), albo
//   - bazową nazwę lokalnego pliku z /public/images (np. "miku_figure").
// ============================================================================

export function isHttpImage(raw) {
  return typeof raw === "string" && raw.startsWith("http");
}

// Zwraca gotowy `src` do <img>. Dla braku danych zwraca "" (obsłuż onError w UI).
export function getImageUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  if (isHttpImage(raw)) return raw;
  // Lokalny plik bazowy w /public/images/, np. "miku_figure" -> "/images/miku_figure.png"
  const clean = raw.replace(/^\/+/, "").replace(/\.(png|jpe?g|webp|avif)$/i, "");
  return `/images/${clean}.png`;
}
