import { describe, it, expect } from 'vitest';
import { mergeLookupIntoForm, czegoBrakuje, jestPewny } from './figureLookup';

// Ta funkcja decyduje, KIEDY szukanie ma przestać. Za łagodna — jedno
// kliknięcie znów nie dowiezie kompletu i trzeba klikać w kółko. Za surowa —
// każda figurka mieli pełne trzy minuty bez sensu.
describe('czegoBrakuje — kiedy wynik jest pewny', () => {
  const KOMPLETNY = {
    japanese_name: '沢渡 いずみ',
    manufacturer: 'Enterbrain',
    scale: '1/7',
    official_image_url: 'https://sfxraogvhjhalzxuddgl.supabase.co/storage/v1/object/public/x.png',
  };

  it('komplet kończy szukanie', () => {
    expect(czegoBrakuje(KOMPLETNY)).toEqual([]);
    expect(jestPewny(KOMPLETNY)).toBe(true);
  });

  it('wymienia po polsku, czego nie ma', () => {
    expect(czegoBrakuje({ ...KOMPLETNY, japanese_name: '' })).toEqual(['nazwa japońska']);
    expect(czegoBrakuje({ ...KOMPLETNY, scale: null })).toEqual(['skala']);
  });

  // Adres na cudzym serwerze właściciel może odciąć w dowolnej chwili,
  // a wtedy Gablota pokazuje dziurę. api/fetch-figure.js i tak takie pole
  // czyści, więc uznanie go za „zdjęcie" kończyłoby szukanie za wcześnie.
  it('zdjęcie z cudzego serwera to BRAK zdjęcia', () => {
    expect(czegoBrakuje({ ...KOMPLETNY, official_image_url: 'https://myfigurecollection.net/x.jpg' }))
      .toEqual(['zdjęcie']);
  });

  it('sam biały znak nie jest wartością', () => {
    expect(czegoBrakuje({ ...KOMPLETNY, manufacturer: '   ' })).toEqual(['producent']);
  });

  it('brak odpowiedzi to brak wszystkiego, a nie „gotowe"', () => {
    expect(czegoBrakuje(null)).toHaveLength(4);
    expect(jestPewny(null)).toBe(false);
  });

  it('wymienia wszystkie braki naraz, żeby moderator wiedział, co go czeka', () => {
    expect(czegoBrakuje({ manufacturer: 'Alter' }))
      .toEqual(['nazwa japońska', 'skala', 'zdjęcie']);
  });
});

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

  // --- Ochrona przed cichą podmianą danych (prawdziwa awaria z 27.07.2026) ---
  // Katalog trafił w INNĄ wersję figurki Konaty i podmienił producenta „Clayz"
  // na „Good Smile Company" oraz skalę 1/8 na 1/4. Nikt tego nie zauważył,
  // bo pola dalej wyglądały na wypełnione.

  it('nie podmienia producenta ze zgłoszenia, nawet gdy dane są z katalogu', () => {
    const form = { name: 'Konata Izumi', manufacturer: 'Clayz', scale: '1/8' };
    const out = mergeLookupIntoForm(form, {
      manufacturer: 'Good Smile Company',
      scale: '1/4',
      _provenance: { manufacturer: 'catalog', scale: 'catalog' },
    });
    expect(out.manufacturer).toBe('Clayz');
    expect(out._conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'manufacturer', current: 'Clayz', found: 'Good Smile Company' }),
      ])
    );
  });

  it('nie rusza pól potwierdzonych wcześniej przez katalog', () => {
    const form = { scale: '1/8', series: 'Lucky Star' };
    const out = mergeLookupIntoForm(
      form,
      { scale: '1/4', series: 'Lucky☆Star', _provenance: { scale: 'catalog', series: 'catalog' } },
      { confirmed: new Set(['scale', 'series']) }
    );
    expect(out.scale).toBe('1/8');
    expect(out.series).toBe('Lucky Star');
    expect(out._conflicts).toHaveLength(2);
  });

  it('domysł AI nigdy nie nadpisuje wypełnionego pola', () => {
    const form = { series: 'Lucky Star', scale: '1/8' };
    const out = mergeLookupIntoForm(form, {
      series: 'Lucky Star (2007)',
      scale: '1/7',
      _provenance: { series: 'ai', scale: 'ai' },
    });
    expect(out.series).toBe('Lucky Star');
    expect(out.scale).toBe('1/8');
  });

  it('katalog uzupełnia pole puste i takie, którego nikt nie potwierdził', () => {
    const form = { series: '', scale: '1/7' };
    const out = mergeLookupIntoForm(form, {
      series: 'Lucky☆Star',
      scale: '1/8',
      _provenance: { series: 'catalog', scale: 'catalog' },
    });
    expect(out.series).toBe('Lucky☆Star'); // było puste
    expect(out.scale).toBe('1/8');         // niepotwierdzone → katalog wygrywa
    expect(out._conflicts).toBeUndefined();
  });

  it('nie zgłasza rozbieżności, gdy wartość jest ta sama', () => {
    const out = mergeLookupIntoForm(
      { manufacturer: 'Clayz' },
      { manufacturer: 'Clayz', _provenance: { manufacturer: 'catalog' } }
    );
    expect(out._conflicts).toBeUndefined();
  });

  it('nie nadpisuje opisu napisanego przez moderatora', () => {
    const form = { additional_info: ['Mój własny opis.'] };
    const out = mergeLookupIntoForm(form, { additional_info: 'Tekst od AI.' });
    expect(out.additional_info).toEqual(['Mój własny opis.']);
  });

  // Do 03.08 rozbieżność zgłaszały TYLKO pola z IDENTITY_FIELDS, a pozostałe —
  // w tym japońskie — były po cichu wyrzucane. Stąd „znowu nie uzupełnia nazw
  // japońskich": wartość bywała znaleziona, tylko nikt jej nie widział.
  it('zgłasza rozbieżność pola SPOZA tożsamości, zamiast ją wyrzucić', () => {
    const out = mergeLookupIntoForm(
      { japanese_series: 'ボーカロイド' },
      { japanese_series: 'VOCALOID', _provenance: { japanese_series: 'catalog' } },
      { confirmed: new Set(['japanese_series']) }
    );
    expect(out.japanese_series).toBe('ボーカロイド'); // potwierdzonego nie ruszamy
    expect(out._conflicts).toEqual([
      expect.objectContaining({ field: 'japanese_series', found: 'VOCALOID', wazne: false }),
    ]);
  });

  it('pola tożsamości są oznaczone, żeby panel pokazał je na górze', () => {
    const out = mergeLookupIntoForm(
      { manufacturer: 'Clayz', release_date: '2008' },
      {
        manufacturer: 'Good Smile Company',
        release_date: '2009',
        _provenance: { manufacturer: 'catalog', release_date: 'ai' },
      }
    );
    const wg = Object.fromEntries(out._conflicts.map((c) => [c.field, c.wazne]));
    expect(wg.manufacturer).toBe(true);
    expect(wg.release_date).toBe(false);
  });

  it('wartości złożonych nie pokazuje w dwóch kolumnach', () => {
    // „[object Object]" obok „[object Object]" nie jest pytaniem, na które
    // da się odpowiedzieć; `external_ids` i tak się dokłada, nie zastępuje.
    const out = mergeLookupIntoForm(
      { external_ids: { mfc: '111' } },
      { external_ids: { mfc: '222' }, _provenance: { external_ids: 'catalog' } },
      { confirmed: new Set(['external_ids']) }
    );
    expect(out._conflicts).toBeUndefined();
  });
});
