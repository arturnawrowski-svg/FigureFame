import { describe, it, expect } from 'vitest';
import {
  pusta,
  maZnakJaponski,
  mieszaAlfabety,
  stanZdjecia,
  zdjecieUNas,
  czegoBrakuje,
  jestPewny,
  uwagiDoFigurki,
} from './kompletnosc';

// Każdy przypadek w tym pliku to wartość ZMIERZONA w bazie 03.08.2026, nie
// wymyślona. Dlatego przy większości jest nazwa figurki: gdy test padnie,
// od razu wiadomo, którego wiersza dotyczy.

describe('pusta — NULL i pusty napis to jedno i to samo', () => {
  // W `official_image_url` trzy wiersze mają NULL i trzy pusty napis. Warunek
  // `is null` mija wtedy połowę braków; pierwszy pomiar tej bazy wyszedł
  // z tego powodu za dobrze.
  it('nie rozróżnia sposobów zapisania braku', () => {
    expect(pusta(null)).toBe(true);
    expect(pusta(undefined)).toBe(true);
    expect(pusta('')).toBe(true);
    expect(pusta('   ')).toBe(true);
    expect(pusta({})).toBe(true);
    expect(pusta([])).toBe(true);
  });

  it('wartość to wartość', () => {
    expect(pusta('Alter')).toBe(false);
    expect(pusta({ mfc: 12345 })).toBe(false);
    expect(pusta(0)).toBe(false);
  });
});

describe('maZnakJaponski — pole wypełnione łacinką jest BRAKIEM', () => {
  it('przyjmuje hiraganę, katakanę i kanji', () => {
    expect(maZnakJaponski('すーぱーそに子')).toBe(true);  // Super Sonico
    expect(maZnakJaponski('ガッツ')).toBe(true);           // Guts
    expect(maZnakJaponski('牧瀬紅莉栖')).toBe(true);        // Kurisu Makise
    expect(maZnakJaponski('戦場ヶ原ひたぎ')).toBe(true);    // Hitagi, poprawnie
  });

  // Te trzy wartości SIEDZĄ dziś w kolumnie `japanese_name` i przez lata
  // wyglądały na komplet. To najgorszy rodzaj usterki w tym projekcie:
  // pole wypełnione, wartość nieprawdziwa, żadnego sygnału.
  it('odrzuca to, co tylko udaje nazwę japońską', () => {
    expect(maZnakJaponski('Taihou')).toBe(false);
    expect(maZnakJaponski('Miku Expo 2025')).toBe(false);
    expect(maZnakJaponski('Super Sonico Tiger Hoodie')).toBe(false);
    expect(maZnakJaponski('')).toBe(false);
    expect(maZnakJaponski(null)).toBe(false);
  });

  // Zmyślone przez AI, ale znakami japońskimi — tego testem nie złapiemy
  // i nie udajemy, że da się. To zadanie dla `provenance`, nie dla alfabetu.
  it('nie udaje, że rozpoznaje zmyślenia', () => {
    expect(maZnakJaponski('先代萌絵が原')).toBe(true);
  });
});

describe('mieszaAlfabety — kolumna trzymająca dwa fakty naraz', () => {
  it('wskazuje nazwę postaci zlepioną z tytułem produktu', () => {
    expect(mieszaAlfabety('木之本桜 Stars Bless You')).toBe(true);
    expect(mieszaAlfabety('ゼロツー For My Darling')).toBe(true);
    expect(mieszaAlfabety('ARTFX J リヴァイ Fortitude ver.')).toBe(true);
  });

  it('czysta nazwa postaci nie jest podejrzana', () => {
    expect(mieszaAlfabety('すーぱーそに子')).toBe(false);
    expect(mieszaAlfabety('曽根美雪')).toBe(false);
  });
});

