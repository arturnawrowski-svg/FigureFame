# FigureFame

Baza danych i agregator wiedzy o **japońskich figurkach kolekcjonerskich** — z oceną ryzyka
podróbek, asystentem AI przy każdej figurce i (docelowo) śledzeniem realnych cen.

Projekt hobbystyczny, prowadzony w duchu **FREE-FIRST**: darmowe narzędzia tak długo, jak się da.

## Dokumenty — zacznij tutaj

| Plik | Co w nim jest |
|---|---|
| **[ZALOZENIA.md](ZALOZENIA.md)** | Czym jest projekt, na czym stoi, jakich zasad nie wolno złamać |
| **[DONE.md](DONE.md)** | Co już zrobione i dlaczego tak, a nie inaczej |
| **[TODO.md](TODO.md)** | Co do zrobienia, od najbardziej krytycznego |
| **[FUTURE.md](FUTURE.md)** | Co dalej — z warunkami wejścia zamiast dat |
| [handoff_summary.md](handoff_summary.md) | Stan techniczny i pułapki, które kosztowały czas |
| [DOKUMENTACJA.md](DOKUMENTACJA.md) | Opis produktu i architektury |
| [affiliation.md](affiliation.md) | Sklepy i programy partnerskie (dane referencyjne) |

## Uruchomienie

```bash
npm install
npm run dev      # front + endpointy /api/* przez middleware Vite
npm test         # 53 testy
npm run build
```

Zmienne środowiskowe w `.env.local` (klucze Supabase i AI) — bez nich aplikacja się nie zaloguje
i nie pobierze danych. Na produkcji te same zmienne stoją w ustawieniach Vercela.

## Narzędzia

| polecenie | co robi |
|---|---|
| `npm run adresy` | nadaje slug / kod / identity_key figurkom; `-- --zapisz` wykonuje |
| `npm run zdjecia` | ściąga zdjęcia do naszego magazynu; `-- --zapisz` wykonuje |
| `npm run kopia` | kopia zapasowa: ZIP do `kopie/` **oraz** na Dysk Google |
| `npm run lookup-worker:watch` | worker wyszukiwań (lokalna przeglądarka omija Cloudflare) |
| `npm run worker:watch` | kolejka renderowania shortów |
| `npm run gdrive-auth` | odnowienie dostępu do Dysku Google |

Najwygodniej: dwuklik na `FigureFame-Studio.cmd` — uruchamia oba workery naraz.
Instalacja pomocnika na stałe: [instalacja/CZYTAJ-TO-NAJPIERW.md](instalacja/CZYTAJ-TO-NAJPIERW.md).
