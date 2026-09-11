@echo off
REM Chizz -- yerel sunucuyu baslatir (duello/API icin gerekli).
REM Sadece solo oynayacaksan buna gerek yok: public\index.html'e cift tikla.
cd /d "%~dp0"
echo.
echo   Chizz baslatiliyor...  http://localhost:8788
echo   Durdurmak icin: Ctrl+C
echo.
npx -y wrangler@latest pages dev --port 8788
echo.
echo   Sunucu durdu.
pause
