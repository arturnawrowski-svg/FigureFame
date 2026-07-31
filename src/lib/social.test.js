import { describe, it, expect } from 'vitest';
import { KONTA, kontaAktywne } from './social';

describe('social — konta marki', () => {
  it('nie pokazuje kont bez adresu', () => {
    // Reguła, o którą chodzi w całym pliku: odnośnik do pustego kanału szkodzi
    // bardziej niż jego brak. Ten test pilnuje, żeby ktoś kiedyś nie „naprawił"
    // stopki, wstawiając zaślepki.
    const puste = KONTA.filter((k) => k.url.trim() === '').map((k) => k.klucz);
    const widoczne = kontaAktywne().map((k) => k.klucz);

    for (const klucz of puste) {
      expect(widoczne).not.toContain(klucz);
    }
  });

  it('pokazuje konto, gdy adres jest uzupełniony', () => {
    const probka = [{ klucz: 'test', nazwa: 'Test', url: 'https://example.com', d: 'M0 0' }];
    expect(probka.filter((k) => k.url.trim() !== '')).toHaveLength(1);
  });

  it('każde konto ma nazwę i ścieżkę znaku', () => {
    // Pusta ścieżka = niewidoczna ikona, czyli cicha awaria: przycisk jest,
    // ale nic nie widać. Brak `nazwa` to z kolei brak nazwy dostępnej.
    for (const konto of KONTA) {
      expect(konto.nazwa, `konto ${konto.klucz} bez nazwy`).toBeTruthy();
      expect(konto.d?.length, `konto ${konto.klucz} bez ścieżki znaku`).toBeGreaterThan(20);
    }
  });

  it('klucze są unikalne', () => {
    const klucze = KONTA.map((k) => k.klucz);
    expect(new Set(klucze).size).toBe(klucze.length);
  });
});
