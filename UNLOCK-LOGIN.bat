@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File "%~dp0UNLOCK-LOGIN.ps1"
pause
