@echo off
title IMPORTADOR DE CLIENTES A CLIWEB.DBF

echo ============================================
echo   IMPORTADOR DE CLIENTES A CLIWEB.DBF
echo ============================================

REM Directorio actual (api)
set BASE_DIR=%~dp0

REM Python del virtualenv (un nivel arriba)
set PYTHON_EXE=%BASE_DIR%..\venv\Scripts\python.exe

REM Script
set SCRIPT=%BASE_DIR%importar_clientes_dbf.py

REM Verificar python
if not exist "%PYTHON_EXE%" (
    echo.
    echo ❌ ERROR: No se encontro python del virtualenv
    echo Ruta buscada:
    echo %PYTHON_EXE%
    pause
    exit /b
)

REM Ejecutar script
"%PYTHON_EXE%" "%SCRIPT%"

echo.
echo Proceso finalizado.
pause
