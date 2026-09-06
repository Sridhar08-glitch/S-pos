@echo off
rem ============================================================
rem   S POS - run the app from source (no build needed)
rem   Developed by Sridhar Mahalingam
rem ============================================================
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Python is required. Please install Python 3.11 or newer from
  echo   https://www.python.org/downloads/  ^(tick "Add python.exe to PATH"^)
  echo   then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating local environment ^(first run only^)...
  python -m venv .venv
)
call ".venv\Scripts\activate.bat"

python -m pip install --upgrade pip >nul 2>nul
echo Installing dependencies ^(first run only, please wait^)...
pip install -r "..\backend\v17src\requirements.txt" >nul
pip install -r "requirements-desktop.txt" >nul

echo Starting S POS...
python run_spos.py
pause
