class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player_ship');
        
        // Add to scene and enable physics
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        // Set collision body size
        this.setSize(this.width * 0.8, this.height * 0.8);
        
        // Set bounds to keep player within game area
        this.setCollideWorldBounds(true);
        
        // Initialize player state
        this.invulnerable = false;
        
        // Apply world bounds
        const gameWidth = scene.cameras.main.width;
        const gameHeight = scene.cameras.main.height;
        this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight));
    }
    
    makeInvulnerable(duration) {
        // Set invulnerable state
        this.invulnerable = true;
        
        // Create flashing effect
        this.scene.tweens.add({
            targets: this,
            alpha: { from: 0.5, to: 1 },
            duration: 200,
            repeat: duration / 200 - 1,
            yoyo: true,
            onComplete: () => {
                this.invulnerable = false;
                this.alpha = 1;
            }
        });
    }
    
    update(time, delta) {
        // Additional per-frame logic if needed
    }
}
