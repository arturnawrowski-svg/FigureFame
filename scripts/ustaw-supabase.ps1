# ============================================================================
#  Ustawia dostęp do Supabase — wszystko naraz.
#
#  Nie uruchamiaj tego pliku wprost. Kliknij dwa razy: Ustaw-Supabase.cmd
#
#  Co robi, po kolei:
#    1. dopisuje Claude Code do listy programów systemu (żeby "claude" działało)
#    2. pyta o klucz do Supabase i podłącza go
#    3. dokłada do VS Code sterownik, którym otwiera się baza
#
#  Można uruchamiać wielokrotnie — powtórzenie niczego nie psuje.
# ============================================================================

# ⚠️ NIE ustawiaj tu 'Stop'.
#
# Ten skrypt wywoluje zewnetrzne programy (claude.exe, code.cmd). PowerShell 5.1
# opakowuje wszystko, co taki program wypisze na strumien bledow, w blad
# systemowy - a przy 'Stop' KAZDY taki komunikat przerywa caly skrypt czerwona
# sciana tekstu, nawet gdy program zakonczyl sie powodzeniem.
#
# Najbardziej bolalo to przy "mcp remove": przy pierwszym uruchomieniu nie ma
# czego usuwac, wiec zawsze cos wypisuje - i skrypt umieral na samym poczatku.
#
# Powodzenie sprawdzamy tu kodem wyjscia ($LASTEXITCODE), nie strumieniem bledow.
$ErrorActionPreference = 'Continue'

$KATALOG_CLAUDE = "$env:USERPROFILE\.local\bin"
$PLIK_CLAUDE    = "$KATALOG_CLAUDE\claude.exe"
$PROJEKT        = 'sfxraogvhjhalzxuddgl'

# Caly przebieg ladzie w pliku obok skryptu. Dzieki temu jest CO przeslac,
# nawet gdyby okno zniknelo albo komunikat przewinal sie za szybko.
# Klucz do Supabase tu NIE trafia - czytamy go przez Read-Host, a tego
# zapis przebiegu nie obejmuje.
$LOG = Join-Path (Split-Path -Parent $PSScriptRoot) 'ustaw-supabase-log.txt'
try { Start-Transcript -Path $LOG -Force | Out-Null } catch { }

function Naglowek($tekst) {
  Write-Host ""
  Write-Host "  $tekst" -ForegroundColor Cyan
  Write-Host ("  " + ("-" * 60)) -ForegroundColor DarkGray
}
function Ok($tekst)    { Write-Host "  [gotowe] $tekst" -ForegroundColor Green }
function Uwaga($tekst) { Write-Host "  [uwaga]  $tekst" -ForegroundColor Yellow }
function Blad($tekst)  { Write-Host "  [BLAD]   $tekst" -ForegroundColor Red }

# Jedyne wyjscie ze skryptu. Zamyka zapis przebiegu, zeby plik z logiem byl
# kompletny. NIE zatrzymuje tu okna - robi to Ustaw-Supabase.cmd, zawsze
# i niezaleznie od tego, co sie tutaj wydarzy.
function Zakoncz($kod) {
  try { Stop-Transcript | Out-Null } catch { }
  exit $kod
}

# Siatka bezpieczenstwa na bledy, ktorych nie przewidzialem: zamiast zniknac,
# komunikat zostaje wypisany po ludzku i trafia do pliku z logiem.
trap {
  Write-Host ""
  Blad "Cos poszlo nie tak i skrypt sie zatrzymal."
  Write-Host "  Tresc bledu:" -ForegroundColor Red
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
  Write-Host ""
  Write-Host "  Przeslij plik ustaw-supabase-log.txt z katalogu projektu."
  Zakoncz 1
}

Write-Host ""
Write-Host "  ============================================================"
Write-Host "    FigureFame - podlaczenie Supabase"
Write-Host "  ============================================================"

# ---------------------------------------------------------------------------
# KROK 1 — żeby polecenie "claude" działało z każdego miejsca
# ---------------------------------------------------------------------------
Naglowek "Krok 1 z 3: program Claude"

if (-not (Test-Path $PLIK_CLAUDE)) {
  Blad "Nie znalazlem pliku: $PLIK_CLAUDE"
  Blad "Bez niego dalej sie nie da. Zglos to i zatrzymaj sie tutaj."
  Zakoncz 1
}

# Czytamy WLASNA liste programow uzytkownika, nie systemowa.
# Uwaga: swiadomie NIE uzywamy polecenia setx - ono obcina dluga liste
# na 1024 znakach i potrafi trwale uszkodzic ustawienia.
$mojaLista = [Environment]::GetEnvironmentVariable('PATH', 'User')
if ($mojaLista -split ';' -contains $KATALOG_CLAUDE) {
  Ok "Claude byl juz na liscie programow - nic nie zmieniam."
} else {
  $nowa = if ([string]::IsNullOrWhiteSpace($mojaLista)) { $KATALOG_CLAUDE }
          else { "$($mojaLista.TrimEnd(';'));$KATALOG_CLAUDE" }
  [Environment]::SetEnvironmentVariable('PATH', $nowa, 'User')
  Ok "Dopisalem Claude do listy programow."
  Uwaga "Zadziala w NOWYCH oknach konsoli. To okno jeszcze o tym nie wie."
}

# ---------------------------------------------------------------------------
# KROK 2 — klucz do Supabase
# ---------------------------------------------------------------------------
Naglowek "Krok 2 z 3: klucz do Supabase"

