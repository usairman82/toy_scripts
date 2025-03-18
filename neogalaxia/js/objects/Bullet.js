class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, direction, speed, angle = 0, targetX = null, targetY = null) {
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set bullet scale - make it EXTREMELY small
        this.setScale(0.02);
        
        // Set collision body size - make it larger than the sprite for better collision detection
        this.setSize(this.width * 2, this.height * 2);
        
        // Store direction and speed
        this.direction = direction;
        
        // COMPLETELY DIFFERENT APPROACH - Use Phaser's built-in projectile system
        const BULLET_SPEED = 300; // Balanced speed - fast enough to reach targets but not too fast
        
        // Make sure the physics body is enabled and active
        this.body.enable = true;
        this.body.moves = true;
        
        // Use Phaser's built-in projectile system
        if (targetX !== null && targetY !== null) {
            // If we have a target, fire directly at it
            scene.physics.moveToObject(this, { x: targetX, y: targetY }, BULLET_SPEED);
        } else {
            // Otherwise use simple directional movement
            if (direction === 'up') {
                this.body.velocity.y = -BULLET_SPEED;
            } else {
                this.body.velocity.y = BULLET_SPEED;
            }
        }
        
        // Double-check that velocity was set
        if (this.body.velocity.x === 0 && this.body.velocity.y === 0) {
            console.error("Bullet has zero velocity after setting! Forcing default velocity.");
            if (direction === 'up') {
                this.body.velocity.y = -BULLET_SPEED;
            } else {
                this.body.velocity.y = BULLET_SPEED;
            }
        }
        
        // Log actual velocity for debugging
        console.log(`Bullet actual velocity: vx=${this.body.velocity.x}, vy=${this.body.velocity.y}`);
        
        // Add to the appropriate bullet group
        if (direction === 'up') {
            scene.playerBullets.add(this);
        } else {
            scene.enemyBullets.add(this);
        }
        
        // Set a timeout to destroy the bullet if it hasn't hit anything
        // Increased timeout to ensure bullets have time to reach targets
        scene.time.delayedCall(5000, () => {
            if (this.active) {
                this.destroy();
            }
        });
    }
    
    update() {
        // Check if scene exists before accessing properties
        if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) {
            return; // Exit early if scene or cameras are not available
        }
        
        // Destroy if out of bounds
        const gameWidth = this.scene.cameras.main.width;
        const gameHeight = this.scene.cameras.main.height;
        
        if (this.y < -50 || this.y > gameHeight + 50 || 
            this.x < -50 || this.x > gameWidth + 50) {
            this.destroy();
        }
        
        // Check if body exists before accessing velocity
        if (this.body) {
            // CONTINUOUS FORCE - Keep applying force to ensure bullet keeps moving
            const FORCE = 300; // Balanced force - fast enough to reach targets but not too fast
            if (this.direction === 'up') {
                this.body.velocity.y = -FORCE;
            } else {
                this.body.velocity.y = FORCE;
            }
        }
        
        // Debug log position and velocity
        if (this.scene && this.scene.time && this.body && this.scene.time.now % 60 === 0) { // Only log every 60ms to avoid spam
            console.log(`Bullet at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}) with velocity (${this.body.velocity.x.toFixed(0)}, ${this.body.velocity.y.toFixed(0)})`);
        }
    }
}
