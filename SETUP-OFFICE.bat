@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0SETUP-OFFICE.ps1"
pause
