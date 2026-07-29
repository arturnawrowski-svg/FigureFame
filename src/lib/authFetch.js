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
// ============================================================================
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('Sesja wygasła — zaloguj się ponownie.');

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}