Write-Host "  Otworz w przegladarce:" -ForegroundColor White
Write-Host "     https://supabase.com/dashboard/account/tokens" -ForegroundColor White
Write-Host ""
Write-Host "  Zrob nowy token (Generate new token), skopiuj go i wklej ponizej."
Write-Host "  Zaczyna sie od   sbp_"
Write-Host ""
Write-Host "  Wklejanie w konsoli: prawy przycisk myszy albo Ctrl+V." -ForegroundColor DarkGray
Write-Host ""

$klucz = (Read-Host "  Wklej klucz i nacisnij Enter").Trim()

if ([string]::IsNullOrWhiteSpace($klucz)) {
  Blad "Nic nie wkleiles. Uruchom plik jeszcze raz."
  Zakoncz 1
}
if ($klucz -notlike 'sbp_*') {
  Uwaga "Ten klucz nie zaczyna sie od 'sbp_'. Moze byc pomylony z innym."
  $dalej = Read-Host "  Sprobowac mimo to? (t/n)"
  if ($dalej -ne 't') {
    Write-Host "  Przerwane. Uruchom plik jeszcze raz z wlasciwym kluczem."
    Zakoncz 1
  }
}

# Stare podlaczenie usuwamy, zeby dodanie nowego nie zglosilo konfliktu.
# Czyscimy OBA zakresy - wpis moze siedziec w projekcie po wczesniejszym
# uruchomieniu. Brak wpisu to nie blad, dlatego wynik nas nie obchodzi.
$lista = ''
try { $lista = (& $PLIK_CLAUDE mcp list | Out-String) } catch { $lista = '' }
if ($lista -match 'supabase') {
  & $PLIK_CLAUDE mcp remove supabase -s local | Out-Null
  & $PLIK_CLAUDE mcp remove supabase -s user  | Out-Null
  Write-Host "  Usunalem poprzednie podlaczenie." -ForegroundColor DarkGray
}

Write-Host "  Podlaczam..." -ForegroundColor DarkGray
# ⚠️ KOLEJNOSC ARGUMENTOW JEST KRYTYCZNA I ODWROTNA NIZ W DOKUMENTACJI.
#
# Wbudowana pomoc pokazuje przyklad:  mcp add -e KEY=val nazwa -- polecenie
# Ta kolejnosc NIE DZIALA. Przelacznik "-e" przyjmuje wiele wartosci naraz,
# wiec polyka takze nazwe serwera i konczy sie bledem:
#   "Invalid environment variable format: <nazwa>"
#
# Nazwa musi stac PRZED "-e". Sprawdzone uruchomieniem obu wersji na
# claude 2.1.96 - pierwsza konczy sie kodem 1, druga kodem 0.
#
# ⚠️ "-s user" JEST KONIECZNE, a nie ostrozne.
#
# Domyslny zakres to "local", czyli przypisany do SCIEZKI projektu. A sciezka
# nie jest jedna: PowerShell podaje ja z wielkim "C:", wtyczka VS Code z malym
# "c:". Konfiguracja traktuje to jako DWA rozne projekty, wiec wpis zrobiony
# stad byl niewidoczny dla Claude w edytorze - serwer zglaszal "Connected",
# a narzedzia i tak nie dochodzily.
#
# Zakres "user" nie jest przypisany do zadnej sciezki, wiec problem znika.
& $PLIK_CLAUDE mcp add supabase -s user -e "SUPABASE_ACCESS_TOKEN=$klucz" -- npx -y '@supabase/mcp-server-supabase@latest' "--project-ref=$PROJEKT"

if ($LASTEXITCODE -eq 0) {
  Ok "Supabase podlaczony (tylko projekt FigureFame, nie cale konto)."
} else {
  Blad "Podlaczenie nie wyszlo. Komunikat jest wyzej."
  Zakoncz 1
}

# ---------------------------------------------------------------------------
# KROK 3 — podglad bazy w VS Code (dla Ciebie, nie dla Claude)
# ---------------------------------------------------------------------------
Naglowek "Krok 3 z 3: podglad bazy w VS Code"

$code = Get-Command code -ErrorAction SilentlyContinue
if (-not $code) {
  Uwaga "Nie znalazlem VS Code w konsoli - pomijam. To nic pilnego."
} else {
  Write-Host "  Dokladam sterownik PostgreSQL do SQLTools, ktory juz masz." -ForegroundColor DarkGray
  Write-Host "  Dzieki niemu otworzysz baze w VS Code zamiast w przegladarce." -ForegroundColor DarkGray
  Write-Host "  Gdybys nie chcial: code --uninstall-extension mtxr.sqltools-driver-pg" -ForegroundColor DarkGray
  & code --install-extension mtxr.sqltools-driver-pg --force | Out-Null
  if ($LASTEXITCODE -eq 0) { Ok "Sterownik zainstalowany." } else { Uwaga "Nie udalo sie - pomijam, reszta dziala." }
}

# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host "    GOTOWE" -ForegroundColor Green
Write-Host "  ============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Zostala JEDNA rzecz: zamknij VS Code i otworz go na nowo."
Write-Host "  Bez tego Claude nie zobaczy nowego polaczenia."
Write-Host ""
Write-Host "  Potem napisz do Claude: 'sprawdz polaczenie z supabase'."
Write-Host ""
Zakoncz 0
