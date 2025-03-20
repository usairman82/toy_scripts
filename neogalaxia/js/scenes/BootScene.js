class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        this.assetsLoaded = false;
    }

    preload() {
        console.log("BootScene preload started");
        
        // Display loading text
        this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2 - 50, 'Loading...', {
            font: '24px Arial',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Create loading bar
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        // Loading progress events
        this.load.on('progress', function(value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
            console.log(`Loading progress: ${Math.floor(value * 100)}%`);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            this.assetsLoaded = true;
            console.log("All assets loaded successfully");
        });

        // Debug loading process
        this.load.on('filecomplete', (key, type, data) => {
            console.log(`Loaded asset: ${key} (${type})`);
            
            // For image assets, log their dimensions
            if (type === 'image') {
                console.log(`Image dimensions for ${key}: ${data.width}x${data.height}`);
            }
        });

        this.load.on('loaderror', (file) => {
            console.error(`Error loading: ${file.key} (${file.url})`);
            console.error("Error details:", file.src);
        });

        // Set the base URL for all assets
        this.load.setBaseURL('./');
        
        // Ship sprites
        this.load.image('player_ship', 'assets/sprites/player_ship.png');
        this.load.image('enemy_1', 'assets/sprites/enemy_1.png');
        this.load.image('enemy_2', 'assets/sprites/enemy_2.png');
        this.load.image('enemy_boss', 'assets/sprites/enemy_boss.png');
        
        // Bullet sprites with explicit max dimensions
        this.load.image('player_bullet', 'assets/sprites/player_bullet.png');
        this.load.image('enemy_bullet', 'assets/sprites/enemy_bullet.png');
        
        // Add debug logging for bullet sprite dimensions
        this.load.on('filecomplete-image-player_bullet', (key, type, data) => {
            console.log(`Loaded player bullet sprite: ${data.width}x${data.height}`);
            this.validateSpriteSize(key, data, 30, 30);
        });
        
        this.load.on('filecomplete-image-enemy_bullet', (key, type, data) => {
            console.log(`Loaded enemy bullet sprite: ${data.width}x${data.height}`);
            this.validateSpriteSize(key, data, 30, 30);
        });
        
        // Explosion spritesheets
        this.load.spritesheet('explosion', 'assets/sprites/explosion_spritesheet.png', {
            frameWidth: 128,
            frameHeight: 128
        });
        
        // New explosion spritesheet with 4x4 grid of 64x64 frames
        this.load.spritesheet('explosion_spritesheet_2', 'assets/sprites/explosion_spritesheet_2.png', {
            frameWidth: 64,
            frameHeight: 64
        });
        
        // Power-up sprites
        this.load.image('powerup_shield', 'assets/sprites/powerup_shield.png');
        this.load.image('powerup_double', 'assets/sprites/powerup_double.png');
        this.load.image('powerup_speed', 'assets/sprites/powerup_speed.png');
        
        // Background
        this.load.image('background', 'assets/sprites/background.png');
        
        // Create a pixel texture for UI elements
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xFFFFFF);
        graphics.fillRect(0, 0, 1, 1);
        graphics.generateTexture('pixel', 1, 1);
        
        // Mobile UI elements - try to load but don't crash if missing
        this.load.svg('dpad', 'assets/sprites/dpad.svg').on('loaderror', () => {
            console.warn("dpad.svg not found, using fallback");
        });
        this.load.svg('fire_button', 'assets/sprites/fire-button.svg').on('loaderror', () => {
            console.warn("fire_button.svg not found, using fallback");
        });
        this.load.svg('mute_button', 'assets/sprites/mute-button.svg').on('loaderror', () => {
            console.warn("mute_button.svg not found, using fallback");
        });
        
        // Audio files
        this.load.audio('bg_music', 'assets/audio/bg_music.mp3');
        this.load.audio('player_shoot', 'assets/audio/player_shoot.mp3');
        this.load.audio('enemy_shoot', 'assets/audio/enemy_shoot.mp3');
        this.load.audio('explosion', 'assets/audio/explosion.mp3');
        this.load.audio('powerup_pickup', 'assets/audio/powerup_pickup.wav');
        this.load.audio('enemy_spawn', 'assets/audio/enemy_spawn.mp3');
        this.load.audio('game_over', 'assets/audio/game_over.mp3');
        
        // Set up a listener for decoding errors
        this.sound.on('decodeerror', (key, err) => {
            console.warn(`Error decoding ${key}, creating silent fallback`);
            this.createSilentAudio(key);
        });
    }

    create() {
        console.log("BootScene create started");
        
        // Create explosion animation
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { 
                frames: [6, 7, 8, 7, 8, 7, 8] 
            }),
            frameRate: 12,
            repeat: 0
        });
        
        // Create new explosion animation using the 4x4 spritesheet
        this.anims.create({
            key: 'explode2',
            frames: this.anims.generateFrameNumbers('explosion_spritesheet_2', { 
                start: 0,
                end: 15
            }),
            frameRate: 24,
            repeat: 0
        });

        // Generate silent audio fallbacks for all sound effects
        this.generateSilentAudioFallbacks();
        
        // Debug: Check if all textures are loaded correctly
        this.debugTextureLoading();
        
        // Start the main menu scene
        console.log("Starting MenuScene");
        this.scene.start('MenuScene');
    }
    
    /**
     * Debug function to check if all textures are loaded correctly
     */
    debugTextureLoading() {
        const textureKeys = [
            'player_ship', 'enemy_1', 'enemy_2', 'enemy_boss',
            'player_bullet', 'enemy_bullet', 'background',
            'powerup_shield', 'powerup_double', 'powerup_speed'
        ];
        
        console.log("Checking texture loading status:");
        
        textureKeys.forEach(key => {
            if (this.textures.exists(key)) {
                const frame = this.textures.getFrame(key);
                console.log(`✅ Texture '${key}' loaded successfully: ${frame.width}x${frame.height}`);
                
                // Create a test sprite to verify rendering
                const testSprite = this.add.sprite(-100, -100, key);
                console.log(`   Sprite created with dimensions: ${testSprite.width}x${testSprite.height}`);
            } else {
                console.error(`❌ Texture '${key}' NOT FOUND`);
            }
        });
    }
    
    /**
     * Validates that a sprite's dimensions are within acceptable limits
     * @param {string} key - The texture key
     * @param {object} data - The image data
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     */
    validateSpriteSize(key, data, maxWidth, maxHeight) {
        if (data.width > maxWidth || data.height > maxHeight) {
            console.warn(
                `Sprite '${key}' dimensions (${data.width}x${data.height}) ` +
                `exceed recommended maximum (${maxWidth}x${maxHeight})`
            );
        }
    }
    
    generateSilentAudioFallbacks() {
        // List of all audio keys used in the game
        const audioKeys = [
            'bg_music',
            'player_shoot',
            'enemy_shoot',
            'explosion',
            'powerup_pickup',
            'enemy_spawn',
            'game_over'
        ];
        
        // Create fallbacks for any missing audio
        audioKeys.forEach(key => {
            if (!this.cache.audio.exists(key)) {
                console.warn(`Audio ${key} not found, creating silent fallback`);
                this.createSilentAudio(key);
            }
        });
    }
    
    createSilentAudio(key) {
        // Create a silent audio context to use as a fallback
        try {
            console.log(`Creating silent audio fallback for ${key}`);
            
            // Use Web Audio API to create a silent buffer
            const audioContext = this.sound.context;
            if (audioContext) {
                const buffer = audioContext.createBuffer(1, 22050, 44100);
                
                // Instead of creating a Blob URL, directly add the buffer to Phaser's audio cache
                this.cache.audio.add(key, {
                    type: 'audio',
                    key: key,
                    data: buffer,
                    duration: 0.5,
                    locked: false
                });
                
                console.log(`Silent audio fallback for ${key} created successfully`);
            } else {
                console.error("Audio context not available for silent audio fallback");
            }
        } catch (e) {
            console.error(`Error creating silent audio fallback for ${key}:`, e);
        }
    }
}
