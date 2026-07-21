import { describe, it, expect } from 'vitest';
import {
  accentColors, scaleOf, presetOf, musicFileOf, videoStrings,
  defaultShortOptions, QUEUE_MAX, BUFFER_WARN,
} from './shortOptions.js';

describe('accentColors', () => {
  it('zwraca stałe kolory dla znanego klucza', () => {
    expect(accentColors('cyjan')).toEqual(['#2bd4ff', '#00ffa3']);
  });
  it('dla auto liczy 2 kolory z nazwy (deterministycznie)', () => {
    const a = accentColors('auto', 'Hatsune Miku');
    expect(a).toHaveLength(2);
    expect(a[0]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(accentColors('auto', 'Hatsune Miku')).toEqual(a); // powtarzalne
  });
  it('nieznany klucz → traktowany jak auto', () => {
    expect(accentColors('cokolwiek', 'X')).toHaveLength(2);
  });
});

describe('scaleOf / presetOf / musicFileOf', () => {
  it('scaleOf mapuje rozdzielczość', () => {
    expect(scaleOf('1080')).toBe(1);
    expect(scaleOf('2160')).toBe(2);
    expect(scaleOf('nieznane')).toBe(1);
  });
  it('presetOf zwraca preset lub domyślny', () => {
    expect(presetOf('dynamiczny').motion).toBe(1.35);
    expect(presetOf('brak').label).toBe(presetOf('klasyczny').label);
  });
  it('musicFileOf mapuje klucz na plik, none → null', () => {
    expect(musicFileOf('puls')).toBe('puls.mp3');
    expect(musicFileOf('none')).toBeNull();
    expect(musicFileOf('xxx')).toBeNull();
  });
});

describe('videoStrings (i18n wideo)', () => {
  it('zwraca angielskie napisy', () => {
    expect(videoStrings('en').where).toBe('WHERE TO BUY');
    expect(videoStrings('en').riskHigh).toBe('Bootleg risk: HIGH');
  });
  it('nieznany język → polski fallback', () => {
    expect(videoStrings('xx').where).toBe(videoStrings('pl').where);
  });
});

describe('domyślne opcje i limity', () => {
  it('domyślny akcent auto + język pl', () => {
    const d = defaultShortOptions();
    expect(d.accent).toBe('auto');
    expect(d.lang).toBe('pl');
  });
  it('limity kolejki i bufora', () => {
    expect(QUEUE_MAX).toBe(100);
    expect(BUFFER_WARN).toBe(20);
    expect(QUEUE_MAX).toBeGreaterThan(BUFFER_WARN);
  });
});
