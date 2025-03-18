class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, direction, speed, angle = 0) {
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Debug log the initial size
        this.logBulletSize('Initial size');
        
        // Set appropriate bullet size based on game dimensions
        this.setBulletSize(texture);
        
        // Set velocity based on direction
        this.direction = direction;
        this.speed = speed;
        
        // Apply velocity with safety checks
        this.applyVelocity(direction, speed, angle);
        
        // Add to the appropriate bullet group
        if (direction === 'up') {
            scene.playerBullets.add(this);
        } else {
            scene.enemyBullets.add(this);
        }
        
        // Log the final bullet size after all adjustments
        this.logBulletSize('Final size');
        
        // Set a timeout to destroy the bullet if it hasn't hit anything
        scene.time.delayedCall(2000, () => {
            if (this.active) {
                this.destroy();
            }
        });
    }
    
    /**
     * Sets the appropriate bullet size based on texture and game dimensions
     * @param {string} texture - The bullet texture key
     */
    setBulletSize(texture) {
        const gameWidth = this.scene.cameras.main.width;
        const gameHeight = this.scene.cameras.main.height;
        
        // Maximum allowed bullet dimensions (percentage of screen)
        const MAX_WIDTH_PERCENT = 0.03;  // 3% of screen width
        const MAX_HEIGHT_PERCENT = 0.05; // 5% of screen height
        
        // Calculate maximum allowed dimensions in pixels
        const maxWidth = gameWidth * MAX_WIDTH_PERCENT;
        const maxHeight = gameHeight * MAX_HEIGHT_PERCENT;
        
        // Default scale factor for collision body
        let scaleFactor = 0.8;
        
        // Different sizing for player vs enemy bullets
        if (texture === 'player_bullet') {
            // Player bullets are typically smaller and faster
            this.setDisplaySize(
                Math.min(this.width, maxWidth),
                Math.min(this.height, maxHeight)
            );
        } else if (texture === 'enemy_bullet') {
            // Enemy bullets might be slightly larger but still constrained
            this.setDisplaySize(
                Math.min(this.width, maxWidth * 1.2),
                Math.min(this.height, maxHeight * 1.2)
            );
        } else {
            // Generic fallback for any other bullet types
            this.setDisplaySize(
                Math.min(this.width, maxWidth),
                Math.min(this.height, maxHeight)
            );
        }
        
        // Set collision body size slightly smaller than visual size
        this.setSize(this.displayWidth * scaleFactor, this.displayHeight * scaleFactor);
        
        // Validate final size is reasonable
        if (this.displayWidth > maxWidth * 1.5 || this.displayHeight > maxHeight * 1.5) {
            console.warn(`Bullet size may be too large: ${this.displayWidth}x${this.displayHeight}`);
        }
    }
    
    /**
     * Apply velocity based on direction with safety checks
     * @param {string} direction - Direction of bullet movement
     * @param {number} speed - Speed of the bullet
     * @param {number} angle - Optional angle offset
     */
    applyVelocity(direction, speed, angle) {
        // Ensure speed is within reasonable limits
        const safeSpeed = Math.min(Math.max(speed, 50), 500);
        
        // Ensure angle is within reasonable limits
        const safeAngle = Math.min(Math.max(angle, -100), 100);
        
        switch (direction) {
            case 'up':
                this.setVelocityY(-safeSpeed);
                // Apply angle offset if any
                if (safeAngle !== 0) {
                    this.setVelocityX(safeAngle);
                }
                break;
                
            case 'down':
                this.setVelocityY(safeSpeed);
                // Apply angle offset if any
                if (safeAngle !== 0) {
                    this.setVelocityX(safeAngle);
                }
                break;
                
            case 'left':
                this.setVelocityX(-safeSpeed);
                break;
                
            case 'right':
                this.setVelocityX(safeSpeed);
                break;
                
            default:
                console.warn(`Invalid bullet direction: ${direction}`);
                this.setVelocityY(safeSpeed); // Default to downward if invalid
        }
    }
    
    /**
     * Log bullet size information for debugging
     * @param {string} label - Label for the log message
     */
    logBulletSize(label) {
        console.debug(
            `Bullet [${label}]: texture=${this.texture.key}, ` +
            `width=${this.width.toFixed(1)}, height=${this.height.toFixed(1)}, ` +
            `displayWidth=${this.displayWidth?.toFixed(1)}, displayHeight=${this.displayHeight?.toFixed(1)}`
        );
    }
    
    update() {
        // Destroy if out of bounds
        const gameWidth = this.scene.cameras.main.width;
        const gameHeight = this.scene.cameras.main.height;
        
        if (this.y < -50 || this.y > gameHeight + 50 || 
            this.x < -50 || this.x > gameWidth + 50) {
            this.destroy();
        }
    }
}
