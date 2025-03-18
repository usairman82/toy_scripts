# Galaga Clone

A web-based clone of the classic arcade game Galaga, developed using Phaser.js.

## Features

- Classic Galaga gameplay with modern web technologies
- Multiple enemy types with different behaviors
- Power-up system (shield, double-shot, speed boost)
- Level progression with increasing difficulty
- Mobile and desktop support
- Level 256 kill screen with secret bypass code

## Controls

### Desktop Controls
- Arrow keys or WASD: Move player ship
- Spacebar: Fire weapon
- Esc: Pause game
- Enter: Confirm selections or restart

### Mobile Controls
- D-pad: Move player ship
- Fire button: Shoot weapon
- Mute button: Toggle sound

## Game Mechanics

- **Enemies**: Three types of enemies with different movement patterns and attack behaviors
- **Power-ups**: Collect shields, double-shot, and speed boost power-ups to enhance your ship
- **Scoring**: Earn points by destroying enemies and collecting power-ups
- **Life System**: Start with 3 lives, game over when all lives are lost
- **Kill Screen**: Special level 256 with secret bypass code (⬆️⬆️⬇️⬇️⬅️➡️⬅️➡️ Enter)

## Project Structure

```
galaga-clone/
├── assets/
│   ├── sprites/
│   │   ├── player_ship.png
│   │   ├── enemy_1.png
│   │   ├── enemy_2.png
│   │   ├── enemy_boss.png
│   │   ├── player_bullet.png
│   │   ├── enemy_bullet.png
│   │   ├── explosion_spritesheet.png
│   │   ├── powerup_shield.png
│   │   ├── powerup_double.png
│   │   ├── powerup_speed.png
│   │   ├── background.png
│   │   ├── ui_score.png
│   │   ├── ui_health.png
│   │   ├── ui_lives.png
│   │   ├── dpad.png
│   │   ├── fire_button.png
│   │   └── mute_button.png
│   └── audio/
│       ├── player_shoot.wav
│       ├── enemy_shoot.wav
│       ├── explosion.wav
│       ├── powerup_pickup.wav
│       ├── enemy_spawn.wav
│       ├── bg_music.mp3
│       └── game_over.wav
├── css/
│   └── styles.css
├── js/
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── MenuScene.js
│   │   ├── GameScene.js
│   │   └── GameOverScene.js
│   ├── objects/
│   │   ├── Player.js
│   │   ├── Enemy.js
│   │   ├── EnemyManager.js
│   │   ├── Bullet.js
│   │   └── PowerUp.js
│   └── main.js
└── index.html
```

## Deployment to AWS S3

1. **Create an S3 Bucket**:
   - Log in to your AWS Management Console
   - Navigate to S3 and create a new bucket
   - Give it a unique name (e.g., `my-galaga-clone`)
   - Choose a region close to your target audience
   - Leave all settings at their defaults and create the bucket

2. **Configure for Static Website Hosting**:
   - Select your new bucket and go to the "Properties" tab
   - Scroll down to "Static website hosting" and click "Edit"
   - Select "Enable" and set "Index document" to `index.html`
   - Save changes

3. **Set Bucket Policy for Public Access**:
   - Go to the "Permissions" tab
   - Under "Block public access", click "Edit"