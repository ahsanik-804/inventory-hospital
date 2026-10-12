@echo off
title Clinic Inventory
color 0A

echo.
echo  ==========================================
echo   Clinic Inventory Starting...
echo  ==========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found!
    echo  Please install Python from: https://python.org
    pause
    exit
)

echo  Checking required libraries...
pip install watchdog openpyxl --quiet --exists-action i >nul 2>&1

echo  Starting file watcher...
start "" /min python watcher.py

timeout /t 3 /nobreak >nul

echo  Starting local server...
start "" /min python -m http.server 5500

timeout /t 2 /nobreak >nul

echo  Opening dashboard...
start "" "http://localhost:5500/main.html"

echo.
echo  ==========================================
echo   Clinic Inventory is running!
echo   Minimize this window — do not close it.
echo   Closing this window will stop the server.
echo  ==========================================
echo.
echo  Dashboard: http://localhost:5500/main.html
echo  Save your Excel file to auto-update data.
echo.
pause