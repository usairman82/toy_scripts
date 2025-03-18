class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type, health) {
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set appropriate scale based on enemy type
        this.setEnemyScale(type);
        
        // Set collision body size
        this.setSize(this.displayWidth * 0.8, this.displayHeight * 0.8);
        
        // Set enemy type and health
        this.type = type;
        this.health = health;
        
        // Set initial velocity based on type and level
        switch (type) {
            case 'basic':
                // Basic enemies move in formation (no velocity)
                this.setVelocity(0, 0);
                break;
            case 'fast':
                // Fast enemies move in zigzag pattern - but slower at first
                // Scale velocity based on level to prevent them from moving too fast at higher levels
                let fastHorizontalVelocity, fastVerticalVelocity;
                
                if (scene.level <= 5) {
                    // Very controlled movement in early levels
                    fastHorizontalVelocity = Phaser.Math.Between(-20, 20);
                    fastVerticalVelocity = Phaser.Math.Between(20, 40);
                } else if (scene.level <= 10) {
                    // Slightly faster but still controlled
                    fastHorizontalVelocity = Phaser.Math.Between(-30, 30);
                    fastVerticalVelocity = Phaser.Math.Between(30, 50);
                } else {
                    // Cap the maximum velocity for higher levels
                    fastHorizontalVelocity = Phaser.Math.Between(-40, 40);
                    fastVerticalVelocity = Phaser.Math.Between(30, 60);
                }
                
                this.setVelocity(fastHorizontalVelocity, fastVerticalVelocity);
                break;
            case 'boss':
                // Boss enemies move slower but also scale with level
                let bossHorizontalVelocity, bossVerticalVelocity;
                
                if (scene.level <= 10) {
                    bossHorizontalVelocity = Phaser.Math.Between(-15, 15);
                    bossVerticalVelocity = Phaser.Math.Between(10, 15);
                } else {
                    // Cap the maximum velocity for higher levels
                    bossHorizontalVelocity = Phaser.Math.Between(-25, 25);
                    bossVerticalVelocity = Phaser.Math.Between(15, 25);
                }
                
                this.setVelocity(bossHorizontalVelocity, bossVerticalVelocity);
                break;
        }
        
        // Initialize firing timer with a significant initial delay to prevent immediate firing
        // This ensures enemies don't fire right after spawning
        this.canFire = false;
        this.fireTimer = 0;
        this.fireDelay = this.getFireDelay();
        
        // Set initial firing delay based on enemy type and level
        // Significantly reduced initial delay to ensure enemies fire quickly
        const initialDelayMultiplier = Math.max(0.5, 1.5 - Math.floor(scene.level / 5));
        let initialDelay;
        
        switch (type) {
            case 'basic':
                initialDelay = 1000 * initialDelayMultiplier;
                break;
            case 'fast':
                initialDelay = 800 * initialDelayMultiplier;
                break;
            case 'boss':
                initialDelay = 600 * initialDelayMultiplier;
                break;
            default:
                initialDelay = 1000 * initialDelayMultiplier;
        }
        
        // Add small random offset to prevent all enemies of same type from firing simultaneously
        initialDelay += Phaser.Math.Between(0, 500);
        
        // Enable firing after the initial delay
        scene.time.delayedCall(initialDelay, () => {
            this.canFire = true;
            // Set the first actual fire time
            this.fireTimer = scene.time.now + this.fireDelay;
        });
        
        // Add to the enemy group in the scene
        scene.enemyManager.enemies.add(this);
    }
    
    /**
     * Set appropriate scale based on enemy type
     * @param {string} type - The enemy type
     */
    setEnemyScale(type) {
        switch (type) {
            case 'basic':
                this.setScale(0.05);
                break;
            case 'fast':
                this.setScale(0.045);
                break;
            case 'boss':
                this.setScale(0.09);
                break;
            default:
                this.setScale(0.05);
        }
    }
    
    getFireDelay() {
        // Different enemy types have different fire rates
        // Scale with game level to make early levels easier
        // Significantly reduced delays to ensure enemies fire frequently
        
        // Calculate level multiplier with a more gradual progression
        let levelMultiplier;
        
        if (this.scene.level <= 10) {
            // Much faster firing in first 10 levels compared to before
            levelMultiplier = 2.0 - (this.scene.level * 0.05); // 2.0 -> 1.5
        } else if (this.scene.level <= 50) {
            // Gradually decrease from levels 11-50
            levelMultiplier = 1.5 - ((this.scene.level - 10) * 0.01); // 1.5 -> 1.1
        } else if (this.scene.level <= 100) {
            // Continue decreasing from levels 51-100
            levelMultiplier = 1.1 - ((this.scene.level - 50) * 0.001); // 1.1 -> 1.05
        } else {
            // Minimal multiplier for higher levels
            levelMultiplier = Math.max(1.0, 1.05 - ((this.scene.level - 100) * 0.001)); // 1.05 -> 1.0 minimum
        }
        
        // Add a small random offset to each enemy's fire delay to prevent synchronized firing
        const randomOffset = Phaser.Math.Between(0, 800);
        
        // Base fire delays are much shorter for early levels
        let baseDelay;
        switch (this.type) {
            case 'basic':
                baseDelay = Phaser.Math.Between(1500, 2500);
                break;
            case 'fast':
                baseDelay = Phaser.Math.Between(1200, 2000);
                break;
            case 'boss':
                baseDelay = Phaser.Math.Between(1000, 1800);
                break;
            default:
                baseDelay = 2000;
        }
        
        return (baseDelay * levelMultiplier) + randomOffset;
    }
    
    damage(amount) {
        this.health -= amount;
        
        // Flash effect when damaged
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.5, to: 1 },
            duration: 100,
            yoyo: true
        });
    }
    
    update(time, delta) {
        const scene = this.scene;
        
        // Skip if not active or scene is paused
        if (!this.active || scene.isPaused) return;
        
        // Check if enemy can fire and if it's time to fire
        if (this.canFire && time > this.fireTimer) {
            this.fire();
            this.fireTimer = time + this.fireDelay;
        }
        
        // Get game boundaries
        const bounds = scene.physics.world.bounds;
        const gameWidth = scene.cameras.main.width;
        const gameHeight = scene.cameras.main.height;
        
        // Check if enemy is off-screen and handle accordingly
        this.checkBoundaries(bounds, gameWidth, gameHeight);
        
        // Update movement based on enemy type
        switch (this.type) {
            case 'basic':
                // Basic enemies follow their formation
                break;
                
            case 'fast':
                // Fast enemies change direction randomly but with controlled velocity
                if (Phaser.Math.Between(0, 100) < 2) {
                    // Scale velocity changes based on level
                    let maxVelocity;
                    
                    if (scene.level <= 5) {
                        maxVelocity = 60;
                    } else if (scene.level <= 10) {
                        maxVelocity = 80;
                    } else {
                        maxVelocity = 100;
                    }
                    
                    this.setVelocityX(Phaser.Math.Between(-maxVelocity, maxVelocity));
                    
                    // Ensure vertical velocity is also controlled
                    const currentVY = this.body.velocity.y;
                    if (currentVY < 20) {
                        this.setVelocityY(Phaser.Math.Between(20, 40));
                    } else if (currentVY > 80) {
                        this.setVelocityY(Phaser.Math.Between(40, 60));
                    }
                }
                
                // Bounce off walls (handled in checkBoundaries)
                break;
                
            case 'boss':
                // Boss movement pattern with controlled velocity
                if (Phaser.Math.Between(0, 100) < 1) {
                    // Scale velocity changes based on level
                    let maxHorizontalVelocity, maxVerticalVelocity;
                    
                    if (scene.level <= 10) {
                        maxHorizontalVelocity = 40;
                        maxVerticalVelocity = 30;
                    } else if (scene.level <= 20) {
                        maxHorizontalVelocity = 45;
                        maxVerticalVelocity = 35;
                    } else {
                        maxHorizontalVelocity = 50;
                        maxVerticalVelocity = 40;
                    }
                    
                    this.setVelocityX(Phaser.Math.Between(-maxHorizontalVelocity, maxHorizontalVelocity));
                    
                    // Ensure vertical velocity is also controlled
                    const currentVY = this.body.velocity.y;
                    if (currentVY < 10) {
                        this.setVelocityY(Phaser.Math.Between(10, 20));
                    } else if (currentVY > maxVerticalVelocity) {
                        this.setVelocityY(Phaser.Math.Between(15, 25));
                    } else {
                        this.setVelocityY(Phaser.Math.Between(10, maxVerticalVelocity));
                    }
                }
                
                // Bounce off walls (handled in checkBoundaries)
                break;
        }
    }
    
    /**
     * Check if enemy is outside boundaries and handle accordingly
     * @param {Phaser.Geom.Rectangle} bounds - The physics world bounds
     * @param {number} gameWidth - The game width
     * @param {number} gameHeight - The game height
     */
    checkBoundaries(bounds, gameWidth, gameHeight) {
        // Get enemy dimensions
        const halfWidth = this.displayWidth / 2;
        const halfHeight = this.displayHeight / 2;
        
        // Check horizontal boundaries
        if (this.x - halfWidth < bounds.left) {
            // Left boundary - reverse direction and place at boundary
            this.x = bounds.left + halfWidth;
            this.body.velocity.x = Math.abs(this.body.velocity.x);
        } else if (this.x + halfWidth > bounds.right) {
            // Right boundary - reverse direction and place at boundary
            this.x = bounds.right - halfWidth;
            this.body.velocity.x = -Math.abs(this.body.velocity.x);
        }
        
        // Check vertical boundaries
        if (this.y < bounds.top - halfHeight) {
            // Enemy is completely off-screen at the top, wrap to bottom
            this.y = gameHeight - halfHeight;
            
            // Randomize horizontal position when wrapping to bottom
            this.x = Phaser.Math.Between(bounds.left + halfWidth, bounds.right - halfWidth);
            
            // Ensure vertical velocity is positive when wrapping to bottom
            if (this.body.velocity.y < 0) {
                this.body.velocity.y = Math.abs(this.body.velocity.y);
            }
        } else if (this.y - halfHeight < bounds.top) {
            // Top boundary - reverse direction and place at boundary
            this.y = bounds.top + halfHeight;
            this.body.velocity.y = Math.abs(this.body.velocity.y);
        } else if (this.y + halfHeight > gameHeight) {
            // Bottom boundary - if enemy goes below screen, wrap to top
            // This ensures enemies that go off-screen at the bottom come back from the top
            this.y = bounds.top + halfHeight;
            
            // Randomize horizontal position when wrapping to top
            this.x = Phaser.Math.Between(bounds.left + halfWidth, bounds.right - halfWidth);
            
            // Ensure vertical velocity is negative when wrapping to top
            if (this.body.velocity.y > 0) {
                this.body.velocity.y = -Math.abs(this.body.velocity.y);
            }
        }
        
        // For fast and boss enemies, ensure they don't get stuck moving only vertically
        if (this.type === 'fast' || this.type === 'boss') {
            // If vertical velocity is too high compared to horizontal, add some horizontal movement
            if (Math.abs(this.body.velocity.y) > 3 * Math.abs(this.body.velocity.x)) {
                const horizontalDirection = Phaser.Math.Between(0, 1) === 0 ? -1 : 1;
                const speedMultiplier = this.type === 'fast' ? 1.5 : 1;
                this.body.velocity.x = horizontalDirection * Phaser.Math.Between(30, 70) * speedMultiplier;
            }
        }
    }
    
    fire() {
        const scene = this.scene;
        
        // Check if player is still active
        if (!scene.player.active) return;
        
        // Add a much lower chance to skip firing to ensure bullets appear frequently
        // Very low chance to skip in earlier levels to ensure they fire consistently
        let skipChance;
        
        if (scene.level <= 10) {
            // Very low chance to skip firing in first 10 levels
            skipChance = 10 - (scene.level * 0.5); // 10% -> 5%
        } else if (scene.level <= 50) {
            // Gradually decrease skip chance from levels 11-50
            skipChance = 5 - ((scene.level - 10) * 0.1); // 5% -> 1%
        } else {
            // Minimal skip chance for higher levels
            skipChance = 1;
        }
        
        if (Phaser.Math.Between(1, 100) < skipChance) {
            return;
        }
        
        // Bullet speed scales with level to make early levels easier
        // Much more gradual scaling across all 255 levels
        let speedMultiplier;
        
        if (scene.level <= 20) {
            // Very slow bullets in early levels
            speedMultiplier = 0.2 + (scene.level * 0.01); // 0.2 -> 0.4
        } else if (scene.level <= 50) {
            // Gradually increase from levels 21-50
            speedMultiplier = 0.4 + ((scene.level - 20) * 0.01); // 0.4 -> 0.7
        } else if (scene.level <= 100) {
            // Continue increasing from levels 51-100
            speedMultiplier = 0.7 + ((scene.level - 50) * 0.004); // 0.7 -> 0.9
        } else {
            // Final increase for higher levels
            speedMultiplier = Math.min(1.0, 0.9 + ((scene.level - 100) * 0.001)); // 0.9 -> 1.0 maximum
        }
        
        // Validate bullet creation parameters
        this.validateBulletParams();
        
        // Calculate bullet spawn position - ensure it's well outside the enemy's bounding box
        const enemyHeight = this.displayHeight;
        const bulletOffsetY = enemyHeight * 2; // Spawn bullets at 2x the enemy's height away
        
        // Create bullets based on enemy type
        switch (this.type) {
            case 'basic':
                // Single bullet with reduced accuracy in early levels
                const basicRandomX = scene.level <= 3 ? Phaser.Math.Between(-100, 100) : Phaser.Math.Between(-30, 30);
                const basicRandomY = scene.level <= 3 ? Phaser.Math.Between(-50, 50) : Phaser.Math.Between(-20, 20);
                
                this.createEnemyBullet(
                    this.x, 
                    this.y + bulletOffsetY, 
                    'enemy_bullet', 
                    'down', 
                    120 * speedMultiplier,
                    0,
                    scene.player.x + basicRandomX,
                    scene.player.y + basicRandomY
                );
                break;
                
            case 'fast':
                // Single bullet with reduced accuracy in early levels
                const fastRandomX = scene.level <= 3 ? Phaser.Math.Between(-80, 80) : Phaser.Math.Between(-30, 30);
                const fastRandomY = scene.level <= 3 ? Phaser.Math.Between(-40, 40) : Phaser.Math.Between(-20, 20);
                
                this.createEnemyBullet(
                    this.x, 
                    this.y + bulletOffsetY, 
                    'enemy_bullet', 
                    'down', 
                    150 * speedMultiplier,
                    0,
                    scene.player.x + fastRandomX,
                    scene.player.y + fastRandomY
                );
                break;
                
            case 'boss':
                // Main bullet with reduced accuracy in early levels
                const bossRandomX = scene.level <= 3 ? Phaser.Math.Between(-60, 60) : Phaser.Math.Between(-20, 20);
                const bossRandomY = scene.level <= 3 ? Phaser.Math.Between(-30, 30) : Phaser.Math.Between(-10, 10);
                
                this.createEnemyBullet(
                    this.x, 
                    this.y + bulletOffsetY, 
                    'enemy_bullet', 
                    'down', 
                    130 * speedMultiplier,
                    0,
                    scene.player.x + bossRandomX,
                    scene.player.y + bossRandomY
                );
                
                // Only add side bullets in higher levels and with reduced chance in early levels
                if (scene.level >= 5 || (scene.level >= 3 && Phaser.Math.Between(1, 100) < 30)) {
                    // Only fire one additional bullet in levels 3-4 instead of two
                    if (scene.level < 5) {
                        // Random side bullet (left or right)
                        const sideOffset = Phaser.Math.Between(0, 1) === 0 ? -15 : 15;
                        const sideTargetOffset = sideOffset * 3;
                        
                        this.createEnemyBullet(
                            this.x + sideOffset, 
                            this.y + bulletOffsetY, 
                            'enemy_bullet', 
                            'down', 
                            130 * speedMultiplier,
                            0,
                            scene.player.x + sideTargetOffset + Phaser.Math.Between(-50, 50),
                            scene.player.y + Phaser.Math.Between(-30, 30)
                        );
                    } else {
                        // Left bullet with slight offset
                        this.createEnemyBullet(
                            this.x - 15, 
                            this.y + bulletOffsetY, 
                            'enemy_bullet', 
                            'down', 
                            130 * speedMultiplier,
                            0,
                            scene.player.x - 50 + Phaser.Math.Between(-30, 30),
                            scene.player.y + Phaser.Math.Between(-20, 20)
                        );
                        
                        // Right bullet with slight offset
                        this.createEnemyBullet(
                            this.x + 15, 
                            this.y + bulletOffsetY, 
                            'enemy_bullet', 
                            'down', 
                            130 * speedMultiplier,
                            0,
                            scene.player.x + 50 + Phaser.Math.Between(-30, 30),
                            scene.player.y + Phaser.Math.Between(-20, 20)
                        );
                    }
                }
                break;
        }
        
        // Play shooting sound - safely wrapped
        this.playShootSound();
    }
    
    /**
     * Creates an enemy bullet with validation
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {string} texture - Bullet texture key
     * @param {string} direction - Direction of bullet movement
     * @param {number} speed - Speed of the bullet
     * @param {number} angle - Optional angle offset
     * @param {number} targetX - Optional target X position
     * @param {number} targetY - Optional target Y position
     * @returns {Bullet} The created bullet instance
     */
    createEnemyBullet(x, y, texture, direction, speed, angle = 0, targetX = null, targetY = null) {
        // Validate parameters
        if (!this.scene || !this.scene.physics) {
            console.error("Cannot create bullet: scene or physics not available");
            return null;
        }
        
        // Ensure texture exists
        if (!texture || !this.scene.textures.exists(texture)) {
            console.warn(`Bullet texture '${texture}' not found, using fallback`);
            texture = 'enemy_bullet'; // Fallback to default
        }
        
        // Validate position is within game bounds
        const gameWidth = this.scene.cameras.main.width;
        const gameHeight = this.scene.cameras.main.height;
        
        if (x < 0 || x > gameWidth || y < 0 || y > gameHeight) {
            console.warn(`Bullet position out of bounds: ${x},${y}`);
            // Clamp to valid position
            x = Math.max(0, Math.min(x, gameWidth));
            y = Math.max(0, Math.min(y, gameHeight));
        }
        
        // Create the bullet with validated parameters
        try {
            return new Bullet(this.scene, x, y, texture, direction, speed, angle, targetX, targetY);
        } catch (error) {
            console.error("Error creating bullet:", error);
            return null;
        }
    }
    
    /**
     * Validates that all required bullet parameters are available
     */
    validateBulletParams() {
        // Check if Bullet class is available
        if (typeof Bullet !== 'function') {
            console.error("Bullet class not found");
            return false;
        }
        
        // Check if enemy_bullet texture is loaded
        if (!this.scene.textures.exists('enemy_bullet')) {
            console.warn("enemy_bullet texture not found");
            return false;
        }
        
        return true;
    }
    
    playShootSound() {
        try {
            if (!GAME.isMuted && this.scene.cache.audio.exists('enemy_shoot')) {
                this.scene.sound.play('enemy_shoot', { volume: 0.3 });
            }
        } catch (err) {
            console.warn("Could not play enemy_shoot sound:", err);
        }
    }
}
