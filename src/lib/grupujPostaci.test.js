import { describe, it, expect } from 'vitest';
import { odmienFigurki, ileFigurek, grupujPoPostaci } from './grupujPostaci';

// W żywej bazie każda zatwierdzona postać ma dziś po jednej figurce, więc
// klikanie po stronie nie sprawdziłoby ani grupowania, ani odmiany. Te testy
// są jedynym miejscem, gdzie widać, co się stanie przy pięciu wersjach Miku.

describe('odmienFigurki — polska odmiana liczebnika', () => {
  it('jedna', () => {
    expect(odmienFigurki(1)).toBe('figurka');
  });

  it('dwie, trzy, cztery', () => {
    expect(odmienFigurki(2)).toBe('figurki');
    expect(odmienFigurki(3)).toBe('figurki');
    expect(odmienFigurki(4)).toBe('figurki');
  });

  it('pięć i więcej', () => {
    expect(odmienFigurki(5)).toBe('figurek');
    expect(odmienFigurki(9)).toBe('figurek');
    expect(odmienFigurki(0)).toBe('figurek');
  });

  // Naiwna reguła „mniej niż pięć to figurki" wywraca się dokładnie tutaj.
  it('nastolatki są wyjątkiem', () => {
    expect(odmienFigurki(12)).toBe('figurek');
    expect(odmienFigurki(13)).toBe('figurek');
    expect(odmienFigurki(14)).toBe('figurek');
  });

  it('powyżej dwudziestu końcówka znowu decyduje', () => {
    expect(odmienFigurki(22)).toBe('figurki');
    expect(odmienFigurki(25)).toBe('figurek');
    expect(odmienFigurki(102)).toBe('figurki');
    expect(odmienFigurki(111)).toBe('figurek');
  });

  it('składa liczbę ze słowem', () => {
    expect(ileFigurek(5)).toBe('5 figurek');
    expect(ileFigurek(22)).toBe('22 figurki');
  });
});

describe('grupujPoPostaci', () => {
  const MIKU = 'id-miku';
  const SONICO = 'id-sonico';
  const postacie = {
    [MIKU]: { id: MIKU, slug: 'hatsune-miku', name: 'Hatsune Miku', japanese_name: '初音ミク' },
    [SONICO]: { id: SONICO, slug: 'super-sonico', name: 'Super Sonico' },
  };

  const figurki = [
    { id: 1, character_id: MIKU, character_name: 'Hatsune Miku', name: 'Hatsune Miku', version: null },
    { id: 2, character_id: SONICO, character_name: 'Super Sonico', name: 'Super Sonico' },
    { id: 3, character_id: MIKU, character_name: 'Hatsune Miku', name: 'Hatsune Miku: V4X', version: 'V4X' },
    { id: 4, character_id: MIKU, character_name: 'Hatsune Miku', name: 'Hatsune Miku: Expo 2025 Ver.', version: 'Expo 2025 Ver.' },
  ];

  it('pięć wersji jednej postaci to JEDEN wynik, nie pięć', () => {
    const grupy = grupujPoPostaci(figurki, postacie);
    expect(grupy).toHaveLength(2);
    const miku = grupy.find((g) => g.nazwa === 'Hatsune Miku');
    expect(miku.figurki).toHaveLength(3);
    expect(miku.postac.slug).toBe('hatsune-miku');
  });

  it('kolejność idzie za pierwszym wystąpieniem, więc wyniki nie skaczą', () => {
    const grupy = grupujPoPostaci(figurki, postacie);
    expect(grupy.map((g) => g.nazwa)).toEqual(['Hatsune Miku', 'Super Sonico']);
  });

  // Zgłoszenie sprzed przebiegu rozdzielającego nie ma jeszcze postaci.
  // Nie może przez to zniknąć z wyników wyszukiwania.
  it('figurka bez postaci dostaje własną grupę', () => {
    const grupy = grupujPoPostaci(
      [...figurki, { id: 5, character_id: null, name: 'Nowe zgłoszenie' }],
      postacie
    );
    expect(grupy).toHaveLength(3);
    const osierocona = grupy.find((g) => g.nazwa === 'Nowe zgłoszenie');
    expect(osierocona.postac).toBeNull();
    expect(osierocona.figurki).toHaveLength(1);
  });

  it('brak danych to brak grup, a nie wyjątek', () => {
    expect(grupujPoPostaci([], {})).toEqual([]);
    expect(grupujPoPostaci(null)).toEqual([]);
  });
});