describe('stanZdjecia — pięć stanów, wszystkie pięć są w bazie', () => {
  const NASZE = 'https://sfxraogvhjhalzxuddgl.supabase.co/storage/v1/object/public/figure-images/guts_1784663134.webp';

  it('gotowy plik w naszym magazynie', () => {
    expect(stanZdjecia(NASZE).stan).toBe('magazyn');
    expect(zdjecieUNas(NASZE)).toBe(true);
  });

  it('plik roboczy to jeszcze nie zdjęcie', () => {
    // Finalizacja (kompresja + sprzątanie) mogła się urwać w połowie.
    const roboczy = 'https://sfxraogvhjhalzxuddgl.supabase.co/storage/v1/object/public/figure-images/_work/tmp.png';
    expect(stanZdjecia(roboczy).stan).toBe('roboczy');
    expect(zdjecieUNas(roboczy)).toBe(false);
  });

  it('cudzy serwer to BRAK zdjęcia', () => {
    // Kotobukiya skasowało zdjęcie Leviego, zanim je ściągnęliśmy.
    expect(stanZdjecia('https://myfigurecollection.net/x.jpg').stan).toBe('obcy');
  });

  // Sprawdzanie po `includes('supabase.co')` — tak było w siedmiu miejscach —
  // przepuszczało taki adres jako nasz plik.
  it('cudzy adres z „supabase.co" w środku nie jest naszym plikiem', () => {
    expect(zdjecieUNas('https://cudzy.example/obraz?x=supabase.co')).toBe(false);
    expect(zdjecieUNas('https://sfxraogvhjhalzxuddgl.supabase.co/auth/v1/x')).toBe(false);
  });

  it('nazwa pliku z zasiewu to nie adres', () => {
    expect(stanZdjecia('miku_figure')).toEqual({ stan: 'lokalny', plik: 'miku_figure' });
    expect(stanZdjecia('taihou_figure.png').plik).toBe('taihou_figure');
  });

  it('brak zapisany dowolnie jest brakiem', () => {
    expect(stanZdjecia(null).stan).toBe('brak');
    expect(stanZdjecia('').stan).toBe('brak');
    expect(stanZdjecia('   ').stan).toBe('brak');
  });
});

// Ta funkcja decyduje, KIEDY szukanie ma przestać. Za łagodna — jedno
// kliknięcie znów nie dowiezie kompletu i trzeba klikać w kółko. Za surowa —
// każda figurka mieli pełne trzy minuty bez sensu.
describe('czegoBrakuje — warunek końca szukania', () => {
  const KOMPLETNY = {
    japanese_name: '沢渡 いずみ',
    manufacturer: 'Enterbrain',
    scale: '1/7',
    official_image_url: 'https://sfxraogvhjhalzxuddgl.supabase.co/storage/v1/object/public/x.png',
  };

  it('komplet kończy szukanie', () => {
    expect(czegoBrakuje(KOMPLETNY)).toEqual([]);
    expect(jestPewny(KOMPLETNY)).toBe(true);
  });

  it('nazwa japońska po łacinie NIE kończy szukania', () => {
    // Dwa wiersze Taihou mają dziś `japanese_name: 'Taihou'`. Do 03.08 liczyło
    // się to jako komplet, więc szukanie kończyło się z pustym polem.
    expect(czegoBrakuje({ ...KOMPLETNY, japanese_name: 'Taihou' })).toEqual(['nazwa japońska']);
  });

  it('zdjęcie z zasiewu w /public/images to nie nasz magazyn', () => {
    expect(czegoBrakuje({ ...KOMPLETNY, official_image_url: 'miku_figure' })).toEqual(['zdjęcie']);
  });

  it('sam biały znak nie jest wartością', () => {
    expect(czegoBrakuje({ ...KOMPLETNY, manufacturer: '   ' })).toEqual(['producent']);
  });

  it('brak odpowiedzi to brak wszystkiego, a nie „gotowe"', () => {
    expect(czegoBrakuje(null)).toHaveLength(4);
    expect(jestPewny(null)).toBe(false);
  });

  it('wymienia wszystkie braki naraz, żeby moderator wiedział, co go czeka', () => {
    expect(czegoBrakuje({ manufacturer: 'Alter' }))
      .toEqual(['nazwa japońska', 'skala', 'zdjęcie']);
  });
});

