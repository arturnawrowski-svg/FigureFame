import { describe, it, expect } from 'vitest';
import { identityKey, makeSlug, makeShortCode, looksLikeShortCode, figureUrl } from './figureIdentity';

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

  it('nie zwraca adresu, gdy nie ma z czego go zbudować', () => {
    expect(makeSlug({ name: '泉 こなた' })).toBe('');
    expect(makeSlug({})).toBe('');
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
