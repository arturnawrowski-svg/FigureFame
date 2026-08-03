import { describe, it, expect } from 'vitest';
import { kluczPostaci, kluczProduktu } from './lookupShared.js';

// Tło normalizacji: wynik wyszukiwania wraca do formularza, więc katalogowa
// pisownia („Lucky☆Star") zastępuje wpisaną przez zgłaszającego („Lucky Star").
// Przy słabej normalizacji drugie kliknięcie liczyło INNY klucz, chybiało
// w pamięć podręczną i uruchamiało pełne wyszukiwanie od zera — a to bez
// przeglądarki potrafi zwrócić gorsze dane. Tak właśnie „Clayz, 1/8"
// zamieniło się w „Good Smile Company, 1/4".
describe('kluczProduktu — normalizacja', () => {
  it('scala pisownię serii ze znakiem ozdobnym i bez', () => {
    expect(kluczProduktu('Izumi Konata', 'Lucky☆Star')).toBe(kluczProduktu('Izumi Konata', 'Lucky Star'));
  });

  it('ignoruje wielkość liter, myślniki i interpunkcję', () => {
    expect(kluczProduktu('Hatsune Miku', 'Vocaloid')).toBe(kluczProduktu('HATSUNE  MIKU', 'vocaloid!'));
    expect(kluczProduktu('Levi', 'Attack on Titan')).toBe(kluczProduktu('Levi', 'Attack-on-Titan'));
  });

  it('składa znaki pełnej szerokości do zwykłych', () => {
    expect(kluczProduktu('Ｍｉｋｕ', 'Ｖｏｃａｌｏｉｄ')).toBe(kluczProduktu('Miku', 'Vocaloid'));
  });

  it('zachowuje japońskie nazwy — nie wolno ich zjeść przy czyszczeniu', () => {
    expect(kluczProduktu('泉 こなた', 'らき☆すた')).toBe('prod|quick|泉こなた|らきすた|||');
    // Ten sam tytuł zapisany z separatorem i bez musi trafiać w ten sam wpis.
    expect(kluczProduktu('泉こなた', 'らきすた')).toBe(kluczProduktu('泉 こなた', 'らき☆すた'));
  });

  it('rozróżnia RÓŻNE figurki — normalizacja nie może ich sklejać', () => {
    expect(kluczProduktu('Rem', 'Re:Zero')).not.toBe(kluczProduktu('Ram', 'Re:Zero'));
    expect(kluczProduktu('Miku', 'Vocaloid')).not.toBe(kluczProduktu('Miku', 'Macross'));
  });

  it('nie zmienia kolejności słów — to byłby klucz do cudzych danych', () => {
    expect(kluczProduktu('Izumi Konata', 'Lucky Star')).not.toBe(kluczProduktu('Konata Izumi', 'Lucky Star'));
  });

  it('tryb dokładny (TOP) ma własny wpis, żeby nie mieszał się ze zwykłym', () => {
    expect(kluczProduktu('Miku', 'Vocaloid', 'deep')).not.toBe(kluczProduktu('Miku', 'Vocaloid', 'quick'));
  });
});

// To jest naprawa incydentu z 02.08: trzy pobrania HMX-17c Silfa (lookup_queue
// id 6, 7, 9) pisały pod JEDEN klucz, bo producent i skala do niego nie
// wchodziły. Wygrywało ostatnie — i stąd „Alter 1/8 zamiast Kotobukiya 1/6".
describe('kluczProduktu — rozróżnia wydania tej samej postaci', () => {
  const silfa = (opcje) => kluczProduktu('HMX-17c Silfa', 'To Heart 2', 'deep', opcje);

  it('inny producent to inny wpis', () => {
    expect(silfa({ manufacturer: 'Kotobukiya', scale: '1/6' }))
      .not.toBe(silfa({ manufacturer: 'Alter', scale: '1/6' }));
  });

  it('inna skala to inny wpis', () => {
    expect(silfa({ manufacturer: 'Kotobukiya', scale: '1/6' }))
      .not.toBe(silfa({ manufacturer: 'Kotobukiya', scale: '1/8' }));
  });

  it('inna wersja to inny wpis, nawet przy tym samym producencie i skali', () => {
    const zwykla = kluczProduktu('Super Sonico', 'Nitroplus', 'quick', { manufacturer: 'Alter', scale: '1/7' });
    const tygrys = kluczProduktu('Super Sonico', 'Nitroplus', 'quick', { manufacturer: 'Alter', scale: '1/7', version: 'Tiger Hoodie' });
    expect(tygrys).not.toBe(zwykla);
  });

  it('„1/6" i „1 / 6" to ta sama skala — inaczej spacja gubiłaby wpis', () => {
    expect(silfa({ manufacturer: 'Kotobukiya', scale: '1/6' }))
      .toBe(silfa({ manufacturer: 'Kotobukiya', scale: '1 / 6' }));
  });

  it('producent z ogonkiem spacji trafia w ten sam wpis', () => {
    // W bazie leży dokładnie taki rekord: „Kotobukiya " ze spacją na końcu.
    expect(silfa({ manufacturer: 'Kotobukiya ', scale: '1/6' }))
      .toBe(silfa({ manufacturer: 'Kotobukiya', scale: '1/6' }));
  });
});

// Poziom postaci istnieje po to, żeby japońska nazwa pobrana raz trafiała
// do każdej kolejnej figurki tej postaci — to odpowiedź na „znowu nie
// uzupełnia nazw japońskich".
describe('kluczPostaci — jedna postać, wiele figurek', () => {
  it('NIE zależy od producenta ani skali', () => {
    // Postać jest jedna niezależnie od tego, kto ją odlał.
    expect(kluczPostaci('Super Sonico', 'Nitroplus')).toBe('char|supersonico|nitroplus');
  });

  it('jest wspólny dla trybu zwykłego i dokładnego', () => {
    // Nazwa postaci nie robi się prawdziwsza od dokładniejszego szukania,
    // a wspólny wpis podwaja trafialność.
    expect(kluczPostaci('Miku', 'Vocaloid')).toBe(kluczPostaci('Miku', 'Vocaloid'));
    expect(kluczPostaci('Miku', 'Vocaloid').startsWith('char|')).toBe(true);
  });

  it('rozróżnia postacie o tym samym imieniu z różnych serii', () => {
    expect(kluczPostaci('Sakura', 'Cardcaptor Sakura')).not.toBe(kluczPostaci('Sakura', 'Naruto'));
  });

  it('nie da się pomylić z kluczem produktu', () => {
    expect(kluczPostaci('Miku', 'Vocaloid')).not.toBe(kluczProduktu('Miku', 'Vocaloid'));
  });
});
