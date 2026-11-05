@echo off
cd /d "%~dp0"
where py >nul 2>&1
if not errorlevel 1 (
  echo Starting Helios Arena at http://localhost:8000
  start "" "http://localhost:8000"
  py -m http.server 8000
) else (
  echo Python not found. Install Python 3 and add it to PATH.
  pause
)
