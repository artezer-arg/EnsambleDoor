@echo off
title Ensamble Door - Configurar Firewall de Windows
echo ===================================================
echo   Abriendo puerto 5121 para el HMI de Ensamble Door
echo ===================================================
echo.
echo Ejecutando comando de red...
netsh advfirewall firewall add rule name="EnsambleDoor HMI Workstation" dir=in action=allow protocol=TCP localport=5121
echo.
echo Listo. Puerto 5121 habilitado en el cortafuegos.
echo Ya puedes conectar otras computadoras de la red al HMI.
echo.
pause
