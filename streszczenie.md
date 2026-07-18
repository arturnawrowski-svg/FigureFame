# FigureFame - Streszczenie Projektu (Stan na 18.07.2026)

## Co to za projekt?
Aplikacja webowa dla kolekcjonerów figurek anime (agregator wiedzy, ofert i baza danych). Frontend zbudowany w **React + Vite**, backend (baza danych + auth) stoi na **Supabase**. Strona działa już na serwerze produkcyjnym (Vercel). Motywem przewodnim jest "Tryb IDE" z pełnym wsparciem Dark/Light Mode.

## Aktualne funkcjonalności
1. **Wyświetlanie (Showcase)**: 
   - Estetyczna gablota wyświetlająca pobrane figurki z bazy Supabase.
   - Nowoczesny wygląd z przełączaniem motywu ciemny/jasny.
2. **Autoryzacja (Supabase Auth)**:
   - Zaimplementowane logowanie przez: Email/Hasło, Google, Discord, X (Twitter).
   - Wbudowane w system bezpieczeństwo bazy z Row Level Security (RLS).
3. **Profile Użytkowników**:
   - Dedykowana tabela `profiles` zsynchronizowana z systemem logowania.
   - Widok "Mój Profil" umożliwiający zmianę zdjęcia, danych osobistych oraz pokazujący **licznik dodanych przez siebie figurek**.
4. **Dodawanie figurek**:
   - Rozbudowany komponent `AddFigure.jsx` dostępny tylko dla zalogowanych użytkowników.
   - Przypisuje nowo stworzone obiekty do konta autora (kolumna `submitted_by`).

## Zaplanowany kolejny krok: REFAKTORYZACJA 🧹
Ze względu na rosnącą złożoność, aplikacja wymaga porządków. Planowane zadania:
- **Routing**: Wdrożenie `react-router-dom` w miejsce ręcznego sterowania widokami (stan `view`). Umożliwi to generowanie linków do konkretnych stron i profili.
- **Context API**: Wyizolowanie globalnego stanu (Theme, User) do `AuthContext` i `ThemeContext`, co odchudzi `App.jsx`.
- **Wydzielenie Nawigacji**: Stworzenie komponentu `Navbar.jsx` z obecnego headera.
- **Czyszczenie `AddFigure.jsx`**: Rozbicie długiego formularza na mniejsze sekcje (o ile będzie to konieczne).
- W przyszłości: Globalny Ranking Użytkowników (Leaderboard) zliczający ich figurki.

## Kontekst Bazy Danych (Supabase)
Tabelami zarządzającymi są `figures` oraz nowo dodana tabela `profiles` zintegrowana triggerem tak, aby automatycznie powstawała przy rejestracji nowego gracza.
W obiekcie dodawanej figurki, klucz obcy trzymający twórcę nazywa się **`submitted_by`**.
