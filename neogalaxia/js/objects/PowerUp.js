class PowerUp extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        const texture = 'powerup_' + type;
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Store power-up type
        this.powerupType = type;
        
        // Set collision body size
        this.setSize(this.width * 0.8, this.height * 0.8);
        
        // Set downward movement
        this.setVelocityY(100);
        
        // Add to power-up group
        scene.powerupItems.add(this);
        
        // Create glowing effect
        scene.tweens.add({
            targets: this,
            alpha: { from: 0.6, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // Auto-destroy if not collected
        scene.time.delayedCall(10000, () => {
            if (this.active) {
                this.destroy();
            }
        });
    }
    
    update() {
        // Destroy if out of bounds
        if (this.y > this.scene.cameras.main.height + 50) {
            this.destroy();
        }
    }
}
