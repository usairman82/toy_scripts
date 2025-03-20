class PowerUp extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type) {
        const texture = 'powerup_' + type;
        super(scene, x, y, texture);
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Store power-up type
        this.powerupType = type;
        
        // Set appropriate scale for power-up based on type
        // Make sure power-ups are similar in size to the player ship
        if (type === 'speed') {
            // The speed power-up sprite is much larger, so it needs a smaller scale
            this.setScale(0.02);
        } else {
            // Other power-ups may need adjustment too
            this.setScale(0.05);
        }
        
        // Set collision body size to match the visual size
        this.setSize(this.displayWidth * 0.8, this.displayHeight * 0.8);
        
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
