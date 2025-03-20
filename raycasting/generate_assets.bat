@echo off
echo Dungeon Adventure Game Asset Generator
echo ======================================
echo.
echo This script will generate all game assets and save them to the appropriate directories.
echo Requirements: Python 3.6+ and Pillow library
echo.
echo Checking for Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found! Please install Python 3.6 or higher.
    echo You can download Python from https://www.python.org/downloads/
    goto :end
)

echo Checking for Pillow library...
python -c "import PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo Pillow library not found! Installing...
    pip install pillow
    if %errorlevel% neq 0 (
        echo Failed to install Pillow. Please install it manually with:
        echo pip install pillow
        goto :end
    )
)

echo.
echo Running asset generator...
echo.
python generate_assets.py

echo.
echo Asset generation complete!
echo.
echo Press any key to exit...

:end
pause
