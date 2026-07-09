# FigureFame - Roadmap & TODO

Plik śledzący kluczowe założenia, architekturę i cele rozwoju agregatora ofert figurek anime.

## 🎯 Architektura Backendowa (Silnik Danych)
- [ ] **Baza Danych:** Wdrożenie bazy (np. PostgreSQL / Supabase) do przechowywania informacji o figurkach (dane statyczne) i historii cen.
- [ ] **Moduł Scraperów / Worker Nodes:** Skrypty działające w tle (Cron Jobs), które okresowo odpytują zewnętrzne strony.
- [ ] **Zarządzanie Wydajnością (Cache):** Dane dynamiczne serwowane z pamięci podręcznej, aby nie blokować aplikacji tysiącami zapytań przy ładowaniu strony.

## 🛒 Integracje i Źródła (Baza 50+ stron)
- [ ] **Zaimplementowanie oficjalnych API (Filar 4):** 
  - [ ] eBay Partner API (dla licytacji i rynku zachodniego).
  - [ ] Amazon Product Advertising API (Japonia / Global).
- [ ] **Scrapowanie Sklepów Partnerskich (Dane statyczne):**
  - [ ] AmiAmi
  - [ ] Mandarake
  - [ ] Solaris Japan
  - [ ] Nin-Nin Game
  - [ ] Good Smile Company
- [ ] **Weryfikacja "Live Check":** System pingujący aukcję przed przekierowaniem użytkownika, by uniknąć martwych linków.

## 💻 Interfejs Użytkownika (Frontend)
- [x] Projekt widoku "Dossier" z podstawowymi metadanymi (Skala, Producent).
- [x] Integracja tooltips (dymków informacyjnych) edukujących użytkowników.
- [x] Lista "Top 10 Ofert Live" wyświetlana priorytetowo na dole profilu.
- [ ] Widok "Zobacz więcej ofert" (dalsze 40 ofert, wymagające odświeżania na życzenie lub rzadziej).
- [ ] **Formularz "Dodaj Figurkę":** Stworzenie mechanizmu Crowdsourcingu (jak w MyFigureCollection), aby użytkownicy sami dodawali lalki do bazy danych.

## 🚀 Wdrożenie i Infrastruktura
- [x] Połączenie repozytorium GitHub.
- [x] Konfiguracja automatycznych wdrożeń (Deployments) na platformie Vercel. (Wypchnięcie zmian na gałąź `main` automatycznie buduje i publikuje nową wersję).
- [ ] Przejście z darmowego planu (Hobby) Vercel na płatny (Pro), gdy baza przekroczy kilkadziesiąt tysięcy zapytań dziennie, a Cron Jobs będą wymagały większej mocy obliczeniowej.
