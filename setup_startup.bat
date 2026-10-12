@echo off
title Clinic Inventory - Startup Setup
color 0B

echo.
echo  ==========================================
echo   Windows Startup Setup
echo  ==========================================
echo.

:: Get current folder path
set CURRENT_DIR=%~dp0
set START_BAT=%CURRENT_DIR%start.bat

:: Create a shortcut in Windows Startup folder
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

echo  Startup folder mein add kar raha hoon...
echo  Path: %STARTUP_FOLDER%

:: Create VBS script to run start.bat silently (no black window)
set VBS_FILE=%STARTUP_FOLDER%\ClinicInventory.vbs

echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_FILE%"
echo WshShell.Run """" ^& "%START_BAT%" ^& """", 1, False >> "%VBS_FILE%"

if exist "%VBS_FILE%" (
    echo.
    echo  [SUCCESS] Setup complete!
    echo.
    echo  Ab se computer on karte hi Clinic Inventory
    echo  automatically start ho jayega.
    echo.
    echo  Pehli baar manually chalane ke liye:
    echo  start.bat pe double-click karein
) else (
    echo.
    echo  [ERROR] Setup fail hua. 
    echo  Manually start.bat ko Startup folder mein copy karein:
    echo  %STARTUP_FOLDER%
)

echo.
pause