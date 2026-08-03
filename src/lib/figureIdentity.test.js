import { describe, it, expect } from 'vitest';
import { identityKey, characterKey, makeSlug, makeShortCode, looksLikeShortCode, figureUrl } from './figureIdentity';

describe('identityKey — wykrywanie duplikatów', () => {
  it('uznaje „Miyuki Sone Base" i „Miyuki Sone" za tę samą figurkę', () => {
    const a = identityKey({ name: 'Miyuki Sone Base', manufacturer: 'Griffon Enterprises', scale: '1/8' });
    const b = identityKey({ name: 'Miyuki Sone', manufacturer: 'Griffon Enterprises', scale: '1/8' });
    expect(a).toBe(b);
  });

  it('rozróżnia różne wydania tej samej postaci', () => {
    const clayz = identityKey({ name: 'Izumi Konata', manufacturer: 'Clayz', scale: '1/8' });
    const furyu = identityKey({ name: 'Izumi Konata', manufacturer: 'FuRyu', scale: '1/8' });
    const inna = identityKey({ name: 'Izumi Konata', manufacturer: 'Clayz', scale: '1/4' });
    expect(clayz).not.toBe(furyu);
    expect(clayz).not.toBe(inna);
  });

  it('ignoruje wielkość liter, odstępy i interpunkcję', () => {
    expect(identityKey({ name: 'Super  Sonico', manufacturer: 'ALTER', scale: '1/7' }))
      .toBe(identityKey({ name: 'super sonico', manufacturer: 'Alter', scale: '1/7' }));
  });

  it('zwraca pusty odcisk, gdy nie ma z czego go policzyć', () => {
    expect(identityKey({})).toBe('');
    expect(identityKey({ name: '   ' })).toBe('');
  });

  // Na tej równoważności stoi całe rozdzielenie postaci od produktu.
  // Gdyby odcisk zmieniał się przy rozdzieleniu nazwy, przebieg naprawczy
  // uznałby przerobione rekordy za NOWE figurki i zrobiłby z 26 pozycji 52.
  it('daje ten sam odcisk dla nazwy złączonej i rozdzielonej na postać + wersję', () => {
    const zlaczona = identityKey({
      name: 'Zero Two: For My Darling', manufacturer: 'Good Smile Company', scale: '1/7',
    });
    const rozdzielona = identityKey({
      name: 'Zero Two', version: 'For My Darling', manufacturer: 'Good Smile Company', scale: '1/7',
    });
    expect(rozdzielona).toBe(zlaczona);
    expect(rozdzielona).toBe('zerotwoformydarling|goodsmilecompany|17');
  });

  it('rozróżnia dwie wersje tego samego producenta w tej samej skali', () => {
    const zwykla = identityKey({ name: 'Super Sonico', manufacturer: 'Alter', scale: '1/7' });
    const tygrys = identityKey({ name: 'Super Sonico', version: 'Tiger Hoodie', manufacturer: 'Alter', scale: '1/7' });
    expect(tygrys).not.toBe(zwykla);
  });
});

describe('characterKey — tożsamość POSTACI', () => {
  it('nie zależy od producenta ani skali — postać jest jedna, figurek wiele', () => {
    const a = characterKey({ name: 'Super Sonico', series: 'Nitroplus' });
    const b = characterKey({ name: 'super  sonico', series: 'Nitroplus' });
    expect(a).toBe(b);
    expect(a).toBe('supersonico|nitroplus');
  });

  it('rozróżnia postacie o tym samym imieniu z różnych serii', () => {
    const ccs = characterKey({ name: 'Sakura', series: 'Cardcaptor Sakura' });
    const naruto = characterKey({ name: 'Sakura', series: 'Naruto' });
    expect(ccs).not.toBe(naruto);
  });

  it('znosi znaki ozdobne w tytule serii', () => {
    expect(characterKey({ name: 'Izumi Konata', series: 'Lucky☆Star' }))
      .toBe(characterKey({ name: 'Izumi Konata', series: 'Lucky Star' }));
  });

  it('sama seria bez postaci nie jest tożsamością nikogo', () => {
    expect(characterKey({ series: 'Nitroplus' })).toBe('');
    expect(characterKey({})).toBe('');
  });
});

