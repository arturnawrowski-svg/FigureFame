# Archiwum dokumentów

Materiał **historyczny**. Nic tu nie opisuje dzisiejszego stanu projektu i nic stąd nie
należy traktować jako źródła prawdy — aktualne są cztery dokumenty w katalogu głównym:
[ZALOZENIA.md](../ZALOZENIA.md), [DONE.md](../DONE.md), [TODO.md](../TODO.md),
[FUTURE.md](../FUTURE.md).

Trzymamy je, bo pokazują, **jak myśleliśmy w danym momencie** — a to bywa cenniejsze niż
to, co ostatecznie wyszło.

| Plik | Czym był | Co go zastąpiło |
|---|---|---|
| [gemini-code-1782312395234.md](gemini-code-1782312395234.md) | Pierwotna koncepcja z 24.06.2026 pod nazwą **FigureFrame**: gablota + generator komiksów AI z figurkami, model subskrypcyjny ze „slotami" i „mocą". | Kierunek zmieniony: baza wiedzy o figurkach zamiast zabawki generatywnej. Dziś: [ZALOZENIA.md](../ZALOZENIA.md) |
| [streszczenie.md](streszczenie.md) | Stan projektu na 18.07.2026 — jeszcze przed routingiem, kontekstami i panelem w dzisiejszej postaci. | [DONE.md](../DONE.md) |
| [200720261841.md](200720261841.md) | Podsumowanie sesji z 20.07.2026 (OAuth Discord, pierwszy rurociąg konwersji zdjęć). | [DONE.md](../DONE.md) |
| [plan_claude_210720026.md](plan_claude_210720026.md) | **Zatwierdzony plan wdrożeniowy z 21.07.2026** — etapy 0–5, decyzje architektoniczne, sekcja o domenie i poczcie. Wszystkie etapy poza „realnymi cenami" zostały wykonane. | [DONE.md](../DONE.md) (co wyszło) i [FUTURE.md](../FUTURE.md) (co dalej) |

| [rozwój.md](rozwój.md) | Roczny plan rozwojowy z 28.07.2026 przygotowany w innym narzędziu: fazy z datami, harmonogram social, mierniki sukcesu. | [FUTURE.md](../FUTURE.md) — ta sama zawartość, ale zamiast dat są **warunki wejścia** („zaczynamy, gdy…"), bo daty w projekcie po godzinach zamieniają się w wyrzuty sumienia |

## Audyty z zewnątrz

[podsumowanie.md](podsumowanie.md) · [ocenaHD.md](ocenaHD.md) ·
[AUDYT-FIGUREFAME-ROZMOWA-2026-07-29.md](AUDYT-FIGUREFAME-ROZMOWA-2026-07-29.md) ·
[FigureFame-konsultacja-2026-07-28.md](FigureFame-konsultacja-2026-07-28.md)

Oceny projektu zrobione przez inne narzędzia. **Nie traktować ich jako listy zadań** —
każde twierdzenie zostało sprawdzone w kodzie albo wywołaniem, a wynik jest w sekcji
„Sprawdzone — NIE jest problemem" w [TODO.md](../TODO.md).

Krótko: około połowa „krytycznych" pozycji się nie potwierdziła (error boundary istnieje,
Tailwinda w projekcie nie ma, testów jest 49 a nie jeden, Schema.org jest, WebP działa na
iOS 14), a rzeczy najgroźniejszej — sześciu endpointów z kluczem `service_role` bez żadnej
autoryzacji — nie zauważył żaden z nich.

Trzymamy je jako przypomnienie, że **audyt czytający kod, ale nieuruchamiający ani jednego
zapytania, myli się w obie strony**: straszy tym, czego nie ma, i przemilcza to, co jest.
Cenna jest za to część o social mediach i programach afiliacyjnych w konsultacji z 28.07 —
tamte ustalenia weszły do [FUTURE.md](../FUTURE.md).
