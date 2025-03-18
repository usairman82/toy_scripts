class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
        this.assetsLoaded = false;
    }

    preload() {
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
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            this.assetsLoaded = true;
        });

        // Debug loading process
        this.load.on('filecomplete', (key, type, data) => {
            console.log(`Loaded asset: ${key} (${type})`);
        });

        this.load.on('loaderror', (file) => {
            console.error(`Error loading: ${file.key} (${file.url})`);
        });

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
        
        // Explosion spritesheet
        this.load.spritesheet('explosion', 'assets/sprites/explosion_spritesheet.png', {
            frameWidth: 128,
            frameHeight: 128
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
        // Create explosion animation
        this.anims.create({
            key: 'explode',
            frames: this.anims.generateFrameNumbers('explosion', { 
                frames: [6, 7, 8, 7, 8, 7, 8] 
            }),
            frameRate: 12,
            repeat: 0
        });

        // Generate silent audio fallbacks for all sound effects
        this.generateSilentAudioFallbacks();
        
        // Ensure bullet textures are properly sized
        this.ensureBulletTexturesAreProperlyScaled();
        
        // Start the main menu scene
        this.scene.start('MenuScene');
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
    
    /**
     * Ensures bullet textures are properly scaled if they're too large
     */
    ensureBulletTexturesAreProperlyScaled() {
        // Maximum dimensions for bullet sprites (in pixels)
        const MAX_BULLET_WIDTH = 30;
        const MAX_BULLET_HEIGHT = 30;
        
        // Check and fix player bullet texture
        this.scaleTextureIfNeeded('player_bullet', MAX_BULLET_WIDTH, MAX_BULLET_HEIGHT);
        
        // Check and fix enemy bullet texture
        this.scaleTextureIfNeeded('enemy_bullet', MAX_BULLET_WIDTH, MAX_BULLET_HEIGHT);
    }
    
    /**
     * Scales a texture if it exceeds maximum dimensions
     * @param {string} key - The texture key
     * @param {number} maxWidth - Maximum allowed width
     * @param {number} maxHeight - Maximum allowed height
     */
    scaleTextureIfNeeded(key, maxWidth, maxHeight) {
        try {
            // Skip if texture doesn't exist
            if (!this.textures.exists(key)) {
                console.warn(`Texture '${key}' not found for scaling check`);
                return;
            }
            
            const frame = this.textures.getFrame(key);
            if (!frame) return;
            
            const width = frame.width;
            const height = frame.height;
            
            // Log the original dimensions
            console.log(`Checking texture '${key}': ${width}x${height}`);
            
            // If dimensions are acceptable, no need to scale
            if (width <= maxWidth && height <= maxHeight) {
                return;
            }
            
            console.warn(
                `Texture '${key}' is too large (${width}x${height}). ` +
                `Creating scaled version.`
            );
            
            // Calculate scale factor to fit within max dimensions
            const scaleX = maxWidth / width;
            const scaleY = maxHeight / height;
            const scale = Math.min(scaleX, scaleY);
            
            // Create a new scaled texture
            const newKey = `${key}_scaled`;
            const newWidth = Math.floor(width * scale);
            const newHeight = Math.floor(height * scale);
            
            // Create a new texture using the render texture
            const rt = this.make.renderTexture({
                width: newWidth,
                height: newHeight
            }, true);
            
            rt.draw(key, 0, 0, newWidth, newHeight);
            rt.saveTexture(newKey);
            
            // Replace the original texture reference with the scaled version
            this.textures.remove(key);
            this.textures.addKey(key, this.textures.get(newKey));
            
            console.log(
                `Created scaled texture for '${key}': ` +
                `${width}x${height} → ${newWidth}x${newHeight}`
            );
        } catch (error) {
            console.error(`Error scaling texture '${key}':`, error);
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
                
                // Create an audio element and add it to cache
                const audioElement = new Audio();
                audioElement.src = URL.createObjectURL(new Blob([this.wavFromAudioBuffer(buffer)], { type: 'audio/wav' }));
                
                // Manually add it to Phaser's audio cache
                this.cache.audio.add(key, {
                    type: 'audio',
                    key: key,
                    url: audioElement.src,
                    data: audioElement,
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
    
    wavFromAudioBuffer(audioBuffer) {
        const numOfChannels = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChannels * 2;
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);
        
        // Write WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, numOfChannels, true);
        view.setUint32(24, audioBuffer.sampleRate, true);
        view.setUint32(28, audioBuffer.sampleRate * numOfChannels * 2, true);
        view.setUint16(32, numOfChannels * 2, true);
        view.setUint16(34, 16, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, length, true);
        
        // Write silent audio data (all zeros)
        const dataOffset = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let c = 0; c < numOfChannels; c++) {
                view.setInt16(dataOffset + (i * numOfChannels + c) * 2, 0, true);
            }
        }
        
        return buffer;
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
