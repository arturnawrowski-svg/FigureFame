import { describe, it, expect } from 'vitest';
import { mergeLookupIntoForm } from './figureLookup';

describe('mergeLookupIntoForm', () => {
  it('nie nadpisuje istniejących danych pustymi wartościami', () => {
    const form = { name: 'Miku', manufacturer: 'Good Smile Company' };
    const out = mergeLookupIntoForm(form, { name: '', manufacturer: '   ' });
    expect(out.name).toBe('Miku');
    expect(out.manufacturer).toBe('Good Smile Company');
  });

  it('odrzuca klucze techniczne, żeby nie trafiły do zapisu w bazie', () => {
    const out = mergeLookupIntoForm({}, {
      name: 'Levi',
      _sources: { mfc: 'ok' },
      _aiError: 'coś poszło nie tak',
      _fromCache: true,
    });
    expect(out.name).toBe('Levi');
    expect(out._sources).toBeUndefined();
    expect(out._aiError).toBeUndefined();
    expect(out._fromCache).toBeUndefined();
  });

  it('rozbija pola tekstowe na listy po liniach', () => {
    const out = mergeLookupIntoForm({}, { where_to_search: 'AmiAmi\nMandarake\n\nSolaris' });
    expect(out.where_to_search).toEqual(['AmiAmi', 'Mandarake', 'Solaris']);
  });

  it('akceptuje listy przysłane już jako tablica', () => {
    const out = mergeLookupIntoForm({}, { whereToSearch: ['eBay', 'Rakuten'] });
    expect(out.where_to_search).toEqual(['eBay', 'Rakuten']);
  });

  it('zamienia wartość rynkową na obiekt z polem average', () => {
    const out = mergeLookupIntoForm({}, { market_value_average: '~ 22 500 JPY' });
    expect(out.market_value).toEqual({ average: '~ 22 500 JPY' });
  });

  it('przyjmuje japońskie nazwy z katalogu', () => {
    const out = mergeLookupIntoForm({}, { japanese_name: '初音 ミク', japanese_series: 'ボーカロイド' });
    expect(out.japanese_name).toBe('初音 ミク');
    expect(out.japanese_series).toBe('ボーカロイド');
  });
});
