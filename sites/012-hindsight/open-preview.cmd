@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-preview.ps1" -OpenBrowser
if errorlevel 1 pause
