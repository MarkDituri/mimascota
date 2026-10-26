@echo off
rem Doble clic: levanta el servidor local y abre la app en el navegador.
cd /d "%~dp0"
start "" http://localhost:8080
node servidor.js
pause
