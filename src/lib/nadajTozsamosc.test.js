import { describe, it, expect, vi } from 'vitest';
import { tozsamoscDlaZapisu, zapiszZTozsamoscia } from './nadajTozsamosc';

const FIGURKA = { name: 'Super Sonico', manufacturer: 'Alter', scale: '1/7' };

describe('tozsamoscDlaZapisu — nowa figurka', () => {
  it('nadaje wszystkie trzy pola, bez uruchamiania npm run adresy', () => {
    const t = tozsamoscDlaZapisu(FIGURKA);
    expect(t.identity_key).toBe('supersonico|alter|17');
    expect(t.slug).toBe('super-sonico-alter-1-7');
    expect(t.short_code).toMatch(/^[2-9A-HJ-NP-Z]{4}$/);
  });

  it('gdy adres w ASCII nie wychodzi, zostaje sam krótki kod', () => {
    const t = tozsamoscDlaZapisu({ name: '泉 こなた' });
    expect(t.slug).toBeUndefined();
    expect(t.short_code).toHaveLength(4);
  });

  it('nie zmyśla odcisku, gdy nie ma z czego go policzyć', () => {
    expect(tozsamoscDlaZapisu({}).identity_key).toBeUndefined();
  });
});

// Adres bywa wypalony w opublikowanym filmie, którego już nie poprawisz.
// To jest ta gwarancja, nie preferencja.
describe('tozsamoscDlaZapisu — figurka, która już ma adres', () => {
  const OBECNA = { slug: 'stary-adres-z-filmu', short_code: 'ABCD' };

  it('NIE rusza istniejącego adresu ani kodu', () => {
    const t = tozsamoscDlaZapisu(FIGURKA, OBECNA);
    expect(t.slug).toBeUndefined();
    expect(t.short_code).toBeUndefined();
  });

  it('...nawet gdy moderator zmienił nazwę figurki', () => {
    const t = tozsamoscDlaZapisu({ ...FIGURKA, name: 'Zupełnie Inna Nazwa' }, OBECNA);
    expect(t.slug).toBeUndefined();
  });

  it('ale odcisk PRZELICZA, bo to nie adres tylko wykrywanie duplikatów', () => {
    const t = tozsamoscDlaZapisu({ ...FIGURKA, manufacturer: 'Good Smile Company' }, OBECNA);
    expect(t.identity_key).toBe('supersonico|goodsmilecompany|17');
  });
});

describe('zapiszZTozsamoscia — kolizja losowego kodu', () => {
  it('losuje nowy kod i ponawia, gdy poprzedni był zajęty', async () => {
    const kody = [];
    const zapisz = vi.fn(async (pola) => {
      kody.push(pola.short_code);
      return kody.length < 3 ? { error: { code: '23505' } } : { error: null };
    });

    const wynik = await zapiszZTozsamoscia(zapisz, FIGURKA);
    expect(wynik.error).toBeNull();
    expect(zapisz).toHaveBeenCalledTimes(3);
    // Za każdym razem INNY kod — inaczej ponawianie nie miałoby sensu.
    expect(new Set(kody).size).toBe(3);
  });

  it('nie ponawia innych błędów — powtarzanie ukryłoby prawdziwą przyczynę', async () => {
    const zapisz = vi.fn(async () => ({ error: { code: '42501', message: 'brak uprawnień' } }));
    const wynik = await zapiszZTozsamoscia(zapisz, FIGURKA);
    expect(zapisz).toHaveBeenCalledTimes(1);
    expect(wynik.error.code).toBe('42501');
  });

  it('poddaje się po kilku próbach zamiast kręcić się w kółko', async () => {
    const zapisz = vi.fn(async () => ({ error: { code: '23505' } }));
    const wynik = await zapiszZTozsamoscia(zapisz, FIGURKA);
    expect(zapisz.mock.calls.length).toBeLessThanOrEqual(5);
    expect(wynik.error.code).toBe('23505');
  });
});
