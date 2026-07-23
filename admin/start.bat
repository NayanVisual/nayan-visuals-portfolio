@echo off
cd /d "%~dp0"
if exist "node_modules\.bin\electron.cmd" (
    start "" /B "node_modules\.bin\electron.cmd" .
) else (
    start "" "%~dp0..\..\NayanVisualsAdmin.exe"
)