describe('uwagiDoFigurki — co JEST, ale jest złe', () => {
  const kody = (fig) => uwagiDoFigurki(fig).map((u) => u.kod);

  it('spacja na końcu producenta jest błędem, nie kosmetyką', () => {
    // „Kotobukiya " wchodzi do klucza tożsamości i do klucza pamięci
    // podręcznej — chybia w zapisany wpis i wymusza drugie, gorsze pobranie.
    expect(kody({ manufacturer: 'Kotobukiya ' })).toContain('biale-znaki');
  });

  it('pusty napis zamiast NULL jest widziany', () => {
    expect(kody({ official_image_url: '' })).toContain('pusty-napis');
  });

  it('zdjęcie z cudzego serwera łamie regułę i jest błędem', () => {
    expect(kody({ official_image_url: 'https://kotobukiya.co.jp/levi.jpg' })).toContain('zdjecie-obce');
  });

  it('zdjęcie bez podpisu praw to złamane zobowiązanie z regulaminu', () => {
    const fig = { official_image_url: 'https://x.supabase.co/storage/v1/object/public/a.webp' };
    expect(kody(fig)).toContain('brak-podpisu');
    expect(kody({ ...fig, image_credit: 'Fot. Good Smile Company' })).not.toContain('brak-podpisu');
  });

  // Podpis powstaje przy wyświetlaniu: puste `image_credit` zastępuje producent.
  // Pierwsza wersja reguły tego nie wiedziała i zgłaszała 20 błędów przy
  // 20 zdjęciach, które podpis mają. Fałszywy alarm w mierniku zabiera zaufanie
  // do wszystkich pozostałych liczb.
  it('producent wystarcza za podpis, bo tak działa strona', () => {
    expect(kody({
      official_image_url: 'https://x.supabase.co/storage/v1/object/public/a.webp',
      manufacturer: 'Good Smile Company',
    })).not.toContain('brak-podpisu');
  });

  it('brak zdjęcia nie generuje żądania podpisu', () => {
    expect(kody({ official_image_url: null })).not.toContain('brak-podpisu');
  });

  it('brak odcisku znaczy martwe wykrywanie duplikatów', () => {
    // HMX-17c Silfa i Sawatari Izumi mają dziś `identity_key = NULL`, a indeks
    // unikalności obejmuje tylko wartości niepuste.
    expect(kody({ identity_key: null })).toContain('brak-identity');
  });

  it('błędy i uwagi są rozdzielone, bo to dwie różne pilności', () => {
    const uwagi = uwagiDoFigurki({
      manufacturer: 'Kotobukiya ',     // błąd
      character_id: null,              // uwaga
    });
    expect(uwagi.find((u) => u.kod === 'biale-znaki').waga).toBe('blad');
    expect(uwagi.find((u) => u.kod === 'brak-postaci').waga).toBe('uwaga');
  });

  it('wiersz bez zarzutu nie generuje niczego', () => {
    expect(uwagiDoFigurki({
      name: 'Guts',
      japanese_name: 'ガッツ',
      series: 'Berserk',
      japanese_series: 'ベルセルク',
      manufacturer: 'Good Smile Company',
      scale: '1/7',
      official_image_url: 'https://x.supabase.co/storage/v1/object/public/guts.webp',
      image_credit: 'Fot. Good Smile Company',
      identity_key: 'guts|goodsmilecompany|17',
      slug: 'guts-good-smile-company-1-7',
      short_code: 'a1b2c3',
      character_id: '0000-0000',
      provenance: { japanese_name: 'catalog' },
      source_url: 'https://myfigurecollection.net/item/123',
    })).toEqual([]);
  });
});
