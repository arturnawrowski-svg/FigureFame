// ============================================================================
// Bootleg Risk Score (rule-based) — wyróżnik z PDF.
// ----------------------------------------------------------------------------
// UWAGA: to ocena PREWALENCJI podróbek dla danego MODELU/serii (jak często
// bywa podrabiany na rynku), a NIE ocena konkretnej oferty aukcyjnej — tej
// nie mamy jeszcze danych (Etap 3: realne aukcje). Świadomie proste i uczciwe.
// ============================================================================

const HIGH_RISK_MANUFACTURERS = ['good smile', 'nendoroid', 'banpresto', 'bandai', 'sega'];
const MED_RISK_MANUFACTURERS = ['kotobukiya', 'alter', 'max factory', 'aniplex'];

const POPULAR_SERIES = [
  'vocaloid', 'hatsune miku', 'miku', 'genshin', 'naruto', 'one piece', 'dragon ball',
  'demon slayer', 'kimetsu', 're:zero', 'rem', 'ram', 'evangelion', 'asuka', 'fate',
  'sword art online', 'chainsaw man', 'jujutsu', 'attack on titan', 'shingeki',
  'darling in the franxx', 'zero two', 'spy x family',
];

export function computeBootlegRisk(figure) {
  let score = 15;
  const reasons = [];

  const man = (figure?.manufacturer || '').toLowerCase();
  const series = (figure?.series || '').toLowerCase();
  const name = (figure?.name || '').toLowerCase();
  const type = (figure?.type || '').toLowerCase();

  if (HIGH_RISK_MANUFACTURERS.some((m) => man.includes(m))) {
    score += 30;
    reasons.push('Producent bardzo często podrabiany na rynku wtórnym.');
  } else if (MED_RISK_MANUFACTURERS.some((m) => man.includes(m))) {
    score += 18;
    reasons.push('Producent bywa podrabiany — zachowaj czujność.');
  }

  if (POPULAR_SERIES.some((s) => series.includes(s) || name.includes(s))) {
    score += 32;
    reasons.push('Bardzo popularna seria/postać — dużo podróbek w obiegu.');
  }

  if (type.includes('nendoroid') || type.includes('prize') || type.includes('trading')) {
    score += 15;
    reasons.push('Ten typ figurki (Nendoroid / prize / trading) jest częstym celem podróbek.');
  }

  if (reasons.length === 0) {
    reasons.push('Brak silnych sygnałów podwyższonej prewalencji podróbek dla tego modelu.');
  }
  // Uniwersalna, zawsze aktualna rada:
  reasons.push('Zawsze weryfikuj sprzedawcę, zdjęcia realnego egzemplarza i cenę względem rynku.');

  score = Math.max(5, Math.min(score, 95));
  const level = score >= 65 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, level, reasons };
}

export const RISK_META = {
  low: { label: 'Niskie', color: '#2ed573', hint: 'Podróbki rzadziej spotykane, ale czujność zawsze wskazana.' },
  medium: { label: 'Średnie', color: '#ffa502', hint: 'Podróbki bywają — sprawdź dokładnie ofertę.' },
  high: { label: 'Wysokie', color: '#ff4757', hint: 'Model często podrabiany — kupuj ostrożnie i od zaufanych źródeł.' },
};
