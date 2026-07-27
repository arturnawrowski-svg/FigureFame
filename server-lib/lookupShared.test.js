import { describe, it, expect } from 'vitest';
import { cacheKey } from './lookupShared.js';

// Tło: wynik wyszukiwania wraca do formularza, więc katalogowa pisownia
// („Lucky☆Star") zastępuje wpisaną przez zgłaszającego („Lucky Star").
// Przy słabej normalizacji drugie kliknięcie liczyło INNY klucz, chybiało
// w pamięć podręczną i uruchamiało pełne wyszukiwanie od zera — a to bez
// przeglądarki potrafi zwrócić gorsze dane. Tak właśnie „Clayz, 1/8"
// zamieniło się w „Good Smile Company, 1/4".
describe('cacheKey', () => {
  it('scala pisownię serii ze znakiem ozdobnym i bez', () => {
    expect(cacheKey('Izumi Konata', 'Lucky☆Star')).toBe(cacheKey('Izumi Konata', 'Lucky Star'));
  });

  it('ignoruje wielkość liter, myślniki i interpunkcję', () => {
    expect(cacheKey('Hatsune Miku', 'Vocaloid')).toBe(cacheKey('HATSUNE  MIKU', 'vocaloid!'));
    expect(cacheKey('Levi', 'Attack on Titan')).toBe(cacheKey('Levi', 'Attack-on-Titan'));
  });

  it('składa znaki pełnej szerokości do zwykłych', () => {
    expect(cacheKey('Ｍｉｋｕ', 'Ｖｏｃａｌｏｉｄ')).toBe(cacheKey('Miku', 'Vocaloid'));
  });

  it('zachowuje japońskie nazwy — nie wolno ich zjeść przy czyszczeniu', () => {
    expect(cacheKey('泉 こなた', 'らき☆すた')).toBe('quick|泉こなた|らきすた');
    // Ten sam tytuł zapisany z separatorem i bez musi trafiać w ten sam wpis.
    expect(cacheKey('泉こなた', 'らきすた')).toBe(cacheKey('泉 こなた', 'らき☆すた'));
  });

  it('rozróżnia RÓŻNE figurki — normalizacja nie może ich sklejać', () => {
    expect(cacheKey('Rem', 'Re:Zero')).not.toBe(cacheKey('Ram', 'Re:Zero'));
    expect(cacheKey('Miku', 'Vocaloid')).not.toBe(cacheKey('Miku', 'Macross'));
  });

  it('nie zmienia kolejności słów — to byłby klucz do cudzych danych', () => {
    expect(cacheKey('Izumi Konata', 'Lucky Star')).not.toBe(cacheKey('Konata Izumi', 'Lucky Star'));
  });

  it('tryb dokładny (TOP) ma własny wpis, żeby nie mieszał się ze zwykłym', () => {
    expect(cacheKey('Miku', 'Vocaloid', 'deep')).not.toBe(cacheKey('Miku', 'Vocaloid', 'quick'));
  });
});
