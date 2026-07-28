@echo off
chcp 65001 >nul
title FigureFame - instalacja pomocnika (Windows)
cd /d "%~dp0.."
setlocal

echo.
echo   ============================================================
echo     FigureFame Studio — instalacja (Windows)
echo   ============================================================
echo.
echo   Ten instalator uruchamiasz JEDEN RAZ. Zrobi dwie rzeczy:
echo.
echo     1) Studio bedzie sie wlaczac samo przy starcie komputera
echo        (nie trzeba juz klikac w zaden plik)
echo     2) Przycisk "Uruchom Studio" na stronie bedzie dzialal
echo.
echo   Nic nie zostanie zainstalowane poza Twoim kontem uzytkownika.
echo   Nie sa wymagane uprawnienia administratora.
echo.
pause

set "PROJEKT=%CD%"
set "START_MENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

rem Sprawdzenie ZANIM cokolwiek zarejestrujemy. Wczesniej instalator zapisywal
rem sciezke bez sprawdzania, czy plik pod nia istnieje — skrot i przycisk
rem "Uruchom Studio" powstawaly poprawnie, tylko wskazywaly w prozne miejsce.
rem Klikniecie nie robilo NIC i nie dawalo zadnego komunikatu, wiec wygladalo
rem to jak zepsute Studio, a nie jak zla sciezka.
if not exist "%PROJEKT%\FigureFame-Studio.cmd" (
  echo.
  echo   [BLAD] Nie znaleziono pliku:
  echo          %PROJEKT%\FigureFame-Studio.cmd
  echo.
  echo   Instalator musi lezec w podfolderze "instalacja" wewnatrz projektu.
  echo   Przenies go tam i uruchom ponownie — nic nie zostalo zmienione.
  echo.
  pause
  exit /b 1
)

echo.
echo   [1/2] Ustawiam automatyczne uruchamianie...

rem Skrot w Autostarcie -> Studio rusza po zalogowaniu do Windows.
rem Okno startuje zminimalizowane, zeby nie przeszkadzalo.
powershell -NoProfile -Command ^
  "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('%START_MENU%\FigureFame Studio.lnk');" ^
  "$s.TargetPath='%PROJEKT%\FigureFame-Studio.cmd';" ^
  "$s.WorkingDirectory='%PROJEKT%';" ^
  "$s.WindowStyle=7;" ^
  "$s.Description='FigureFame - pobieranie danych i renderowanie w tle';" ^
  "$s.Save()"

if exist "%START_MENU%\FigureFame Studio.lnk" (
  echo         OK - Studio wlaczy sie przy nastepnym starcie komputera.
) else (
  echo         [!] Nie udalo sie utworzyc skrotu w Autostarcie.
)

echo   [2/2] Rejestruje przycisk "Uruchom Studio" na stronie...

rem Wlasny protokol figurefame:// - tak dzialaja linki Zooma czy Spotify.
rem Wpis trafia do HKEY_CURRENT_USER, czyli tylko dla tego uzytkownika.
reg add "HKCU\Software\Classes\figurefame" /ve /d "URL:FigureFame Protocol" /f >nul 2>&1
reg add "HKCU\Software\Classes\figurefame" /v "URL Protocol" /d "" /f >nul 2>&1
reg add "HKCU\Software\Classes\figurefame\shell\open\command" /ve ^
  /d "\"%PROJEKT%\FigureFame-Studio.cmd\"" /f >nul 2>&1

if %errorlevel%==0 (
  echo         OK - przycisk na stronie bedzie uruchamial Studio.
) else (
  echo         [!] Nie udalo sie zarejestrowac protokolu.
)

echo.
echo   ------------------------------------------------------------
echo   GOTOWE.
echo.
echo   Od teraz:
echo     * Studio wlacza sie samo po wlaczeniu komputera
echo     * w panelu na stronie zobaczysz zielone "Studio aktywne"
echo.
echo   Chcesz uruchomic Studio juz teraz? Zamknij to okno i kliknij
echo   FigureFame-Studio.cmd (albo zrestartuj komputer).
echo.
pause
