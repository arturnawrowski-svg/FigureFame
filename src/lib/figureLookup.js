// ============================================================================
// Wyszukiwanie danych figurki po stronie przeglądarki.
// ----------------------------------------------------------------------------
// Wydzielone z panelu admina: to logika sieciowa (strumień zdarzeń, składanie
// odpowiedzi), a nie widok. Dzięki temu komponent zajmuje się wyświetlaniem,
// a tę część da się testować i użyć ponownie — np. w przyszłej wyszukiwarce
// publicznej.
// ============================================================================

/**
 * Czyta strumień zdarzeń (SSE) z /api/fetch-figure.
 * onProgress dostaje kolejne etapy (do paska postępu), funkcja zwraca finalne
 * dane figurki albo null, gdy serwer ich nie przysłał.
 */
export async function streamLookup(name, series, onProgress, opts = {}) {
  const url =
    `/api/fetch-figure?stream=1&name=${encodeURIComponent(name)}` +
    (series ? `&series=${encodeURIComponent(series)}` : '') +
    (opts.deep ? '&deep=1' : '') +
    (opts.refresh ? '&refresh=1' : '');

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Serwer odpowiedział ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Zdarzenia SSE rozdziela pusta linia; ostatni fragment może być niepełny.
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const event = (chunk.match(/^event:\s*(.+)$/m) || [])[1];
      const raw = (chunk.match(/^data:\s*([\s\S]+)$/m) || [])[1];
      if (!event || !raw) continue;

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        continue; // uszkodzone zdarzenie pomijamy, reszta strumienia jest ważna
      }

      if (event === 'progress') onProgress?.(payload);
      else if (event === 'result') result = payload;
      else if (event === 'error') throw new Error(payload.error || 'Błąd serwera');
    }
  }
  return result;
}

/**
 * Scala dane z wyszukiwania z formularzem edycji.
 * Zasady: puste wartości nic nie nadpisują, klucze techniczne (_sources,
 * _aiError…) to komunikaty i nie mogą trafić do zapisu w bazie, a pola
 * tekstowo-listowe rozbijamy na linie.
 */
export function mergeLookupIntoForm(form, data) {
  const out = { ...form };

  const assign = (key, val, isList) => {
    if (val === null || val === undefined || val === '') return;
    if (isList) {
      if (typeof val === 'string' && val.trim() !== '') {
        out[key] = val.split('\n').filter((line) => line.trim() !== '');
      } else if (Array.isArray(val) && val.length > 0) {
        out[key] = val;
      }
      return;
    }
    if (typeof val === 'string') {
      if (val.trim() !== '') out[key] = val;
    } else {
      out[key] = val;
    }
  };

  for (const key in data) {
    if (key.startsWith('_')) continue; // komunikaty, nie dane figurki

    if (key === 'additionalInfo' || key === 'additional_info') assign('additional_info', data[key], true);
    else if (key === 'whereToSearch' || key === 'where_to_search') assign('where_to_search', data[key], true);
    else if (key === 'strategy') assign('strategy', data[key], true);
    else if (key === 'marketValueAverage' || key === 'market_value_average') {
      if (data[key]) out.market_value = { average: data[key] };
    } else {
      assign(key, data[key], false);
    }
  }

  return out;
}
