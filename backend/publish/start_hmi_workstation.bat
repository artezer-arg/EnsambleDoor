@echo off
title HMI Workstation DL01
echo =======================================================
echo Iniciando Servidor del Puesto DL01...
echo =======================================================
echo.
echo La aplicacion estara disponible en: http://localhost:5121
echo.
echo Si es la primera vez que inicia en esta computadora,
echo recuerde ir a Configuraicon para ajustar la cadena
echo de conexion de SQL Server.
echo.
echo =======================================================
start "" http://localhost:5121
backend.exe
