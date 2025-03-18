class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, type, health) {
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set collision body size
        this.setSize(this.width * 0.8, this.height * 0.8);
        
        // Set enemy type and health
        this.type = type;
        this.health = health;
        
        // Set initial velocity based on type
        switch (type) {
            case 'basic':
                // Basic enemies move in formation (no velocity)
                this.setVelocity(0, 0);
                break;
            case 'fast':
                // Fast enemies move in zigzag pattern - but slower at first
                // Reduced velocity to prevent them from moving too erratically
                this.setVelocity(Phaser.Math.Between(-30, 30), Phaser.Math.Between(30, 50));
                break;
            case 'boss':
                // Boss enemies move slower
                this.setVelocity(Phaser.Math.Between(-20, 20), Phaser.Math.Between(10, 20));
                break;
        }
        
        // Initialize firing timer
        this.fireTimer = 0;
        this.fireDelay = this.getFireDelay();
        
        // Add to the enemy group in the scene
        scene.enemyManager.enemies.add(this);
    }
    
    getFireDelay() {
        // Different enemy types have different fire rates
        // Scale with game level to make early levels easier
        const levelMultiplier = Math.max(1, 3 - Math.floor(this.scene.level / 5));
        
        switch (this.type) {
            case 'basic':
                return Phaser.Math.Between(2000, 4000) * levelMultiplier;
            case 'fast':
                return Phaser.Math.Between(1500, 3000) * levelMultiplier;
            case 'boss':
                return Phaser.Math.Between(1000, 2000) * levelMultiplier;
            default:
                return 3000 * levelMultiplier;
        }
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
        
        // Check if it's time to fire
        if (time > this.fireTimer) {
            this.fire();
            this.fireTimer = time + this.fireDelay;
        }
        
        // Update movement based on enemy type
        switch (this.type) {
            case 'basic':
                // Basic enemies follow their formation
                break;
                
            case 'fast':
                // Fast enemies change direction randomly
                if (Phaser.Math.Between(0, 100) < 2) {
                    this.setVelocityX(Phaser.Math.Between(-100, 100));
                }
                
                // Bounce off walls
                const bounds = scene.physics.world.bounds;
                if (this.x <= bounds.left || this.x >= bounds.right) {
                    this.body.velocity.x *= -1;
                }
                break;
                
            case 'boss':
                // Boss movement pattern
                if (Phaser.Math.Between(0, 100) < 1) {
                    this.setVelocityX(Phaser.Math.Between(-50, 50));
                    this.setVelocityY(Phaser.Math.Between(20, 50));
                }
                
                // Bounce off walls
                const worldBounds = scene.physics.world.bounds;
                if (this.x <= worldBounds.left || this.x >= worldBounds.right) {
                    this.body.velocity.x *= -1;
                }
                break;
        }
    }
    
    fire() {
        const scene = this.scene;
        
        // Check if player is still active
        if (!scene.player.active) return;
        
        // Bullet speed scales with level to make early levels easier
        const speedMultiplier = Math.min(1, 0.5 + (scene.level / 20));
        
        // Create bullets based on enemy type
        switch (this.type) {
            case 'basic':
                // Single bullet straight down, slower in early levels
                new Bullet(scene, this.x, this.y + 20, 'enemy_bullet', 'down', 150 * speedMultiplier);
                break;
                
            case 'fast':
                // Single bullet with slight randomness, only on higher levels add angle
                const angleOffset = scene.level > 3 ? Phaser.Math.Between(-20, 20) : 0;
                new Bullet(
                    scene, 
                    this.x, 
                    this.y + 20, 
                    'enemy_bullet', 
                    'down', 
                    180 * speedMultiplier, 
                    angleOffset
                );
                break;
                
            case 'boss':
                // Fewer bullets in early levels
                new Bullet(scene, this.x, this.y + 20, 'enemy_bullet', 'down', 150 * speedMultiplier);
                
                // Only add side bullets in higher levels
                if (scene.level >= 5) {
                    new Bullet(scene, this.x - 15, this.y + 20, 'enemy_bullet', 'down', 150 * speedMultiplier, -15);
                    new Bullet(scene, this.x + 15, this.y + 20, 'enemy_bullet', 'down', 150 * speedMultiplier, 15);
                }
                break;
        }
        
        // Play shooting sound - safely wrapped
        this.playShootSound();
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