import { describe, it, expect } from 'vitest';
import { przygotujDoZapisu, tylkoKolumny, etykietaPola } from './kolumnyFigurki';

// Brama zapisu jest ostatnim miejscem, w którym da się nie wpuścić śmiecia
// do bazy. Każdy przypadek niżej odpowiada wartości ZMIERZONEJ w bazie 03.08 —
// czyli czemuś, co tę bramę już raz przeszło.

describe('tylkoKolumny — pola bez kolumny nie wywalają zapisu', () => {
  it('odrzuca product_url z katalogu', () => {
    // 03.08: „Could not find the 'product_url' column". Objaw podły — dane
    // widać, przyciski nie działają.
    const out = tylkoKolumny({ name: 'Guts', product_url: 'https://mfc/item/1', _sources: {} });
    expect(out).toEqual({ name: 'Guts' });
  });
});

describe('przygotujDoZapisu — porządkowanie napisów', () => {
  it('obcina spację na brzegu producenta', () => {
    // „Kotobukiya " wchodzi do klucza tożsamości i do klucza pamięci
    // podręcznej — ta spacja to chybienie w zapisany wpis i drugie,
    // gorsze pobranie tej samej figurki.
    const { pola } = przygotujDoZapisu({ manufacturer: 'Kotobukiya ' });
    expect(pola.manufacturer).toBe('Kotobukiya');
  });

  it('składa złamanie linii do jednej spacji', () => {
    // W bazie: original_price = „¥440\nEach". W tej postaci leci na kartę
    // figurki i w napisy shorta.
    const { pola } = przygotujDoZapisu({ original_price: '¥440\n            Each' });
    expect(pola.original_price).toBe('¥440 Each');
  });

  it('brak zapisuje JEDNYM sposobem — jako NULL', () => {
    // 3 wiersze mają NULL, 3 pusty napis. Każdy warunek `is null` mija wtedy
    // połowę braków.
    const { pola } = przygotujDoZapisu({ source_url: '', japanese_name: '   ' });
    expect(pola.source_url).toBeNull();
    expect(pola.japanese_name).toBeNull();
  });

  it('nie rusza pól listowych — tam złamanie linii jest treścią', () => {
    const info = ['Pierwsza linia', 'Druga linia'];
    const { pola } = przygotujDoZapisu({ additional_info: info });
    expect(pola.additional_info).toEqual(info);
  });
});

describe('przygotujDoZapisu — zdjęcie', () => {
  const NASZE = 'https://sfxraogvhjhalzxuddgl.supabase.co/storage/v1/object/public/figure-images/guts.webp';

  it('nasz magazyn przechodzi', () => {
    const { pola, ostrzezenia } = przygotujDoZapisu({ official_image_url: NASZE });
    expect(pola.official_image_url).toBe(NASZE);
    expect(ostrzezenia).toEqual([]);
  });

  it('adres z cudzego serwera NIE wchodzi do bazy i mówi o tym wprost', () => {
    // Kotobukiya skasowało zdjęcie Leviego, zanim je ściągnęliśmy. Pole
    // wyglądałoby na wypełnione, a Gablota pokazywałaby dziurę.
    const { pola, ostrzezenia } = przygotujDoZapisu({
      name: 'Levi',
      official_image_url: 'https://kotobukiya.co.jp/levi.jpg',
    });
    expect('official_image_url' in pola).toBe(false);
    expect(ostrzezenia).toHaveLength(1);
    // Reszta poprawek moderatora musi się zapisać — blokowanie całości
    // odebrałoby mu możliwość zapisania czegokolwiek.
    expect(pola.name).toBe('Levi');
  });

  it('nazwa pliku z zasiewu przechodzi — to nie cudzy serwer', () => {
    const { pola, ostrzezenia } = przygotujDoZapisu({ official_image_url: 'miku_figure' });
    expect(pola.official_image_url).toBe('miku_figure');
    expect(ostrzezenia).toEqual([]);
  });

  it('plik roboczy przechodzi — finalizacja domyka go przy wejściu do Gabloty', () => {
    const roboczy = 'https://x.supabase.co/storage/v1/object/public/figure-images/_work/tmp.png';
    const { pola } = przygotujDoZapisu({ official_image_url: roboczy });
    expect(pola.official_image_url).toBe(roboczy);
  });
});

describe('etykietaPola', () => {
  it('tłumaczy nazwy kolumn na polski', () => {
    expect(etykietaPola('japanese_name')).toBe('nazwa japońska');
  });

  it('nieznaną kolumnę oddaje bez udawania', () => {
    expect(etykietaPola('cos_nowego')).toBe('cos_nowego');
  });
});
