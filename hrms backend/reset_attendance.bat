@echo off
echo Resetting daily attendance...
cd /d "%~dp0"
call venv\Scripts\activate
python manage.py reset_daily_attendance
pause
