class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    create() {
        // Add background
        this.background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);
            
        // Display game over text
        this.gameOverText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 - 100,
            'GAME OVER',
            {
                font: '64px Arial',
                fill: '#ff0000',
                stroke: '#000000',
                strokeThickness: 6
            }
        ).setOrigin(0.5);
        
        // Display final score
        this.scoreText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            `FINAL SCORE: ${GAME.score}`,
            {
                font: '32px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        // Display high score
        this.highScoreText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 50,
            `HIGH SCORE: ${GAME.highScore}`,
            {
                font: '24px Arial',
                fill: '#ffff00',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5);
        
        // Add restart button
        this.restartButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 120,
            'PLAY AGAIN',
            {
                font: '32px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        this.restartButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.restartButton.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => this.restartButton.setStyle({ fill: '#ffffff' }))
            .on('pointerdown', () => {
                // Reset game state
                GAME.level = 1;
                GAME.lives = 3;
                GAME.score = 0;
                this.scene.start('GameScene');
            });
            
        // Add menu button
        this.menuButton = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 170,
            'MAIN MENU',
            {
                font: '32px Arial',
                fill: '#ffffff',
                stroke: '#000000',
                strokeThickness: 4
            }
        ).setOrigin(0.5);
        
        this.menuButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.menuButton.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => this.menuButton.setStyle({ fill: '#ffffff' }))
            .on('pointerdown', () => {
                this.scene.start('MenuScene');
            });
            
        // Add keyboard event for Enter key to restart
        this.input.keyboard.on('keydown-ENTER', () => {
            // Reset game state
            GAME.level = 1;
            GAME.lives = 3;
            GAME.score = 0;
            this.scene.start('GameScene');
        });
        
        // Add keyboard event for Escape key to go to menu
        this.input.keyboard.on('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
        
        // Set up resize handler
        this.scale.on('resize', this.resize, this);
        
        // Play game over sound - safely wrapped
        try {
            if (!GAME.isMuted && this.cache.audio.exists('game_over')) {
                this.sound.play('game_over', { volume: 0.7 });
            }
        } catch (err) {
            console.warn("Could not play game_over sound:", err);
        }
    }
    
    update() {
        // Scroll background for visual effect
        this.background.tilePositionY += 0.5;
    }
    
    // Resize method to handle different screen resolutions
    resize(gameSize) {
        // Adjust text positions
        if (this.gameOverText) {
            this.gameOverText.setPosition(gameSize.width / 2, gameSize.height / 2 - 100);
        }
        
        if (this.scoreText) {
            this.scoreText.setPosition(gameSize.width / 2, gameSize.height / 2);
        }
        
        if (this.highScoreText) {
            this.highScoreText.setPosition(gameSize.width / 2, gameSize.height / 2 + 50);
        }
        
        if (this.restartButton) {
            this.restartButton.setPosition(gameSize.width / 2, gameSize.height / 2 + 120);
        }
        
        if (this.menuButton) {
            this.menuButton.setPosition(gameSize.width / 2, gameSize.height / 2 + 170);
        }
    }
}