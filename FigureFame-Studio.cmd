@echo off
chcp 65001 >nul
title FigureFame Studio - lokalne renderowanie i pobieranie danych
cd /d "%~dp0"
echo.
echo   ============================================================
echo     FigureFame Studio
echo   ============================================================
echo.
echo   Ten program wykonuje na TWOIM komputerze prace, ktorych nie
echo   da sie zrobic w chmurze:
echo.
echo     1) renderuje shorty z kolejki i publikuje je na Google Drive
echo     2) pobiera dane figurek z katalogow prawdziwa przegladarka
echo        (katalogi blokuja serwery, przegladarke przepuszczaja)
echo.
echo   * Zostaw to okno OTWARTE - dziala w tle.
echo   * Klikaj w panelu admina na stronie, reszta dzieje sie tutaj.
echo   * Aby zakonczyc: zamknij to okno.
echo.
echo   ------------------------------------------------------------
echo.
echo   [1/2] Uruchamiam pobieranie danych figurek (osobne okno)...
start "FigureFame - dane figurek" cmd /k "npm run lookup-worker:watch"
echo   [2/2] Uruchamiam renderowanie shortow...
echo.
call npm run worker:watch
echo.
echo   [!] Worker sie zatrzymal. Nacisnij dowolny klawisz, aby zamknac.
pause >nul
