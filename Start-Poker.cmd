@echo off
cd /d "%~dp0"
if exist "release\Poker-GTO-Advisor-1.0.0-Windows.exe" (
  start "" "release\Poker-GTO-Advisor-1.0.0-Windows.exe"
  exit /b
)
if exist "release\win-unpacked\Poker GTO Advisor.exe" (
  start "" "release\win-unpacked\Poker GTO Advisor.exe"
  exit /b
)
echo Den paketerade appen saknas. Bygger och startar utvecklingsversionen...
call npm run desktop
if errorlevel 1 pause
