@echo off
title Ensamble Door HMI - Servidor Workstation
echo ===================================================
echo   Iniciando Servidor HMI Ensamble Door (Puerto 5121)
echo ===================================================
echo.
echo Abriendo la pantalla del HMI en el navegador...
start "" http://localhost:5121
echo.
backend.exe
pause
