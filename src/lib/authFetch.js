import { supabase } from './supabaseClient';

// ============================================================================
// authFetch — zwykły fetch z dopiętym tokenem sesji.
//
// Endpointy pracujące kluczem `service_role` (wgrywanie zdjęć, wyszukiwanie
// danych, render shorta, odświeżanie ofert) sprawdzają, kto puka —
// patrz server-lib/wymagajModeratora.js. Token trzeba więc dołożyć do KAŻDEGO
// takiego wywołania, a nie do przypadkowo wybranych.
//
// Świadomie NIE trzymamy tokenu w zmiennej modułu: sesja bywa odświeżana
// w tle i zapamiętany token po godzinie jest już nieważny. `getSession()`
// zwraca aktualny (a przy okazji sam odnawia, gdy trzeba).
//
// DLACZEGO WŁASNY NAGŁÓWEK, A NIE `Authorization`:
// nagłówek `Authorization` jest zajęty przez zasłonę na hasło (HTTP Basic Auth
// na brzegu Vercela — middleware.js). Gdy wysłaliśmy tam swój `Bearer …`,
// zasłona widziała „to nie jest Basic", odsyłała 401 z `WWW-Authenticate`,
// a przeglądarka na taką odpowiedź KASUJE zapamiętane hasło do strony
// i pyta o nie od nowa. Efekt: każde kliknięcie w panelu wyrzucało moderatora
// do okienka z hasłem. Lokalnie tego nie widać, bo w dev zasłony nie ma.
// ============================================================================

export const NAGLOWEK_TOKENU = 'x-ff-token';

export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sesja wygasła — zaloguj się ponownie.');

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      [NAGLOWEK_TOKENU]: `Bearer ${token}`,
    },
  });
}
