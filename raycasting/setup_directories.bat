@echo off
echo Creating directory structure for Dungeon Adventure Game...

REM Create main asset directories
if not exist assets mkdir assets
if not exist assets\textures mkdir assets\textures
if not exist assets\sprites mkdir assets\sprites
if not exist assets\audio mkdir assets\audio
if not exist assets\maps mkdir assets\maps
if not exist assets\ui mkdir assets\ui

REM Create subdirectories for specific asset types
if not exist assets\sprites\enemies mkdir assets\sprites\enemies
if not exist assets\sprites\items mkdir assets\sprites\items
if not exist assets\sprites\player mkdir assets\sprites\player
if not exist assets\audio\music mkdir assets\audio\music
if not exist assets\audio\sfx mkdir assets\audio\sfx

echo Directory structure created successfully!
echo.
echo Next steps:
echo 1. Open generate_textures.html in your browser to create texture files
echo 2. Save the generated textures to their appropriate folders
echo 3. Open index.html to play the game
echo.
pause
