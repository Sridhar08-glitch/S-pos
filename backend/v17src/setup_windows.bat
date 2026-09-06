@echo off
setlocal
cd /d %~dp0
python -m pip install -r requirements.txt || goto :fail
python manage.py check || goto :fail
python scripts\generate_migrations.py || goto :fail
python manage.py check --deploy || goto :fail
python seed_demo.py || goto :fail
echo.
echo NovaPOS backend setup complete.
echo API: http://127.0.0.1:8000/api/v1/
echo Swagger: http://127.0.0.1:8000/api/docs/
echo Health: http://127.0.0.1:8000/health/
goto :eof
:fail
echo.
echo SETUP FAILED. Fix the error above and run setup_windows.bat again.
exit /b 1
