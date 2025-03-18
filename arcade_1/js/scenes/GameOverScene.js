class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        // Initialize game state variables
        this.playerHealth = 100;
        this.playerLives = GAME.lives;
        this.score = 0;
        this.level = GAME.level;
        this.isPaused = false;
        this.isGameOver = false;
        this.isKillScreen = false;
        this.killScreenTimer = null;
        GAME.currentCodeIndex = 0;
        
        // Power-up status
        this.powerups = {
            shield: { active: false, timer: null },
            doubleShot: { active: false, timer: null },
            speed: { active: false, timer: null }
        };
        
        // Bullet firing timers
        this.playerFireTimer = 0;
        this.playerFireDelay = 300; // Milliseconds between shots
        
        console.log("Starting game at level:", this.level, "GAME.level:", GAME.level);
    }

    create() {
        // Create scrolling background
        this.background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // Create player
        this.player = new Player(this, this.cameras.main.width / 2, this.cameras.main.height - 50);
        
        // Create enemy manager
        this.enemyManager = new EnemyManager(this);
        
        // Create object groups
        this.playerBullets = this.physics.add.group({
            classType: Bullet,
            runChildUpdate: true
        });
        
        this.enemyBullets = this.physics.add.group({
            classType: Bullet,
            runChildUpdate: true
        });
        
        this.powerupItems = this.physics.add.group();
        
        // Set up collision detection
        this.physics.add.overlap(this.playerBullets, this.enemyManager.enemies, this.bulletHitEnemy, null, this);
        this.physics.add.overlap(this.enemyBullets, this.player, this.bulletHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyManager.enemies, this.playerHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.powerupItems, this.collectPowerup, null, this);
        
        // Create UI elements
        this.createUI();
        
        // Set up keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        
        // Register input for kill screen code
        this.input.keyboard.on('keydown', this.checkKillScreenCode, this);
        
        // Create pause menu
        this.createPauseMenu();
        
        // Add mobile controls if needed
        if (GAME.isMobile) {
            this.createMobileControls();
        }
        
        // Start the level
        this.startLevel(this.level);
        
        // Play background music - safely
        this.safelyInitBackgroundMusic();
        
        // Set up resize handler
        this.scale.on('resize', this.resize, this);
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;
        
        // Update scrolling background
        this.background.tilePositionY -= 0.5;
        
        // Handle player input if player is alive
        if (this.player.active) {
            this.handlePlayerInput(time, delta);
        }
        
        // Update enemy manager
        this.enemyManager.update(time, delta);
        
        // Check if all enemies are destroyed
        if (this.enemyManager.enemies.countActive() === 0 && !this.isKillScreen) {
            this.time.delayedCall(2000, () => {
                this.level++;
                GAME.level = this.level;
                
                if (this.level === 256) {
                    this.triggerKillScreen();
                } else {
                    this.startLevel(this.level);
                }
            });
        }
        
        // Check for pause key press
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
        }
    }
    
    createUI() {
        // Create UI manager
        this.uiManager = new UIManager(this);
        
        // Create level text (not handled by UI manager)
        this.levelText = this.add.text(this.cameras.main.width - 20, 60, 'LEVEL: ' + this.level, {
            font: '24px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 0);
    }

createPauseMenu() {
        // Create a semi-transparent background
        this.pauseBackground = this.add.rectangle(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        );
        this.pauseBackground.setVisible(false);
        
        // Create pause text
        this.pauseText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            'GAME PAUSED',
            {
                font: '32px Arial',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Create resume button
        this.resumeButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 20,
            'RESUME',
            {
                font: '24px Arial',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        this.resumeButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.resumeButton.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => this.resumeButton.setStyle({ fill: '#ffffff' }))
            .on('pointerdown', () => this.togglePause());
        
        // Create quit button
        this.quitButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 70,
            'QUIT TO MENU',
            {
                font: '24px Arial',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        this.quitButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.quitButton.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => this.quitButton.setStyle({ fill: '#ffffff' }))
            .on('pointerdown', () => {
                // Reset level before returning to menu
                GAME.level = 1;
                this.scene.start('MenuScene');
            });
        
        // Hide pause menu elements initially
        this.pauseText.setVisible(false);
        this.resumeButton.setVisible(false);
        this.quitButton.setVisible(false);
    }
    
    createMobileControls() {
        // Check if assets exist first
        const hasCustomDpad = this.textures.exists('dpad');
        const hasCustomFireButton = this.textures.exists('fire_button');
        const hasCustomMuteButton = this.textures.exists('mute_button');
        
        // Create D-pad for movement
        if (hasCustomDpad) {
            this.dpad = this.add.image(100, this.cameras.main.height - 100, 'dpad')
                .setInteractive()
                .setScale(0.8)
                .setAlpha(0.9);
        } else {
            // Fallback - create a simple circle
            this.dpad = this.add.circle(100, this.cameras.main.height - 100, 50, 0x333333, 0.7)
                .setStrokeStyle(2, 0xffffff);
            
            // Add directional arrows
            this.add.triangle(100 - 30, this.cameras.main.height - 100, 0, 10, 20, 0, 0, -10, 0xffffff).setAngle(-90);
            this.add.triangle(100 + 30, this.cameras.main.height - 100, 0, 10, 20, 0, 0, -10, 0xffffff).setAngle(90);
        }
        
        // Define the hit zones for each direction
        const dpadRadius = 50;
        const dpadCenterX = 100;
        const dpadCenterY = this.cameras.main.height - 100;
        
        // Left zone
        this.leftZone = this.add.zone(dpadCenterX - dpadRadius/2, dpadCenterY, dpadRadius, dpadRadius)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => { this.mobileControls.left = true; })
            .on('pointerup', () => { this.mobileControls.left = false; })
            .on('pointerout', () => { this.mobileControls.left = false; });
        
        // Right zone
        this.rightZone = this.add.zone(dpadCenterX + dpadRadius/2, dpadCenterY, dpadRadius, dpadRadius)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => { this.mobileControls.right = true; })
            .on('pointerup', () => { this.mobileControls.right = false; })
            .on('pointerout', () => { this.mobileControls.right = false; });
        
        // Up zone - only needed if we add vertical movement in the future
        this.upZone = this.add.zone(dpadCenterX, dpadCenterY - dpadRadius/2, dpadRadius, dpadRadius)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => { this.mobileControls.up = true; })
            .on('pointerup', () => { this.mobileControls.up = false; })
            .on('pointerout', () => { this.mobileControls.up = false; });
        
        // Down zone - only needed if we add vertical movement in the future
        this.downZone = this.add.zone(dpadCenterX, dpadCenterY + dpadRadius/2, dpadRadius, dpadRadius)
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', () => { this.mobileControls.down = true; })
            .on('pointerup', () => { this.mobileControls.down = false; })
            .on('pointerout', () => { this.mobileControls.down = false; });
        
        // Create fire button
        if (hasCustomFireButton) {
            this.fireButton = this.add.image(this.cameras.main.width - 80, this.cameras.main.height - 100, 'fire_button')
                .setInteractive()
                .setScale(0.8)
                .setAlpha(0.9)
                .on('pointerdown', () => { this.mobileControls.fire = true; })
                .on('pointerup', () => { this.mobileControls.fire = false; })
                .on('pointerout', () => { this.mobileControls.fire = false; });
        } else {
            // Fallback - create a simple circle
            this.fireButton = this.add.circle(this.cameras.main.width - 80, this.cameras.main.height - 100, 40, 0xff0000, 0.7)
                .setInteractive()
                .setStrokeStyle(2, 0xffffff)
                .on('pointerdown', () => { this.mobileControls.fire = true; })
                .on('pointerup', () => { this.mobileControls.fire = false; })
                .on('pointerout', () => { this.mobileControls.fire = false; });
                
            // Add "FIRE" text
            this.add.text(this.cameras.main.width - 80, this.cameras.main.height - 100, 'FIRE', {
                font: '16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        }
        
        // Create mute button
        if (hasCustomMuteButton) {
            this.muteButton = this.add.image(this.cameras.main.width - 40, 40, 'mute_button')
                .setInteractive()
                .setScale(0.7)
                .on('pointerdown', () => this.toggleMute());
        } else {
            // Fallback - create a simple circle
            this.muteButton = this.add.circle(this.cameras.main.width - 40, 40, 20, 0x333333, 0.7)
                .setInteractive()
                .setStrokeStyle(2, 0xffffff)
                .on('pointerdown', () => this.toggleMute());
                
            // Add mute icon text
            this.muteText = this.add.text(this.cameras.main.width - 40, 40, GAME.isMuted ? '🔇' : '🔊', {
                font: '16px Arial',
                fill: '#ffffff'
            }).setOrigin(0.5);
        }
        
        // Initialize mobile control states
        this.mobileControls = {
            up: false,
            down: false,
            left: false,
            right: false,
            fire: false
        };
    }
    
    toggleMute() {
        GAME.isMuted = !GAME.isMuted;
        
        // Update mute button visuals if using fallback
        if (this.muteText) {
            this.muteText.setText(GAME.isMuted ? '🔇' : '🔊');
        }
        
        // Update audio state
        if (GAME.isMuted) {
            if (this.bgMusic) this.bgMusic.pause();
        } else {
            if (this.bgMusic) this.bgMusic.resume();
        }
    }
    
    handlePlayerInput(time, delta) {
        // Reset movement
        this.player.setVelocity(0);
        
        const moveSpeed = this.powerups.speed.active ? 300 : 200;
        
        // Handle keyboard input
        if (this.cursors.left.isDown || this.wasd.left.isDown || (GAME.isMobile && this.mobileControls.left)) {
            this.player.setVelocityX(-moveSpeed);
        } else if (this.cursors.right.isDown || this.wasd.right.isDown || (GAME.isMobile && this.mobileControls.right)) {
            this.player.setVelocityX(moveSpeed);
        }
        
        // Handle shooting
        if ((this.spaceKey.isDown || (GAME.isMobile && this.mobileControls.fire)) && 
            time > this.playerFireTimer) {
            this.playerFire();
            this.playerFireTimer = time + this.playerFireDelay;
        }
    }
    
    playerFire() {
        // Create bullet(s) based on power-up status
        if (this.powerups.doubleShot.active) {
            new Bullet(this, this.player.x - 10, this.player.y - 20, 'player_bullet', 'up', 300);
            new Bullet(this, this.player.x + 10, this.player.y - 20, 'player_bullet', 'up', 300);
        } else {
            new Bullet(this, this.player.x, this.player.y - 20, 'player_bullet', 'up', 300);
        }
        
        // Play shooting sound - safely
        this.playSound('player_shoot', 0.5);
    }
    
    bulletHitEnemy(bullet, enemy) {
        bullet.destroy();
        
        enemy.damage(1);
        
        if (enemy.health <= 0) {
            // Update score based on enemy type
            let points = 0;
            
            switch (enemy.type) {
                case 'basic':
                    points = GAME.scoreValues.basicEnemy;
                    break;
                case 'fast':
                    points = GAME.scoreValues.fastEnemy;
                    break;
                case 'boss':
                    points = GAME.scoreValues.bossEnemy;
                    
                    // Boss has a chance to drop a power-up
                    if (Phaser.Math.Between(1, 100) <= 75) {
                        this.spawnPowerup(enemy.x, enemy.y);
                    }
                    break;
            }
            
            // Add points to score
            this.score += points;
            this.uiManager.updateScore(this.score);
            
            // Check if high score is beaten
            if (this.score > GAME.highScore) {
                GAME.highScore = this.score;
            }
            
            // Play explosion sound
            this.playSound('explosion', 0.6);
            
            // Create explosion animation at enemy position
            const explosion = this.add.sprite(enemy.x, enemy.y, 'explosion');
            explosion.setScale(0.5); // Reduced scale for better proportions
            explosion.setOrigin(0.5, 0.5); // Center the explosion
            explosion.play('explode');
            explosion.once('animationcomplete', () => {
                explosion.destroy();
            });
            
            // Destroy the enemy
            enemy.destroy();
        }
    }
    
    bulletHitPlayer(bullet, player) {
        // Destroy the bullet
        bullet.destroy();
        
        // If player has shield, ignore damage
        if (this.powerups.shield.active) {
            return;
        }
        
        // Decrease player health
        this.playerHealth -= 20;
        this.updateHealthBar();
        
        // Check if player is dead
        if (this.playerHealth <= 0) {
            this.playerDie();
        }
    }
    
    playerHitEnemy(player, enemy) {
        // If player has shield, ignore collision
        if (this.powerups.shield.active) {
            return;
        }
        
        // Player loses a life immediately
        this.playerDie();
    }
    
    playerDie() {
        // Play explosion sound
        this.playSound('explosion', 0.7);
        
        // Create explosion animation at player position
        const explosion = this.add.sprite(this.player.x, this.player.y, 'explosion');
        explosion.setScale(0.6); // Slightly larger for player but not too large
        explosion.setOrigin(0.5, 0.5); // Center the explosion
        explosion.play('explode');
        explosion.once('animationcomplete', () => {
            explosion.destroy();
        });
        
        // Hide the player sprite
        this.player.setActive(false).setVisible(false);
        
        // Decrease lives
        this.playerLives--;
        this.updateLivesDisplay();
        
        // Check if game over
        if (this.playerLives <= 0) {
            this.gameOver();
        } else {
            // Respawn player after a delay
            this.time.delayedCall(1500, this.respawnPlayer, [], this);
        }
    }

respawnPlayer() {
        // Reset player health
        this.playerHealth = 100;
        this.updateHealthBar();
        
        // Reset player position
        this.player.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 50);
        this.player.setActive(true).setVisible(true);
        
        // Give temporary invulnerability
        this.player.setAlpha(0.5);
        this.time.delayedCall(2000, () => {
            this.player.setAlpha(1);
        }, [], this);
    }
    
    updateHealthBar() {
        // Use UIManager to update health bar
        this.uiManager.updateHealthBar(this.playerHealth);
    }
    
    updateLivesDisplay() {
        // Use UIManager to update lives display
        this.uiManager.updateLives(this.playerLives);
    }
    
    spawnPowerup(x, y) {
        // Choose random power-up type
        const powerupTypes = ['shield', 'doubleShot', 'speed'];
        const type = powerupTypes[Phaser.Math.Between(0, 2)];
        
        // Create power-up sprite
        const powerup = this.physics.add.sprite(x, y, 'powerup_' + type);
        powerup.powerupType = type;
        
        // Add to powerup group
        this.powerupItems.add(powerup);
        
        // Add downward velocity
        powerup.setVelocityY(100);
        
        // Auto-destroy if not collected after 10 seconds
        this.time.delayedCall(10000, () => {
            if (powerup.active) {
                powerup.destroy();
            }
        }, [], this);
    }
    
    collectPowerup(player, powerup) {
        // Add points
        this.score += GAME.scoreValues.powerUp;
        this.uiManager.updateScore(this.score);
        
        // Play pickup sound
        this.playSound('powerup_pickup', 0.7);
        
        // Apply power-up effect
        this.activatePowerup(powerup.powerupType);
        
        // Destroy the power-up sprite
        powerup.destroy();
    }
    
    activatePowerup(type) {
        // Clear existing timeout if active
        if (this.powerups[type].timer) {
            this.time.removeEvent(this.powerups[type].timer);
        }
        
        // Activate the power-up
        this.powerups[type].active = true;
        
        // Set player visual effects based on power-up type
        switch (type) {
            case 'shield':
                this.player.setTint(0x00ffff);
                break;
            case 'doubleShot':
                this.player.setTint(0xff00ff);
                break;
            case 'speed':
                this.player.setTint(0xffff00);
                break;
        }
        
        // Show power-up text (floating notification)
        const powerupText = this.add.text(
            this.cameras.main.width / 2,
            100,
            type.toUpperCase() + ' ACTIVATED!',
            {
                font: '24px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        // Fade out and remove the text
        this.tweens.add({
            targets: powerupText,
            alpha: 0,
            duration: 2000,
            onComplete: () => powerupText.destroy()
        });
        
        // Show power-up indicator in UI
        this.uiManager.showPowerUp(type, 10000);
        
        // Set a timer to deactivate the power-up after 10 seconds
        this.powerups[type].timer = this.time.delayedCall(10000, () => {
            this.powerups[type].active = false;
            this.powerups[type].timer = null;
            
            // Reset player tint
            if (!this.powerups.shield.active && 
                !this.powerups.doubleShot.active && 
                !this.powerups.speed.active) {
                this.player.clearTint();
            }
        }, [], this);
    }
    
    startLevel(level) {
        // Update level text
        this.levelText.setText('LEVEL: ' + level);
        
        // Create enemies for this level
        this.enemyManager.createWave(level);
        
        // Show level start text
        const levelText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'LEVEL ' + level,
            {
                font: '48px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Fade out and remove the text
        this.tweens.add({
            targets: levelText,
            alpha: 0,
            duration: 2000,
            onComplete: () => levelText.destroy()
        });
    }
    
triggerKillScreen() {
        this.isKillScreen = true;
        
        // Play glitch sound
        this.playSound('game_over', 0.5);
        
        // Scramble the graphics
        this.cameras.main.shake(2000, 0.01);
        this.cameras.main.flash(100, 255, 255, 255, true);
        
        // Flicker the sprites
        this.enemyManager.enemies.getChildren().forEach(enemy => {
            this.tweens.add({
                targets: enemy,
                alpha: { from: 1, to: 0 },
                duration: 100,
                repeat: -1,
                yoyo: true
            });
        });
        
        // Show kill screen text
        const killScreenText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 50,
            'LEVEL 256 - KILL SCREEN',
            {
                font: '40px Arial',
                fill: '#ff0000',
                stroke: '#ffffff',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        const hintText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 20,
            'SECRET CODE TO CONTINUE...',
            {
                font: '24px Arial',
                fill: '#ffffff'
            }
        ).setOrigin(0.5);
        
        // Create a timer for the kill screen bypass
        this.killScreenTimer = this.time.delayedCall(10000, () => {
            // If the player hasn't entered the code, game over
            if (this.isKillScreen) {
                this.gameOver();
            }
        }, [], this);
    }
    
    checkKillScreenCode(event) {
        if (!this.isKillScreen) return;
        
        // Map the key to our code format
        let keyPressed;
        
        switch (event.keyCode) {
            case Phaser.Input.Keyboard.KeyCodes.UP:
            case Phaser.Input.Keyboard.KeyCodes.W:
                keyPressed = 'up';
                break;
            case Phaser.Input.Keyboard.KeyCodes.DOWN:
            case Phaser.Input.Keyboard.KeyCodes.S:
                keyPressed = 'down';
                break;
            case Phaser.Input.Keyboard.KeyCodes.LEFT:
            case Phaser.Input.Keyboard.KeyCodes.A:
                keyPressed = 'left';
                break;
            case Phaser.Input.Keyboard.KeyCodes.RIGHT:
            case Phaser.Input.Keyboard.KeyCodes.D:
                keyPressed = 'right';
                break;
            case Phaser.Input.Keyboard.KeyCodes.ENTER:
                keyPressed = 'enter';
                break;
            default:
                return;
        }
        
        // Check if the key matches the next key in the sequence
        if (keyPressed === GAME.killScreenCode[GAME.currentCodeIndex]) {
            GAME.currentCodeIndex++;
            
            // Flash the screen to indicate correct input
            this.cameras.main.flash(50, 0, 255, 255, true);
            
            // If the entire code has been entered
            if (GAME.currentCodeIndex === GAME.killScreenCode.length) {
                this.killScreenBypass();
            }
        } else {
            // Reset the code index if wrong key is pressed
            GAME.currentCodeIndex = 0;
            
            // Flash red to indicate wrong input
            this.cameras.main.flash(50, 255, 0, 0, true);
        }
    }
    
    killScreenBypass() {
        // Cancel the kill screen timer
        if (this.killScreenTimer) {
            this.killScreenTimer.remove();
        }
        
        // Reset the kill screen state
        this.isKillScreen = false;
        
        // Stop any tweens on enemies
        this.tweens.killAll();
        
        // Add bonus points
        const bonusPoints = 10000;
        this.score += bonusPoints;
        this.uiManager.updateScore(this.score);
        
        // Update high score
        if (this.score > GAME.highScore) {
            GAME.highScore = this.score;
        }
        
        // Show success message
        const successText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'You have transcended the arcade!\nThe game resets, but your legend continues...',
            {
                font: '28px Arial',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 4,
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Fade out and reset game
        this.time.delayedCall(5000, () => {
            // Reset to level 1 with increased difficulty
            GAME.level = 1;
            
            // Restart the game scene
            this.scene.restart();
        }, [], this);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            // Pause the physics
            this.physics.pause();
            
            // Show pause menu
            this.pauseBackground.setVisible(true);
            this.pauseText.setVisible(true);
            this.resumeButton.setVisible(true);
            this.quitButton.setVisible(true);
        } else {
            // Resume the physics
            this.physics.resume();
            
            // Hide pause menu
            this.pauseBackground.setVisible(false);
            this.pauseText.setVisible(false);
            this.resumeButton.setVisible(false);
            this.quitButton.setVisible(false);
        }
    }
    
    gameOver() {
        this.isGameOver = true;
        
        // Play game over sound
        this.playSound('game_over', 0.7);
        
        // Store final score
        GAME.score = this.score;
        
        // Transition to game over scene after a delay
        this.time.delayedCall(2000, () => {
            // Stop music
            if (this.bgMusic) {
                try {
                    this.bgMusic.stop();
                } catch (err) {
                    console.warn("Error stopping music:", err);
                }
            }
            
            // Reset level before going to game over screen
            GAME.level = 1;
            this.scene.start('GameOverScene');
        }, [], this);
    }
    
    // Utility method to safely play sounds
    playSound(key, volume = 0.5) {
        try {
            if (!GAME.isMuted && this.cache.audio.exists(key)) {
                this.sound.play(key, { volume: volume });
            }
        } catch (err) {
            console.warn(`Could not play ${key} sound:`, err);
        }
    }
    
    // Method to safely initialize background music
    safelyInitBackgroundMusic() {
        try {
            if (this.cache.audio.exists('bg_music')) {
                this.bgMusic = this.sound.add('bg_music', {
                    volume: 0.4,
                    loop: true
                });
                
                if (!GAME.isMuted) {
                    // Don't use promise/catch as Phaser's sound.play() doesn't return a promise
                    this.bgMusic.play();
                }
            } else {
                console.warn("Background music not found in cache");
            }
        } catch (err) {
            console.error("Error initializing background music:", err);
        }
    }
    
    // Resize method to handle different screen resolutions
    resize(gameSize) {
        // Update the UI manager
        if (this.uiManager) {
            this.uiManager.resize(gameSize.width, gameSize.height);
        }
        
        // Update level text position
        if (this.levelText) {
            this.levelText.setPosition(gameSize.width - 20, 60);
        }
        
        // Update pause menu
        if (this.pauseBackground) {
            this.pauseBackground.setPosition(gameSize.width / 2, gameSize.height / 2);
            this.pauseBackground.setSize(gameSize.width, gameSize.height);
        }
        
        if (this.pauseText) {
            this.pauseText.setPosition(gameSize.width / 2, gameSize.height / 2 - 50);
        }
        
        if (this.resumeButton) {
            this.resumeButton.setPosition(gameSize.width / 2, gameSize.height / 2 + 20);
        }
        
        if (this.quitButton) {
            this.quitButton.setPosition(gameSize.width / 2, gameSize.height / 2 + 70);
        }
        
        // Update mobile controls if present
        if (GAME.isMobile) {
            // Update D-pad position
            if (this.dpad) {
                this.dpad.setPosition(100, gameSize.height - 100);
                
                // Update hit zones
                const dpadRadius = 50;
                const dpadCenterX = 100;
                const dpadCenterY = gameSize.height - 100;
                
                // We need to recreate the zones since they don't have a setPosition method
                if (this.leftZone) this.leftZone.destroy();
                if (this.rightZone) this.rightZone.destroy();
                if (this.upZone) this.upZone.destroy();
                if (this.downZone) this.downZone.destroy();
                
                this.leftZone = this.add.zone(dpadCenterX - dpadRadius/2, dpadCenterY, dpadRadius, dpadRadius)
                    .setOrigin(0.5)
                    .setInteractive()
                    .on('pointerdown', () => { this.mobileControls.left = true; })
                    .on('pointerup', () => { this.mobileControls.left = false; })
                    .on('pointerout', () => { this.mobileControls.left = false; });
                
                this.rightZone = this.add.zone(dpadCenterX + dpadRadius/2, dpadCenterY, dpadRadius, dpadRadius)
                    .setOrigin(0.5)
                    .setInteractive()
                    .on('pointerdown', () => { this.mobileControls.right = true; })
                    .on('pointerup', () => { this.mobileControls.right = false; })
                    .on('pointerout', () => { this.mobileControls.right = false; });
                
                this.upZone = this.add.zone(dpadCenterX, dpadCenterY - dpadRadius/2, dpadRadius, dpadRadius)
                    .setOrigin(0.5)
                    .setInteractive()
                    .on('pointerdown', () => { this.mobileControls.up = true; })
                    .on('pointerup', () => { this.mobileControls.up = false; })
                    .on('pointerout', () => { this.mobileControls.up = false; });
                
                this.downZone = this.add.zone(dpadCenterX, dpadCenterY + dpadRadius/2, dpadRadius, dpadRadius)
                    .setOrigin(0.5)
                    .setInteractive()
                    .on('pointerdown', () => { this.mobileControls.down = true; })
                    .on('pointerup', () => { this.mobileControls.down = false; })
                    .on('pointerout', () => { this.mobileControls.down = false; });
            }
            
            // Update fire button position
            if (this.fireButton) {
                this.fireButton.setPosition(gameSize.width - 80, gameSize.height - 100);
            }
            
            // Update mute button position
            if (this.muteButton) {
                this.muteButton.setPosition(gameSize.width - 40, 40);
                
                // Update mute text if using fallback
                if (this.muteText) {
                    this.muteText.setPosition(gameSize.width - 40, 40);
                }
            }
        }
    }
}