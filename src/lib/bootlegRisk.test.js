import { describe, it, expect } from 'vitest';
import { computeBootlegRisk, RISK_META } from './bootlegRisk.js';

describe('computeBootlegRisk', () => {
  it('popularna figurka znanego producenta → wysokie ryzyko', () => {
    const r = computeBootlegRisk({ manufacturer: 'Good Smile Company', series: 'Vocaloid', name: 'Hatsune Miku' });
    expect(r.level).toBe('high');
    expect(r.score).toBeGreaterThanOrEqual(65);
    expect(r.reasons.length).toBeGreaterThan(1);
  });

  it('sam producent wysokiego ryzyka → średnie', () => {
    const r = computeBootlegRisk({ manufacturer: 'Good Smile Company' });
    expect(r.level).toBe('medium');
  });

  it('pusta figurka → niskie ryzyko', () => {
    const r = computeBootlegRisk({});
    expect(r.level).toBe('low');
    expect(r.score).toBe(15);
  });

  it('brak argumentu nie wywala', () => {
    expect(() => computeBootlegRisk(undefined)).not.toThrow();
  });

  it('wynik zawsze w zakresie 5..95', () => {
    const r = computeBootlegRisk({
      manufacturer: 'Good Smile Nendoroid', series: 'Genshin Demon Slayer', name: 'Rem', type: 'Nendoroid prize trading',
    });
    expect(r.score).toBeLessThanOrEqual(95);
    expect(r.score).toBeGreaterThanOrEqual(5);
  });

  it('każdy poziom ma metadane', () => {
    for (const lvl of ['low', 'medium', 'high']) {
      expect(RISK_META[lvl]).toHaveProperty('label');
      expect(RISK_META[lvl]).toHaveProperty('color');
    }
  });
});
