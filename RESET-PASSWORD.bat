@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0RESET-PASSWORD.ps1"
pause
