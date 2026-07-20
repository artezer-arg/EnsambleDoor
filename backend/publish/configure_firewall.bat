@echo off
title Configurar Cortafuegos (Firewall) - Puesto DL01
echo =======================================================
echo Solicitando permisos de Administrador para abrir puertos...
echo =======================================================
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Por favor, ejecute este archivo haciendo clic derecho 
    echo         y seleccionando "Ejecutar como Administrador".
    echo.
    pause
    exit /b
)

echo Habilitando puerto 5121 para el HMI / Web API (Entrante)...
netsh advfirewall firewall add rule name="HMI Workstation DL01 Backend" dir=in action=allow protocol=TCP localport=5121 profile=any

echo Habilitando puerto 1433 para SQL Server (Entrante)...
netsh advfirewall firewall add rule name="SQL Server Connection Default" dir=in action=allow protocol=TCP localport=1433 profile=any

echo.
echo =======================================================
echo ¡Puertos configurados exitosamente en el Firewall de Windows!
echo =======================================================
echo.
pause
