class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init() {
        // Initialize game state variables
        this.playerHealth = 100;
        this.playerLives = GAME.lives;
        this.score = 0;
        
        // Ensure level synchronization
        this.level = GAME.level;
        console.log("GameScene.init: Setting this.level to GAME.level:", this.level);
        
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
        console.log("GameScene.create: Initializing game scene");
        
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
        
        // Set up collision detection with direct collision processing
        // Player bullets hitting enemies
        this.physics.add.collider(this.playerBullets, this.enemyManager.enemies, (bullet, enemy) => {
            console.log("COLLISION: Player bullet hit enemy!");
            this.bulletHitEnemy(bullet, enemy);
        }, null, this);
        
        // Enemy bullets hitting player
        this.physics.add.collider(this.enemyBullets, this.player, (bullet, player) => {
            console.log("COLLISION: Enemy bullet hit player!");
            this.bulletHitPlayer(bullet, player);
        }, null, this);
        
        // Player hitting enemies
        this.physics.add.collider(this.player, this.enemyManager.enemies, (player, enemy) => {
            console.log("COLLISION: Player hit enemy!");
            this.playerHitEnemy(player, enemy);
        }, null, this);
        
        // Player collecting powerups
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
        
        // Level adjustment keys
        this.plusKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PLUS);
        this.equalsKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EQUALS); // For + without shift
        this.minusKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.MINUS); // Alternative key
        this.numPlusKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_ADD); // Numpad +
        this.asteriskKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT); // * (with shift)
        this.numAsteriskKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NUMPAD_MULTIPLY); // Numpad *
        
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
        
        // Add debug support
        this.addDebugInfo();
    }

    update(time, delta) {
        if (this.isPaused || this.isGameOver) return;
        
        // Update scrolling background
        this.background.tilePositionY -= 0.5;
        
        // Handle player input if player is alive
        if (this.player && this.player.active) {
            this.handlePlayerInput(time, delta);
        }
        
        // Update enemy manager
        this.enemyManager.update(time, delta);
        
        // Check if all enemies are destroyed and wave creation is complete
        if (this.enemyManager.enemies.countActive() === 0 && !this.isKillScreen && this.enemyManager.waveCreationComplete) {
            // Add a flag to prevent multiple level-up calls
            if (!this.isLevelingUp) {
                this.isLevelingUp = true;
                console.log("All enemies destroyed, wave creation complete. Advancing to next level.");
                
                console.log(`Level ${this.level} completed. Advancing to level ${this.level + 1}`);
                
                this.time.delayedCall(2000, () => {
                    // Increment level by exactly 1
                    this.level += 1;
                    // Update global level to match local level
                    GAME.level = this.level;
                    
                    console.log(`Level incremented to ${this.level}, GAME.level = ${GAME.level}`);
                    console.log(`Starting level ${this.level}`);
                    
                    if (this.level === 256) {
                        this.triggerKillScreen();
                    } else {
                        // Explicitly pass the current level to startLevel
                        this.startLevel(this.level);
                    }
                    
                    // Reset the flag after level has started
                    this.isLevelingUp = false;
                });
            }
        }
        
        // Check for pause key press
        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.togglePause();
        }
        
        // Check for level increase keys
        if (Phaser.Input.Keyboard.JustDown(this.plusKey) || 
            Phaser.Input.Keyboard.JustDown(this.equalsKey) || 
            Phaser.Input.Keyboard.JustDown(this.minusKey) || 
            Phaser.Input.Keyboard.JustDown(this.numPlusKey)) {
            console.log("Level increase key detected (+)");
            this.increaseLevel(1);
        }
        
        // Check for asterisk key (shift+8) or numpad *
        if ((Phaser.Input.Keyboard.JustDown(this.asteriskKey) && this.input.keyboard.isDown(Phaser.Input.Keyboard.KeyCodes.SHIFT)) || 
            Phaser.Input.Keyboard.JustDown(this.numAsteriskKey)) {
            console.log("Level increase key detected (*)");
            this.increaseLevel(5);
        }
        
        // Update debug info if enabled
        if (this.debugMode && this.debugText) {
            this.updateDebugInfo();
        }
    }
    
    handlePlayerInput(time, delta) {
        // Make sure player and physics body exist
        if (!this.player || !this.player.body) {
            console.error("Player or player physics body is undefined");
            return;
        }
        
        // Reset movement
        this.player.body.setVelocity(0);
        
        const moveSpeed = this.powerups.speed.active ? 300 : 200;
        
        // Debug keyboard state
        const keyboardState = {
            cursors: {
                left: this.cursors.left.isDown,
                right: this.cursors.right.isDown,
                up: this.cursors.up.isDown,
                down: this.cursors.down.isDown
            },
            wasd: {
                left: this.wasd.left.isDown,
                right: this.wasd.right.isDown,
                up: this.wasd.up.isDown,
                down: this.wasd.down.isDown
            },
            space: this.spaceKey.isDown,
            mobile: GAME.isMobile ? {
                left: this.mobileControls?.left,
                right: this.mobileControls?.right,
                up: this.mobileControls?.up,
                down: this.mobileControls?.down,
                fire: this.mobileControls?.fire
            } : null
        };
        
        // Log keyboard state every 60 frames (about once per second)
        if (this.debugMode && this.game.loop.frame % 60 === 0) {
            console.log("Keyboard state:", keyboardState);
        }
        
        // Handle horizontal movement
        if (this.cursors.left.isDown || this.wasd.left.isDown || (GAME.isMobile && this.mobileControls?.left)) {
            this.player.body.setVelocityX(-moveSpeed);
        } else if (this.cursors.right.isDown || this.wasd.right.isDown || (GAME.isMobile && this.mobileControls?.right)) {
            this.player.body.setVelocityX(moveSpeed);
        }
        
        // Handle vertical movement - limited to bottom third of screen
        const bottomThird = this.cameras.main.height * 2/3;
        if ((this.cursors.up.isDown || this.wasd.up.isDown || (GAME.isMobile && this.mobileControls?.up)) && 
            this.player.y > bottomThird) {
            this.player.body.setVelocityY(-moveSpeed);
        } else if ((this.cursors.down.isDown || this.wasd.down.isDown || (GAME.isMobile && this.mobileControls?.down)) && 
                  this.player.y < this.cameras.main.height - 50) {
            this.player.body.setVelocityY(moveSpeed);
        }
        
        // Handle shooting
        if ((this.spaceKey.isDown || (GAME.isMobile && this.mobileControls?.fire)) && 
            time > this.playerFireTimer) {
            this.playerFire();
            this.playerFireTimer = time + this.playerFireDelay;
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
            
        // Add level controls info
        this.levelControlsText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 120,
            'LEVEL CONTROLS:\n+ : Increase level by 1\nSHIFT+8(*) : Increase level by 5',
            {
                font: '18px Arial',
                fill: '#aaaaaa',
                align: 'center'
            }
        ).setOrigin(0.5);
        
        // Hide pause menu elements initially
        this.pauseText.setVisible(false);
        this.resumeButton.setVisible(false);
        this.quitButton.setVisible(false);
        this.levelControlsText.setVisible(false);
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
        
        // Create level increase buttons
        // Level +1 button
        this.levelUpButton = this.add.circle(this.cameras.main.width - 40, 80, 20, 0x00aa00, 0.7)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff)
            .on('pointerdown', () => this.increaseLevel(1));
            
        // Add +1 text
        this.levelUpButton.textObject = this.add.text(this.cameras.main.width - 40, 80, '+1', {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
        // Level +5 button
        this.levelUpFiveButton = this.add.circle(this.cameras.main.width - 40, 120, 20, 0x00aa00, 0.7)
            .setInteractive()
            .setStrokeStyle(2, 0xffffff)
            .on('pointerdown', () => this.increaseLevel(5));
            
        // Add +5 text
        this.levelUpFiveButton.textObject = this.add.text(this.cameras.main.width - 40, 120, '+5', {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);
        
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
    
    playerFire() {
        // Find the closest enemy to target
        let closestEnemy = this.findClosestEnemy();
        
    // Calculate bullet spawn position - closer to the player for better close-range combat
    const playerHeight = this.player.displayHeight;
    const bulletOffsetY = playerHeight * 0.8; // Reduced from 2x to 0.8x for closer bullet spawning
        
        // Create bullet(s) based on power-up status
        if (this.powerups.doubleShot.active) {
            if (closestEnemy) {
                // Target-based bullets
                new Bullet(this, this.player.x - 10, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300, 0, closestEnemy.x, closestEnemy.y);
                new Bullet(this, this.player.x + 10, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300, 0, closestEnemy.x, closestEnemy.y);
            } else {
                // No enemy to target, shoot straight up
                new Bullet(this, this.player.x - 10, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300);
                new Bullet(this, this.player.x + 10, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300);
            }
        } else {
            if (closestEnemy) {
                // Target-based bullet
                new Bullet(this, this.player.x, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300, 0, closestEnemy.x, closestEnemy.y);
            } else {
                // No enemy to target, shoot straight up
                new Bullet(this, this.player.x, this.player.y - bulletOffsetY, 'player_bullet', 'up', 300);
            }
        }
        
        // Play shooting sound - safely
        this.playSound('player_shoot', 0.5);
    }
    
    /**
     * Find the closest active enemy to the player
     * @returns {Phaser.GameObjects.GameObject|null} The closest enemy or null if none found
     */
    findClosestEnemy() {
        if (!this.enemyManager || !this.enemyManager.enemies) {
            return null;
        }
        
        const activeEnemies = this.enemyManager.enemies.getChildren().filter(enemy => enemy.active);
        
        if (activeEnemies.length === 0) {
            return null;
        }
        
        // Find the closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        activeEnemies.forEach(enemy => {
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                enemy.x, enemy.y
            );
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });
        
        return closestEnemy;
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
            const explosion = this.add.sprite(enemy.x, enemy.y, 'explosion_spritesheet_2');
            explosion.setScale(1.0); // No scaling needed for the new spritesheet
            explosion.setOrigin(0.5, 0.5); // Center the explosion
            explosion.play('explode2');
            explosion.once('animationcomplete', () => {
                explosion.destroy();
            });
            
            // Destroy the enemy
            enemy.destroy();
        }
    }
    
    bulletHitPlayer(bullet, player) {
        console.log("bulletHitPlayer called - bullet:", bullet, "player:", player);
        
        // Ensure correct parameter order - bullet should be a Bullet and player should be the Player
        let actualBullet, actualPlayer;
        
        if (bullet.constructor.name === 'Player') {
            // Parameters are swapped
            actualBullet = player;
            actualPlayer = bullet;
        } else {
            // Parameters are in correct order
            actualBullet = bullet;
            actualPlayer = player;
        }
        
        // Destroy the bullet
        actualBullet.destroy();
        
        // If player has shield or is invulnerable, ignore damage
        if (this.powerups.shield.active || actualPlayer.invulnerable) {
            console.log("Player has shield or is invulnerable - ignoring damage");
            return;
        }
        
        // Decrease player health
        this.playerHealth -= 20;
        console.log(`Player health decreased to ${this.playerHealth}`);
        this.updateHealthBar();
        
        // Check if player is dead
        if (this.playerHealth <= 0) {
            console.log("Player health <= 0, calling playerDie()");
            this.playerDie();
        }
    }
    
    playerHitEnemy(player, enemy) {
        // If player has shield or is invulnerable, ignore collision
        if (this.powerups.shield.active || player.invulnerable) {
            return;
        }
        
        // Player loses a life immediately
        this.playerDie();
    }
    
    playerDie() {
        console.log("playerDie() called");
        
        // Play explosion sound
        this.playSound('explosion', 0.7);
        
        // Create explosion animation at player position
        const explosion = this.add.sprite(this.player.x, this.player.y, 'explosion_spritesheet_2');
        explosion.setScale(1.2); // Slightly larger for player but not too large
        explosion.setOrigin(0.5, 0.5); // Center the explosion
        explosion.play('explode2');
        explosion.once('animationcomplete', () => {
            explosion.destroy();
        });
        
        // Hide the player sprite
        this.player.setActive(false).setVisible(false);
        
        // Decrease lives
        this.playerLives--;
        console.log(`Player lives decreased to ${this.playerLives}`);
        this.updateLivesDisplay();
        
        // Check if game over
        if (this.playerLives <= 0) {
            console.log("Player lives <= 0, calling gameOver()");
            this.gameOver();
        } else {
            // Respawn player after a delay
            console.log("Scheduling player respawn");
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
        this.player.invulnerable = true;
        this.player.setAlpha(0.5);
        this.time.delayedCall(2000, () => {
            this.player.invulnerable = false;
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
    
    /**
     * Check if the player is entering the kill screen code (Konami code)
     * @param {Phaser.Input.Keyboard.KeyboardEvent} event - The keyboard event
     */
    checkKillScreenCode(event) {
        // Get the expected next key in the sequence
        const expectedKey = GAME.killScreenCode[GAME.currentCodeIndex];
        let keyPressed = '';
        
        // Convert the key event to our expected format
        switch(event.keyCode) {
            case Phaser.Input.Keyboard.KeyCodes.UP:
                keyPressed = 'up';
                break;
            case Phaser.Input.Keyboard.KeyCodes.DOWN:
                keyPressed = 'down';
                break;
            case Phaser.Input.Keyboard.KeyCodes.LEFT:
                keyPressed = 'left';
                break;
            case Phaser.Input.Keyboard.KeyCodes.RIGHT:
                keyPressed = 'right';
                break;
            case Phaser.Input.Keyboard.KeyCodes.ENTER:
                keyPressed = 'enter';
                break;
        }
        
        // Check if the pressed key matches the expected key
        if (keyPressed === expectedKey) {
            // Increment the index to check the next key in the sequence
            GAME.currentCodeIndex++;
            
            // If the entire sequence is entered correctly
            if (GAME.currentCodeIndex >= GAME.killScreenCode.length) {
                console.log("Kill screen code entered correctly!");
                this.triggerKillScreen();
                // Reset the index for future attempts
                GAME.currentCodeIndex = 0;
            }
        } else {
            // Reset the index if the wrong key is pressed
            GAME.currentCodeIndex = 0;
        }
    }
    
    /**
     * Trigger the kill screen (level 256 glitch)
     */
    triggerKillScreen() {
        if (this.isKillScreen) return; // Prevent multiple triggers
        
        console.log("Triggering kill screen!");
        this.isKillScreen = true;
        
        // Play game over sound
        this.playSound('game_over', 0.7);
        
        // Create a visual glitch effect
        this.cameras.main.shake(2000, 0.01);
        this.cameras.main.flash(1000, 255, 0, 0);
        
        // Clear all enemies
        this.enemyManager.enemies.clear(true, true);
        
        // Display "KILL SCREEN" text
        const killScreenText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'KILL SCREEN',
            {
                font: '64px Arial',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Make the text flicker
        this.killScreenTimer = this.time.addEvent({
            delay: 200,
            callback: () => {
                killScreenText.visible = !killScreenText.visible;
            },
            loop: true
        });
        
        // Return to menu after a delay
        this.time.delayedCall(5000, () => {
            // Reset game state
            GAME.level = 1;
            this.scene.start('MenuScene');
        });
    }
    
    /**
     * Safely play a sound with error handling
     * @param {string} key - The sound key
     * @param {number} volume - The volume (0-1)
     */
    playSound(key, volume = 1.0) {
        try {
            // Don't play sounds if muted
            if (GAME.isMuted) return;
            
            // Try to play the sound directly without checking if it exists first
            // This will work with the silent fallbacks created in BootScene
            this.sound.play(key, { volume: volume });
        } catch (error) {
            console.error(`Error playing sound '${key}':`, error);
        }
    }
    
    /**
     * Safely initialize background music with error handling
     */
    safelyInitBackgroundMusic() {
        try {
            // Check if music already exists
            if (this.bgMusic) return;
            
            // Create background music if it exists in the cache
            if (this.sound.get('bg_music')) {
                this.bgMusic = this.sound.add('bg_music', {
                    volume: 0.3,
                    loop: true
                });
                
                // Start playing if not muted
                if (!GAME.isMuted) {
                    this.bgMusic.play();
                }
            } else {
                console.warn("Background music 'bg_music' not found");
            }
        } catch (error) {
            console.error("Error initializing background music:", error);
        }
    }
    
    /**
     * Handle window resize
     * @param {Phaser.Scale.ScaleManager} gameSize - The new game size
     */
    resize(gameSize) {
        // Update camera
        this.cameras.resize(gameSize.width, gameSize.height);
        
        // Update background
        if (this.background) {
            this.background.setSize(gameSize.width, gameSize.height);
        }
        
        // Update UI elements
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
        
        if (this.levelControlsText) {
            this.levelControlsText.setPosition(gameSize.width / 2, gameSize.height / 2 + 120);
        }
        
        // Update mobile controls if they exist
        if (GAME.isMobile && this.mobileControls) {
            this.createMobileControls(); // Recreate with new dimensions
        }
    }
    
    /**
     * Add debug information display
     */
    addDebugInfo() {
        // Check if debug mode is enabled
        this.debugMode = GAME.debug || false;
        
        if (this.debugMode) {
            console.log("Debug mode enabled");
            
            // Create debug text
            this.debugText = this.add.text(10, 10, 'DEBUG INFO', {
                font: '14px Courier',
                fill: '#00ff00',
                backgroundColor: '#000000'
            });
            
            // Update debug info immediately
            this.updateDebugInfo();
        }
    }
    
    /**
     * Update debug information display
     */
    updateDebugInfo() {
        if (!this.debugText) return;
        
        // Gather debug information
        const debugInfo = [
            `FPS: ${Math.round(this.game.loop.actualFps)}`,
            `Level: ${this.level}`,
            `Score: ${this.score}`,
            `Player Health: ${this.playerHealth}`,
            `Lives: ${this.playerLives}`,
            `Active Enemies: ${this.enemyManager.enemies.countActive()}`,
            `Player Bullets: ${this.playerBullets.countActive()}`,
            `Enemy Bullets: ${this.enemyBullets.countActive()}`,
            `PowerUps: ${this.powerupItems.countActive()}`,
            `Shield: ${this.powerups.shield.active ? 'ON' : 'OFF'}`,
            `Double Shot: ${this.powerups.doubleShot.active ? 'ON' : 'OFF'}`,
            `Speed Boost: ${this.powerups.speed.active ? 'ON' : 'OFF'}`
        ];
        
        // Update the debug text
        this.debugText.setText(debugInfo);
    }
    
    /**
     * Increase the level by a specified amount
     * @param {number} amount - The amount to increase the level by
     */
    increaseLevel(amount) {
        // Prevent level increase during level transition
        if (this.isLevelingUp) return;
        
        console.log(`Increasing level by ${amount}`);
        
        // Set the new level
        this.level += amount;
        GAME.level = this.level;
        
        console.log(`Level set to ${this.level}`);
        
        // Update level text
        this.levelText.setText('LEVEL: ' + this.level);
        
        // Check for kill screen
        if (this.level >= 256) {
            this.triggerKillScreen();
        } else {
            // Restart the current level with the new level value
            this.startLevel(this.level);
        }
    }
    
    /**
     * Start a new level
     * @param {number} level - The level to start
     */
    startLevel(level) {
        console.log(`Starting level ${level}`);
        
        // Clear any existing enemies and bullets
        this.enemyManager.enemies.clear(true, true);
        this.playerBullets.clear(true, true);
        this.enemyBullets.clear(true, true);
        this.powerupItems.clear(true, true);
        
        // Update level text
        this.levelText.setText('LEVEL: ' + level);
        
        // Start the enemy wave for this level
        this.enemyManager.createWave(level);
    }
    
    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        // Pause/resume physics
        if (this.isPaused) {
            this.physics.pause();
        } else {
            this.physics.resume();
        }
        
        // Show/hide pause menu
        this.pauseBackground.setVisible(this.isPaused);
        this.pauseText.setVisible(this.isPaused);
        this.resumeButton.setVisible(this.isPaused);
        this.quitButton.setVisible(this.isPaused);
        this.levelControlsText.setVisible(this.isPaused);
    }
    
    /**
     * Game over handler
     */
    gameOver() {
        if (this.isGameOver) return; // Prevent multiple game over calls
        
        console.log("Game over!");
        this.isGameOver = true;
        
        // Play game over sound
        this.playSound('game_over', 0.7);
        
        // Stop all movement
        this.physics.pause();
        
        // Transition to game over scene after a delay
        this.time.delayedCall(2000, () => {
            this.scene.start('GameOverScene', { 
                score: this.score,
                level: this.level
            });
        });
    }
    
    /**
     * Spawn a random power-up at the specified position
     * @param {number} x - The x position
     * @param {number} y - The y position
     */
    spawnPowerup(x, y) {
        // Define power-up types
        const powerupTypes = ['shield', 'doubleShot', 'speed'];
        
        // Select a random power-up type
        const type = powerupTypes[Phaser.Math.Between(0, powerupTypes.length - 1)];
        
        // Create the power-up
        const powerup = new PowerUp(this, x, y, type);
        this.powerupItems.add(powerup);
    }
    
    /**
     * Handle power-up collection
     * @param {Player} player - The player
     * @param {PowerUp} powerup - The power-up
     */
    collectPowerup(player, powerup) {
        // Play power-up sound
        this.playSound('powerup_pickup', 0.6);
        
        // Apply power-up effect
        switch (powerup.type) {
            case 'shield':
                this.activatePowerup('shield', 10000); // 10 seconds
                break;
            case 'doubleShot':
                this.activatePowerup('doubleShot', 15000); // 15 seconds
                break;
            case 'speed':
                this.activatePowerup('speed', 12000); // 12 seconds
                break;
        }
        
        // Destroy the power-up
        powerup.destroy();
    }
    
    /**
     * Activate a power-up for a specified duration
     * @param {string} type - The power-up type
     * @param {number} duration - The duration in milliseconds
     */
    activatePowerup(type, duration) {
        console.log(`Activating ${type} power-up for ${duration}ms`);
        
        // Clear any existing timer
        if (this.powerups[type].timer) {
            this.powerups[type].timer.remove();
        }
        
        // Activate the power-up
        this.powerups[type].active = true;
        
        // Set a timer to deactivate the power-up
        this.powerups[type].timer = this.time.delayedCall(duration, () => {
            this.powerups[type].active = false;
            console.log(`${type} power-up expired`);
        });
    }
}
