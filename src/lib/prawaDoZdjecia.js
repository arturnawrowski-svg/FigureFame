// ============================================================================
// Podpis praw do zdjęcia figurki.
// ----------------------------------------------------------------------------
// Pokazujemy cudze zdjęcia produktów, więc pod każdym musi stać, czyje są.
// To minimum przyzwoitości wobec producenta i pierwsza rzecz, o którą pyta
// program afiliacyjny przy weryfikacji strony.
//
// Kolejność: to, co wpisał moderator → producent figurki. Gdy moderator
// zostawi pole puste, podpisujemy producentem — dzięki temu ŻADNA figurka
// nie trafia do Gabloty bez podpisu, nawet gdy nikt o tym polu nie pomyślał.
//
// Piszemy „Fot.", a nie „©", świadomie. Przypisujemy AUTORSTWO ZDJĘCIA, a nie
// rozstrzygamy o prawach do postaci — te należą do wydawcy anime, czyli kogoś
// innego niż producent figurki. „© Good Smile Company" pod zdjęciem Hatsune
// Miku byłoby po prostu nieprawdą.
// ============================================================================

export function prawaDoZdjecia(figurka) {
  if (!figurka) return '';
  const wlasciciel = String(figurka.image_credit || figurka.manufacturer || '').trim();
  return wlasciciel ? `Fot. ${wlasciciel}` : '';
}
