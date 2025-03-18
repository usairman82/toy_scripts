class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, texture, direction, speed, angle = 0) {
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set collision body size
        this.setSize(this.width * 0.8, this.height * 0.8);
        
        // Set velocity based on direction
        this.direction = direction;
        this.speed = speed;
        
        switch (direction) {
            case 'up':
                this.setVelocityY(-speed);
                // Apply angle offset if any
                if (angle !== 0) {
                    this.setVelocityX(angle);
                }
                break;
                
            case 'down':
                this.setVelocityY(speed);
                // Apply angle offset if any
                if (angle !== 0) {
                    this.setVelocityX(angle);
                }
                break;
                
            case 'left':
                this.setVelocityX(-speed);
                break;
                
            case 'right':
                this.setVelocityX(speed);
                break;
        }
        
        // Add to the appropriate bullet group
        if (direction === 'up') {
            scene.playerBullets.add(this);
        } else {
            scene.enemyBullets.add(this);
        }
        
        // Set a timeout to destroy the bullet if it hasn't hit anything
        scene.time.delayedCall(2000, () => {
            if (this.active) {
                this.destroy();
            }
        });
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
