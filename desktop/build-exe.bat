@echo off
rem ============================================================
rem   S POS - build the standalone Windows app (SPOS.exe)
rem   Produces:  dist\SPOS\SPOS.exe   (a self-contained folder)
rem   Developed by Sridhar Mahalingam
rem ============================================================
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.11+ is required to build. Install it from https://www.python.org
  pause & exit /b 1
)

if not exist "webapp\index.html" (
  echo.
  echo   webapp\ is missing. Build the web UI first:
  echo     cd ..\frontend
  echo     set VITE_API_URL=/api/v1
  echo     npm install ^&^& npm run build
  echo   then copy frontend\dist into desktop\webapp and re-run this.
  echo.
  pause & exit /b 1
)

if not exist ".venv\Scripts\python.exe" ( python -m venv .venv )
call ".venv\Scripts\activate.bat"
python -m pip install --upgrade pip >nul
echo Installing build dependencies...
pip install -r "..\backend\v17src\requirements.txt"
pip install -r "requirements-desktop.txt"

echo.
echo Building SPOS.exe  ^(this can take a few minutes^)...
pyinstaller --noconfirm spos.spec

echo.
echo ============================================================
echo   Done.  Run the app:   dist\SPOS\SPOS.exe
echo   To distribute: zip the whole  dist\SPOS  folder.
echo ============================================================
pause
