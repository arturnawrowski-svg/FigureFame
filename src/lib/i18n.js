// ============================================================================
// i18n — FUNDAMENT tłumaczeń strony (przygotowanie pod pełną lokalizację później).
//
// Cel: gdy przyjdzie czas (i budżet) na tłumaczenie serwisu na EN/CZ/FR..., mamy
// gotową „ścieżkę": słownik + hook. Komponenty przełączamy na t('klucz') stopniowo.
// SEO/GEO: przy zmianie języka ustawiamy <html lang> (sygnał dla wyszukiwarek);
// docelowo dochodzą tagi hreflang per język (gdy będzie domena).
//
// UŻYCIE (docelowo w komponentach):
//   import { useTranslation } from '../lib/i18n';
//   const { t, locale, setLocale } = useTranslation();
//   <h1>{t('nav.gablota')}</h1>
//
// Na razie NIE podpięte do komponentów — to celowo tylko fundament. Domyślny język: pl.
// ============================================================================
import { useEffect, useState } from 'react';

export const LOCALES = [
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  // przyszłość: { code: 'cs', ... }, { code: 'fr', ... }
];
export const DEFAULT_LOCALE = 'pl';
const STORAGE_KEY = 'ff_lang';
const EVENT = 'ff-langchange';

// Słownik. Klucze grupujemy po sekcjach. EN uzupełniamy w miarę tłumaczenia strony.
// Brakujący klucz → fallback na pl → fallback na sam klucz (nic się nie wywali).
const DICT = {
  pl: {
    'nav.theme': 'Motyw',
    'nav.about': 'O aplikacji',
    'nav.faq': 'FAQ',
    'nav.admin': 'Panel Moderatora',
    'nav.add': 'Dodaj Figurkę do bazy',
    'nav.profile': 'Mój Profil',
    'nav.login': 'Zaloguj / Załóż konto',
    'common.loading': 'Ładowanie…',
    'common.back': 'Wróć',
    'common.search': 'Szukaj',
    'figure.whereToBuy': 'Gdzie kupić',
    'figure.price': 'Cena / wartość',
    'figure.bootleg': 'Ryzyko podróbki',
    'showcase.empty': 'Brak figurek do wyświetlenia.',
  },
  en: {
    'nav.theme': 'Theme',
    'nav.about': 'About',
    'nav.faq': 'FAQ',
    'nav.admin': 'Moderator Panel',
    'nav.add': 'Add a figure',
    'nav.profile': 'My Profile',
    'nav.login': 'Log in / Sign up',
    'common.loading': 'Loading…',
    'common.back': 'Back',
    'common.search': 'Search',
    'figure.whereToBuy': 'Where to buy',
    'figure.price': 'Price / value',
    'figure.bootleg': 'Bootleg risk',
    'showcase.empty': 'No figures to display.',
  },
};

export function getLocale() {
  if (typeof localStorage === 'undefined') return DEFAULT_LOCALE;
  const v = localStorage.getItem(STORAGE_KEY);
  return LOCALES.some((l) => l.code === v) ? v : DEFAULT_LOCALE;
}

export function setLocale(code) {
  if (!LOCALES.some((l) => l.code === code)) return;
  localStorage.setItem(STORAGE_KEY, code);
  if (typeof document !== 'undefined') document.documentElement.lang = code; // sygnał SEO
  window.dispatchEvent(new CustomEvent(EVENT, { detail: code }));
}

// Czyste tłumaczenie (poza Reactem): t('klucz', 'en')
export function t(key, locale = getLocale()) {
  return (DICT[locale] && DICT[locale][key]) || DICT[DEFAULT_LOCALE][key] || key;
}

// Hook Reacta: reaguje na zmianę języka w całej apce
export function useTranslation() {
  const [locale, setLoc] = useState(getLocale());
  useEffect(() => {
    const onChange = (e) => setLoc(e.detail || getLocale());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);
  return {
    locale,
    setLocale,
    t: (key) => t(key, locale),
  };
}