describe('makeSlug — czytelny adres', () => {
  it('składa adres z postaci, producenta i skali', () => {
    expect(makeSlug({ name: 'Sone Miyuki', manufacturer: 'Griffon Enterprises', scale: '1/8' }))
      .toBe('sone-miyuki-griffon-enterprises-1-8');
  });

  it('zamienia ukośnik w skali na myślnik', () => {
    expect(makeSlug({ name: 'Izumi Konata', manufacturer: 'Clayz', scale: '1/8' }))
      .toBe('izumi-konata-clayz-1-8');
  });

  it('usuwa znaki ozdobne, które nie mogą trafić do adresu', () => {
    expect(makeSlug({ name: 'Izumi Konata', manufacturer: 'Clayz', scale: '1/8' })).not.toMatch(/[^a-z0-9-]/);
    expect(makeSlug({ name: 'Lucky☆Star Konata', manufacturer: 'Clayz' })).toBe('lucky-star-konata-clayz');
  });

  it('pomija skalę, która nic nie wnosi („Non-scale")', () => {
    expect(makeSlug({ name: 'Kurisu Makise', manufacturer: 'Good Smile Company', scale: 'Non-scale' }))
      .toBe('kurisu-makise-good-smile-company');
    expect(makeSlug({ name: 'Rem', manufacturer: 'Good Smile Company', scale: '' }))
      .toBe('rem-good-smile-company');
  });

  it('wyłuskuje skalę także z opisu wymiarów', () => {
    expect(makeSlug({ name: 'Miku', manufacturer: 'GSC', scale: 'H=100mm (3.9in)' })).toBe('miku-gsc');
    expect(makeSlug({ name: 'Miku', manufacturer: 'GSC', scale: '1 / 7' })).toBe('miku-gsc-1-7');
  });

  it('nie zwraca adresu, gdy nie ma z czego go zbudować', () => {
    expect(makeSlug({ name: '泉 こなた' })).toBe('');
    expect(makeSlug({})).toBe('');
  });

  // Adres wypalony w opublikowanym filmie zmienić się NIE MOŻE — a rozdzielenie
  // nazwy na postać i wersję nie może go zmieniać nawet dla nowych figurek.
  it('daje ten sam adres dla nazwy złączonej i rozdzielonej', () => {
    const zlaczony = makeSlug({
      name: 'Zero Two: For My Darling', manufacturer: 'Good Smile Company', scale: '1/7',
    });
    const rozdzielony = makeSlug({
      name: 'Zero Two', version: 'For My Darling', manufacturer: 'Good Smile Company', scale: '1/7',
    });
    expect(rozdzielony).toBe(zlaczony);
    expect(rozdzielony).toBe('zero-two-for-my-darling-good-smile-company-1-7');
  });

  it('nie kończy adresu myślnikiem po przycięciu długiej nazwy', () => {
    const slug = makeSlug({ name: 'a'.repeat(120), manufacturer: 'Good Smile Company', scale: '1/7' });
    expect(slug.length).toBeLessThanOrEqual(90);
    expect(slug.endsWith('-')).toBe(false);
  });
});

describe('makeShortCode — kod do wypalenia w shorcie', () => {
  it('ma stałą długość i pomija znaki mylone przy przepisywaniu', () => {
    for (let i = 0; i < 200; i++) {
      const code = makeShortCode();
      expect(code).toHaveLength(4);
      expect(code).not.toMatch(/[01OIL]/); // zero/O, jedynka/I/L
    }
  });

  it('rozpoznaje własny kod i odrzuca czytelny adres', () => {
    expect(looksLikeShortCode(makeShortCode())).toBe(true);
    expect(looksLikeShortCode('7k2m')).toBe(true); // wielkość liter bez znaczenia
    expect(looksLikeShortCode('sone-miyuki-griffon-1-8')).toBe(false);
    expect(looksLikeShortCode('')).toBe(false);
  });
});

describe('figureUrl', () => {
  it('woli czytelny adres, a gdy go brak — kod', () => {
    expect(figureUrl({ slug: 'izumi-konata-clayz-1-8', short_code: '7K2M' }, 'https://figurefame.com'))
      .toBe('https://figurefame.com/f/izumi-konata-clayz-1-8');
    expect(figureUrl({ short_code: '7K2M' }, 'https://figurefame.com/'))
      .toBe('https://figurefame.com/f/7K2M');
  });
});
