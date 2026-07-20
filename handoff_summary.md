# FigureFame - Handoff / Stan Projektu (20.07.2026)

Ten plik służy jako pigułka informacyjna dla nowego okna czatu. Jeśli zaczynasz nową sesję z agentem, przeczytaj ten plik, aby złapać pełny kontekst.

## 1. Architektura i Stack
- **Frontend**: React + Vite
- **Styling**: Czysty CSS (zmienne CSS, szklane tła `glassmorphism`, animacje, czcionki Inter, Outfit, Noto Serif JP dla języka japońskiego). Globalny rozmiar fontu zmniejszony do `80%`.
- **Backend / Baza Danych**: Supabase
- **Hosting**: Vercel

## 2. Co zostało ostatnio zrobione?
- **Supabase Migration**: Zmieniliśmy klucze z projektu starego (`ges...`) na nowy (`sfx...`). Skonfigurowano od nowa tabele `profiles`, `figures` oraz `user_collections`.
- **Autoryzacja**: Logowanie i rejestracja zostały zaktualizowane, email confirmation jest w Supabase wyłączony (rejestracja od razu loguje). RLS na profilach zaktualizowany i testowany. Konto admina to `admin@figurefame.com`. Wylogowywanie od razu przekierowuje na ekran główny.
- **Baza Figurek**: Przenieśliśmy ze starej bazy 14 oryginalnych lalek (m.in. Rem, Super Sonico, Levi, Miku) prosto do nowej bazy `public.figures` z zachowaniem unikalnych struktur (JSON-y z ciekawostkami i rynkiem).
- **Czcionki**: Zaimplementowano w `Dossier.jsx` obsługę pięknej czcionki `Noto Serif JP` dedykowanej dla japońskich "krzaczków" (`japaneseName`, `japaneseSeries`).
- **Kopia zapasowa**: Pełen kod zzipowany lokalnie jako `FF_backup_200720260830.zip` oraz wypchnięty na główną gałąź GitHuba.

## 3. Plany i Następne Kroki (TODO)
- Rozpoczęcie prac nad agregatorem ofert "Goods Republic" (wcześniej wspomnianym przez użytkownika).
- Dalsze testowanie interfejsu (UX/UI) na froncie po wczytaniu docelowych 14 figurek.
- Możliwe integracje logowania przez zewnętrzne sieci społecznościowe (przyciski są przygotowane w UI).

---
*Drogi Agencie (AI) – po przeczytaniu tego pliku jesteś gotowy do dalszej pracy z Arturem nad FigureFame!*
