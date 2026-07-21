// ============================================================================
// shortOptions — JEDNO źródło prawdy o opcjach generatora shortów.
// Współdzielone przez: panel admina (UI wyboru) ORAZ worker renderShort.mjs
// (interpretacja opcji podczas renderu). Czysty ESM, bez Reacta.
// ============================================================================

// --- PRESETY SCENARIUSZA: tempo scen (T w sekundach) + intensywność ruchu ---
export const PRESETS = {
  klasyczny: {
    label: 'Klasyczny',
    T: { introEnd: 2.8, revealEnd: 7.0, detailsEnd: 12.2, storesEnd: 17.2, end: 20.6 },
    motion: 1,
  },
  dynamiczny: {
    label: 'Dynamiczny (szybki)',
    T: { introEnd: 2.4, revealEnd: 6.0, detailsEnd: 10.6, storesEnd: 15.4, end: 18.6 },
    motion: 1.35,
  },
  minimalny: {
    label: 'Minimalny (spokojny)',
    T: { introEnd: 2.6, revealEnd: 6.6, detailsEnd: 11.2, storesEnd: 15.8, end: 19.0 },
    motion: 0.45,
  },
};
export const DEFAULT_PRESET = 'klasyczny';

// --- AKCENTY: kolory glow / gradientów / chipsów ---
export const ACCENTS = [
  { key: 'bursztyn', label: 'Bursztyn (domyślny)', colors: ['#ff8a2b', '#f5b800'] },
  { key: 'cyjan', label: 'Cyjan / mięta', colors: ['#2bd4ff', '#00ffa3'] },
  { key: 'magenta', label: 'Magenta / fiolet', colors: ['#ff4d9d', '#a855f7'] },
  { key: 'szmaragd', label: 'Szmaragd / limonka', colors: ['#2ecc71', '#a3e635'] },
  { key: 'auto', label: 'Auto (dobierz z nazwy figurki)', colors: null },
];
export const DEFAULT_ACCENT = 'bursztyn';

// --- MUZYKA: pliki w worker/assets/music/ (klucz → plik). null = cisza. ---
// „Brak" jest celowe: dla większego zasięgu audio bywa lepiej dodać natywnie
// w apce przy publikacji (i uniknąć roszczeń Content ID).
export const MUSIC_TRACKS = [
  { key: 'none', label: 'Brak (cisza — audio dodasz w apce przy publikacji)', file: null },
  { key: 'spokojny', label: 'Spokojny pad (chill)', file: 'spokojny.mp3' },
  { key: 'cieplo', label: 'Ciepły ambient (lo-fi vibe)', file: 'cieplo.mp3' },
  { key: 'puls', label: 'Puls (energetyczny, pod TikTok)', file: 'puls.mp3' },
];
export const DEFAULT_MUSIC = 'none';

// --- ROZDZIELCZOŚĆ: klucz → współczynnik skali (1 = 1080×1920) ---
export const RESOLUTIONS = [
  { key: '1080', label: '1080×1920 (standard Shorts/TikTok)', scale: 1 },
  { key: '1440', label: '1440×2560 (ostrzej)', scale: 4 / 3 },
  { key: '2160', label: '2160×3840 (4K)', scale: 2 },
];
export const DEFAULT_RES = '1080';

export const DEFAULT_CTA = 'Zobacz pełne dossier';

// --- JĘZYK shorta: wszystkie napisy w wideo lokalizowane (SEO/GEO globalne) ---
export const LANGS = [
  { key: 'pl', label: 'Polski' },
  { key: 'en', label: 'English' },
];
export const DEFAULT_LANG = 'pl';

// Słownik napisów wypalanych w wideo. CTA można nadpisać ręcznie w opcjach.
export const VIDEO_STRINGS = {
  pl: {
    where: 'GDZIE KUPIĆ',
    priceLabel: 'Cena / wartość',
    affiliate: '+ linki afiliacyjne na figurefame.com',
    priceFallback: 'sprawdź w serwisie',
    ctaDefault: 'Zobacz pełne dossier',
    riskLow: 'Ryzyko podróbki: NISKIE',
    riskMedium: 'Ryzyko podróbki: ŚREDNIE',
    riskHigh: 'Ryzyko podróbki: WYSOKIE',
  },
  en: {
    where: 'WHERE TO BUY',
    priceLabel: 'Price / value',
    affiliate: '+ affiliate links on figurefame.com',
    priceFallback: 'check on the site',
    ctaDefault: 'See full dossier',
    riskLow: 'Bootleg risk: LOW',
    riskMedium: 'Bootleg risk: MEDIUM',
    riskHigh: 'Bootleg risk: HIGH',
  },
};
export function videoStrings(lang) {
  return VIDEO_STRINGS[lang] || VIDEO_STRINGS[DEFAULT_LANG];
}

// --- Helpery interpretacji opcji ---
const AUTO_PALETTE = ['#00d2d3', '#ff9ff3', '#feca57', '#ff6b6b', '#48dbfb', '#1dd1a1', '#5f27cd', '#ff3f34'];
function hashColor(name, salt = '') {
  const s = (name || '') + salt;
  if (!s) return AUTO_PALETTE[0];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AUTO_PALETTE[Math.abs(h) % AUTO_PALETTE.length];
}

// Zwraca [color0, color1] dla danego klucza akcentu; 'auto' liczy z nazwy figurki.
export function accentColors(key, seedName) {
  const found = ACCENTS.find((a) => a.key === key);
  if (found && found.colors) return found.colors;
  return [hashColor(seedName), hashColor(seedName, '~')];
}

export function presetOf(key) {
  return PRESETS[key] || PRESETS[DEFAULT_PRESET];
}

export function scaleOf(resKey) {
  const r = RESOLUTIONS.find((x) => x.key === resKey);
  return r ? r.scale : 1;
}

export function musicFileOf(key) {
  const t = MUSIC_TRACKS.find((x) => x.key === key);
  return t && t.file ? t.file : null;
}

// Domyślny komplet opcji dla nowej figurki
export function defaultShortOptions() {
  return {
    preset: DEFAULT_PRESET,
    accent: 'auto', // domyślnie kolor dobierany z nazwy figurki → każdy short inny
    music: DEFAULT_MUSIC,
    resolution: DEFAULT_RES,
    lang: DEFAULT_LANG,
    cta: '', // puste = użyj domyślnego CTA w języku shorta
  };
}

// Ile shortów można naraz mieć w kolejce renderu / przerobić na przebieg workera.
// Wysoko, bo 1 figurka × wiele języków = wiele shortów.
export const QUEUE_MAX = 100;

// Próg ostrzeżenia o buforze Supabase Storage (1 GB free) — zachęta do publikacji na Drive.
export const BUFFER_WARN = 20;
