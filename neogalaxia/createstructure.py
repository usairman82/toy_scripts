#!/usr/bin/env python3
import os
import shutil
import sys

def create_dir(path):
    """Create directory if it doesn't exist"""
    if not os.path.exists(path):
        os.makedirs(path)
        print(f"Created directory: {path}")

def create_file(path, content=""):
    """Create an empty file or file with content"""
    with open(path, 'w') as f:
        f.write(content)
    print(f"Created file: {path}")

def setup_galaga_project(base_dir):
    """Set up the Galaga clone project structure"""
    # Create base directory
    create_dir(base_dir)
    
    # Define project structure
    directories = [
        'assets/sprites',
        'assets/audio',
        'css',
        'js/scenes',
        'js/objects'
    ]
    
    # Create directories
    for directory in directories:
        create_dir(os.path.join(base_dir, directory))
    
    # Define files to create
    files = {
        # Sprite files
        'assets/sprites/player_ship.png': '',
        'assets/sprites/enemy_1.png': '',
        'assets/sprites/enemy_2.png': '',
        'assets/sprites/enemy_boss.png': '',
        'assets/sprites/player_bullet.png': '',
        'assets/sprites/enemy_bullet.png': '',
        'assets/sprites/explosion_spritesheet.png': '',
        'assets/sprites/powerup_shield.png': '',
        'assets/sprites/powerup_double.png': '',
        'assets/sprites/powerup_speed.png': '',
        'assets/sprites/background.png': '',
        'assets/sprites/ui_score.png': '',
        'assets/sprites/ui_health.png': '',
        'assets/sprites/ui_lives.png': '',
        'assets/sprites/dpad.png': '',
        'assets/sprites/fire_button.png': '',
        'assets/sprites/mute_button.png': '',
        
        # Audio files
        'assets/audio/player_shoot.wav': '',
        'assets/audio/enemy_shoot.wav': '',
        'assets/audio/explosion.wav': '',
        'assets/audio/powerup_pickup.wav': '',
        'assets/audio/enemy_spawn.wav': '',
        'assets/audio/bg_music.mp3': '',
        'assets/audio/game_over.wav': '',
        
        # CSS files
        'css/styles.css': '/* Galaga Clone CSS */\n',
        
        # JavaScript scene files
        'js/scenes/BootScene.js': '/* Boot Scene */\n',
        'js/scenes/MenuScene.js': '/* Menu Scene */\n',
        'js/scenes/GameScene.js': '/* Game Scene */\n',
        'js/scenes/GameOverScene.js': '/* Game Over Scene */\n',
        
        # JavaScript object files
        'js/objects/Player.js': '/* Player Class */\n',
        'js/objects/Enemy.js': '/* Enemy Class */\n',
        'js/objects/EnemyManager.js': '/* Enemy Manager Class */\n',
        'js/objects/Bullet.js': '/* Bullet Class */\n',
        'js/objects/PowerUp.js': '/* Power-Up Class */\n',
        
        # Main JS file
        'js/main.js': '/* Galaga Clone Main JS */\n',
        
        # HTML file
        'index.html': '<!DOCTYPE html>\n<html>\n<head>\n  <title>Galaga Clone</title>\n</head>\n<body>\n  <div id="game-container"></div>\n</body>\n</html>\n',
        
        # README
        'README.md': '# Galaga Clone\n\nA web-based clone of the classic arcade game Galaga.\n'
    }
    
    # Create files
    for file_path, content in files.items():
        create_file(os.path.join(base_dir, file_path), content)
    
    print(f"\nGalaga clone project structure created successfully in '{base_dir}'!")
    print("Next steps:")
    print("1. Replace placeholder image and audio files with actual assets")
    print("2. Implement the JavaScript files with the code from the project")
    print("3. Test locally and then deploy to AWS S3")

if __name__ == "__main__":
    # Use command line argument if provided, otherwise use default directory name
    project_dir = sys.argv[1] if len(sys.argv) > 1 else "galaga-clone"
    setup_galaga_project(project_dir)