@echo off
REM ============================================================
REM EXPORTAR PEDIDOS A PEDIWEB (TXT)
REM ============================================================

REM Evita problemas con variables
setlocal EnableDelayedExpansion

REM ------------------------------------------------------------
REM Ir al directorio donde está este .bat
REM ------------------------------------------------------------
cd /d "%~dp0"

echo ==========================================
echo EXPORTACION PEDIWEB - INICIO
echo ==========================================
echo.

REM ------------------------------------------------------------
REM Activar entorno virtual si existe
REM ------------------------------------------------------------
if exist ".venv\Scripts\activate.bat" (
    echo Activando entorno virtual...
    call .venv\Scripts\activate.bat
) else (
    echo WARNING: No se encontro entorno virtual (.venv)
)

echo.
echo Ejecutando exportacion...
echo.

REM ------------------------------------------------------------
REM Ejecutar script Python
REM ------------------------------------------------------------
python exportar_pediweb.py

REM ------------------------------------------------------------
REM Verificar resultado
REM ------------------------------------------------------------
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Fallo la exportacion
) else (
    echo.
    echo Exportacion finalizada correctamente
)

echo.
echo ==========================================
echo EXPORTACION PEDIWEB - FIN
echo ==========================================

pause
endlocal
