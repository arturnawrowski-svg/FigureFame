// ============================================================================
// Flagi języków — rysowane, nie z emoji.
// ----------------------------------------------------------------------------
// Dlaczego nie 🇵🇱 / 🇬🇧: Windows nie ma w czcionce systemowej glifów flag.
// Przeglądarka pokazuje wtedy samą parę liter kodu kraju, więc przycisk
// z flagą i kodem języka wyświetlał „PL PL" oraz „GB EN". Na Macu i telefonie
// wyglądało dobrze, na Windowsie jak usterka — a to główny system użytkownika.
//
// Rysunki są wektorowe i maleńkie (kilkaset bajtów), więc wyglądają tak samo
// wszędzie i nie wymagają żadnego pliku do pobrania.
// ============================================================================

const FLAGI = {
  pl: (
    <>
      <rect width="20" height="7" fill="#fff" />
      <rect y="7" width="20" height="7" fill="#DC143C" />
    </>
  ),
  en: (
    <>
      <rect width="20" height="14" fill="#012169" />
      {/* Skosy: najpierw białe podkłady, na nich węższe czerwone. */}
      <path d="M0,0 L20,14 M20,0 L0,14" stroke="#fff" strokeWidth="3" />
      <path d="M0,0 L20,14 M20,0 L0,14" stroke="#C8102E" strokeWidth="1.6" />
      {/* Krzyż prosty — szerszy, więc rysowany na skosach. */}
      <path d="M10,0 V14 M0,7 H20" stroke="#fff" strokeWidth="4.6" />
      <path d="M10,0 V14 M0,7 H20" stroke="#C8102E" strokeWidth="2.6" />
    </>
  ),
  de: (
    <>
      <rect width="20" height="4.67" fill="#000" />
      <rect y="4.67" width="20" height="4.67" fill="#DD0000" />
      <rect y="9.34" width="20" height="4.66" fill="#FFCE00" />
    </>
  ),
  fr: (
    <>
      <rect width="6.67" height="14" fill="#002395" />
      <rect x="6.67" width="6.66" height="14" fill="#fff" />
      <rect x="13.33" width="6.67" height="14" fill="#ED2939" />
    </>
  ),
};

export default function Flaga({ kod, size = 20 }) {
  const rysunek = FLAGI[kod];
  if (!rysunek) return null;

  return (
    <svg
      width={size}
      height={size * 0.7}
      viewBox="0 0 20 14"
      // Sam kod języka stoi obok jako tekst, więc czytnik ekranu
      // przeczytałby to dwa razy.
      aria-hidden="true"
      style={{ borderRadius: '2px', display: 'block', flexShrink: 0 }}
    >
      {/* Obcięcie do prostokąta — bez tego skosy flagi brytyjskiej wychodzą poza ramkę. */}
      <defs>
        <clipPath id={`flaga-${kod}`}>
          <rect width="20" height="14" rx="2" />
        </clipPath>
      </defs>
      <g clipPath={`url(#flaga-${kod})`}>{rysunek}</g>
      <rect width="20" height="14" rx="2" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
    </svg>
  );
}
