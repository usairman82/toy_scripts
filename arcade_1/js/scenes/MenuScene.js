class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    preload() {
        // As a fallback, try to load the background music here too
        if (!this.cache.audio.exists('bg_music')) {
            console.log("MenuScene: bg_music not found in cache, loading now");
            this.load.audio('bg_music', 'assets/audio/bg_music.mp3');
        }
    }

    create() {
        // Reset game state when entering menu
        GAME.level = 1;
        GAME.lives = 3;
        GAME.score = 0;
        console.log("MenuScene: Reset game state. GAME.level =", GAME.level);
        
        // Add background
        this.background = this.add.tileSprite(0, 0, this.cameras.main.width, this.cameras.main.height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);

        // Add title
        this.titleText = this.add.text(this.cameras.main.width / 2, 100, 'NEOGALAXIA', {
            font: '48px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Add start game button
        this.startButton = this.add.text(this.cameras.main.width / 2, 250, 'START GAME', {
            font: '32px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.startButton.setInteractive({ useHandCursor: true })
            .on('pointerover', () => this.startButton.setStyle({ fill: '#ff0' }))
            .on('pointerout', () => this.startButton.setStyle({ fill: '#ffffff' }))
            .on('pointerdown', () => {
                // Verify level is 1 before starting game
                GAME.level = 1;
                this.scene.start('GameScene');
            });

        // Add control instructions
        const controlsText = GAME.isMobile ? 
            'MOBILE CONTROLS:\nD-Pad to move\nTap Fire button to shoot' : 
            'CONTROLS:\nArrow keys or WASD to move\nSpace to shoot\nESC to pause';

        this.controlsInfoText = this.add.text(this.cameras.main.width / 2, 350, controlsText, {
            font: '22px Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5);

        // Add high score
        this.highScoreText = this.add.text(this.cameras.main.width / 2, 450, `HIGH SCORE: ${GAME.highScore}`, {
            font: '24px Arial',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Add developer credits
        this.creditsText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height - 50, 'Neogalaxia - Web Game Dev Project', {
            font: '16px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Add keyboard event for Enter key
        this.input.keyboard.on('keydown-ENTER', () => {
            // Verify level is 1 before starting game
            GAME.level = 1;
            this.scene.start('GameScene');
        });

        // Safely try to start background music
        try {
            // Check if bg_music exists in the cache before trying to add it
            if (this.cache.audio.exists('bg_music')) {
                this.bgMusic = this.sound.add('bg_music', {
                    volume: 0.6,
                    loop: true
                });
                
                if (!GAME.isMuted) {
                    this.bgMusic.play();
                }
            } else {
                console.warn("bg_music not available in cache");
            }
        } catch (error) {
            console.error("Error adding background music:", error);
        }

        // Add mute button
        this.muteButton = this.add.text(this.cameras.main.width - 20, 20, GAME.isMuted ? '🔇' : '🔊', {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(1, 0);

        this.muteButton.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                GAME.isMuted = !GAME.isMuted;
                this.muteButton.setText(GAME.isMuted ? '🔇' : '🔊');
                
                if (this.bgMusic) {
                    if (GAME.isMuted) {
                        this.bgMusic.pause();
                    } else {
                        this.bgMusic.resume();
                    }
                }
            });
            
        // Set up resize handler
        this.scale.on('resize', this.resize, this);
    }

    shutdown() {
        if (this.bgMusic) {
            try {
                this.bgMusic.stop();
            } catch (err) {
                console.warn("Error stopping menu music:", err);
            }
        }
    }
    
    // Handle screen resizing
    resize(gameSize) {
        // Adjust background
        if (this.background) {
            this.background.setSize(gameSize.width, gameSize.height);
        }
        
        // Adjust text positions
        if (this.titleText) {
            this.titleText.setPosition(gameSize.width / 2, 100);
        }
        
        if (this.startButton) {
            this.startButton.setPosition(gameSize.width / 2, 250);
        }
        
        if (this.controlsInfoText) {
            this.controlsInfoText.setPosition(gameSize.width / 2, 350);
        }
        
        if (this.highScoreText) {
            this.highScoreText.setPosition(gameSize.width / 2, 450);
        }
        
        if (this.creditsText) {
            this.creditsText.setPosition(gameSize.width / 2, gameSize.height - 50);
        }
        
        if (this.muteButton) {
            this.muteButton.setPosition(gameSize.width - 20, 20);
        }
    }
}
