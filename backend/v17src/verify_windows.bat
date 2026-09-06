@echo off
setlocal
cd /d %~dp0

echo [1/4] Python version
python --version
if errorlevel 1 goto :fail

echo [2/4] Django system checks
python manage.py check
if errorlevel 1 goto :fail

echo [3/4] Migration consistency
python manage.py makemigrations --check --dry-run
if errorlevel 1 goto :fail

echo [4/4] Migration plan
python manage.py showmigrations

echo.
echo NovaPOS backend preflight completed.
goto :eof
:fail
echo.
echo PREFLIGHT FAILED.
exit /b 1
