/**
 * Main Game Logic for Dungeon Adventure Game
 * Handles input, game state, and mechanics
 */

console.log("Game.js loaded - Script execution started");

class DungeonGame {
    constructor() {
        console.log("DungeonGame constructor called");
        // Initialize canvas
        this.canvas = document.getElementById('game-canvas');
        
        // Initialize raycasting engine with error handling
        try {
            console.log("Creating RaycastingEngine instance");
            this.engine = new RaycastingEngine(this.canvas);
            console.log("RaycastingEngine instance created successfully");
        } catch (error) {
            console.error("Failed to create RaycastingEngine:", error);
            this.showError("Failed to initialize game engine. Check the debug console for details.");
            return;
        }
        
        // Initialize audio manager
        try {
            console.log("Creating AudioManager instance");
            this.audio = new AudioManager();
            console.log("AudioManager instance created successfully");
        } catch (error) {
            console.error("Failed to create AudioManager:", error);
            this.showError("Failed to initialize audio. Game will continue without sound.");
        }
        
        // Game state
        this.state = {
            health: 100,
            maxHealth: 100,
            inventory: [],
            currentWeapon: 'sword',
            level: 1,
            enemies: [],
            gameOver: false,
            paused: false,
            loading: true,
            exploredMap: null // Will store explored areas for minimap
        };
        
        // Set a loading timeout to prevent getting stuck on loading screen
        this.loadingTimeout = setTimeout(() => {
            if (this.state.loading) {
                console.warn("Loading timeout reached, forcing game to start");
                this.state.loading = false;
                if (this.loadingScreen) {
                    this.loadingScreen.style.display = 'none';
                    console.log("Loading screen hidden by timeout");
                } else {
                    console.warn("Loading screen element not found when trying to hide it in timeout");
                }
            }
        }, 10000); // 10 seconds timeout
        
        // Input state
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            locked: false
        };
        
        // UI elements
        this.healthBar = document.getElementById('health-bar');
        this.inventoryElement = document.getElementById('inventory');
        this.inventorySlotsElement = document.getElementById('inventory-slots');
        this.loadingScreen = document.getElementById('loading-screen');
        this.progressBar = document.querySelector('.progress-bar');
        
        // Bind event handlers
        this.bindEvents();
        
        // Start the game
        this.init();
    }
    
    /**
     * Initialize the game
     */
    async init() {
        try {
            console.log("Game initialization started");
            
            // Create minimap canvas
            this.createMinimapCanvas();
            
            // Load assets
            console.log("Loading assets...");
            await this.loadAssets();
            console.log("Assets loaded successfully");
            
            // Load the first level
            console.log("Loading level 1...");
            await this.loadLevel(1);
            console.log("Level 1 loaded successfully");
            
            // Hide loading screen
            console.log("Hiding loading screen");
            this.state.loading = false;
            if (this.loadingScreen) {
                this.loadingScreen.style.display = 'none';
                console.log("Loading screen hidden successfully");
            } else {
                console.warn("Loading screen element not found when trying to hide it");
            }
            
            // Start game loop
            this.lastTime = performance.now();
            requestAnimationFrame(this.gameLoop.bind(this));
            
            // Try to load saved game
            this.loadGame();
            
            // Lock pointer for mouse control
            this.canvas.addEventListener('click', () => {
                this.canvas.requestPointerLock();
            });
        } catch (error) {
            console.error('Failed to initialize game:', error);
            this.showError('Failed to initialize game. Please refresh the page or click to continue.');
            
            // Add a click handler to the loading screen to allow the user to continue anyway
            this.loadingScreen.addEventListener('click', () => {
                // Clear loading screen
                this.state.loading = false;
                this.loadingScreen.style.display = 'none';
                
                // Start game loop with fallback level
                const fallbackLevel = this.createFallbackLevel();
                this.engine.setMap(fallbackLevel);
                this.initializeExploredMap(fallbackLevel);
                this.lastTime = performance.now();
                requestAnimationFrame(this.gameLoop.bind(this));
            });
        }
    }
    
    /**
     * Create minimap canvas
     */
    createMinimapCanvas() {
        // Create minimap canvas element
        this.minimapCanvas = document.createElement('canvas');
        this.minimapCanvas.id = 'minimap-canvas';
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
        
        // Style the minimap
        this.minimapCanvas.style.position = 'absolute';
        this.minimapCanvas.style.top = '20px';
        this.minimapCanvas.style.right = '20px';
        this.minimapCanvas.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        this.minimapCanvas.style.border = '2px solid #fff';
        this.minimapCanvas.style.zIndex = '100';
        
        // Add to the game container
        document.getElementById('game-container').appendChild(this.minimapCanvas);
    }
    
    /**
     * Game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Skip if game is paused or loading
        if (!this.state.paused && !this.state.loading && !this.state.gameOver) {
            // Handle input
            this.handleInput(deltaTime);
            
            // Update enemies
            this.updateEnemies(deltaTime);
            
            // Update explored map for minimap
            this.updateExploredMap();
            
            // Render the scene
            this.engine.render();
            
            // Render minimap
            this.renderMinimap();
            
            // Debug info
            this.renderDebugInfo();
            
            // Auto-save every 30 seconds
            if (Math.floor(timestamp / 30000) > Math.floor(this.lastTime / 30000)) {
                this.saveGame();
            }
        }
        
        // Request next frame
        requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    /**
     * Update explored map based on player position
     */
    updateExploredMap() {
        if (!this.state.exploredMap) return;
        
        // Get player's position in grid coordinates
        const playerMapX = Math.floor(this.engine.player.x);
        const playerMapY = Math.floor(this.engine.player.y);
        
        // Mark current position and surrounding cells as explored
        const visibilityRadius = 3; // How far the player can "see" for the minimap
        
        for (let y = Math.max(0, playerMapY - visibilityRadius); y <= Math.min(this.state.exploredMap.length - 1, playerMapY + visibilityRadius); y++) {
            for (let x = Math.max(0, playerMapX - visibilityRadius); x <= Math.min(this.state.exploredMap[0].length - 1, playerMapX + visibilityRadius); x++) {
                // Calculate distance from player
                const dx = x - playerMapX;
                const dy = y - playerMapY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Mark as explored if within visibility radius
                if (distance <= visibilityRadius) {
                    this.state.exploredMap[y][x] = true;
                }
            }
        }
    }
    
    /**
     * Render the minimap
     */
    renderMinimap() {
        if (!this.state.exploredMap || !this.minimapCanvas) return;
        
        const ctx = this.minimapCanvas.getContext('2d');
        const cellSize = 8; // Size of each cell in the minimap
        
        // Clear the minimap
        ctx.clearRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        // Draw the explored map
        for (let y = 0; y < this.state.exploredMap.length; y++) {
            for (let x = 0; x < this.state.exploredMap[y].length; x++) {
                // Skip unexplored areas
                if (!this.state.exploredMap[y][x]) continue;
                
                // Get the cell type
                const cell = this.engine.map.layout[y][x];
                
                // Set color based on cell type
                if (cell === 'W') {
                    ctx.fillStyle = '#555'; // Wall
                } else if (cell === 'D') {
                    ctx.fillStyle = '#8b4513'; // Door
                } else {
                    ctx.fillStyle = '#333'; // Floor
                }
                
                // Draw the cell
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        
        // Draw player position
        const playerX = Math.floor(this.engine.player.x * cellSize);
        const playerY = Math.floor(this.engine.player.y * cellSize);
        
        // Draw player direction indicator
        ctx.fillStyle = '#f00';
        ctx.beginPath();
        ctx.arc(playerX, playerY, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw player direction
        const dirX = Math.cos(this.engine.player.angle) * 5;
        const dirY = Math.sin(this.engine.player.angle) * 5;
        
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(playerX, playerY);
        ctx.lineTo(playerX + dirX, playerY + dirY);
        ctx.stroke();
        
        // Draw enemies on minimap if they're in explored areas
        ctx.fillStyle = '#ff0';
        for (const enemy of this.state.enemies) {
            const enemyMapX = Math.floor(enemy.x);
            const enemyMapY = Math.floor(enemy.y);
            
            // Only show enemies in explored areas
            if (enemyMapX >= 0 && enemyMapX < this.state.exploredMap[0].length &&
                enemyMapY >= 0 && enemyMapY < this.state.exploredMap.length &&
                this.state.exploredMap[enemyMapY][enemyMapX]) {
                
                const enemyX = enemy.x * cellSize;
                const enemyY = enemy.y * cellSize;
                
                ctx.beginPath();
                ctx.arc(enemyX, enemyY, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    /**
     * Render debug information
     */
    renderDebugInfo() {
        // Display debug info in the top-left corner
        const ctx = this.engine.ctx;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 300, 100);
        
        ctx.font = '12px monospace';
        ctx.fillStyle = '#fff';
        
        // Player position and angle
        ctx.fillText(`Position: (${this.engine.player.x.toFixed(2)}, ${this.engine.player.y.toFixed(2)})`, 20, 30);
        ctx.fillText(`Angle: ${(this.engine.player.angle * 180 / Math.PI).toFixed(2)}°`, 20, 50);
        
        // Health
        ctx.fillText(`Health: ${this.state.health}/${this.state.maxHealth}`, 20, 70);
        
        // Weapon
        ctx.fillText(`Weapon: ${this.state.currentWeapon}`, 20, 90);
        
        // Enemies
        ctx.fillText(`Enemies: ${this.state.enemies.length}`, 200, 30);
        
        // Attack info
        const weapon = this.getWeaponData(this.state.currentWeapon);
        if (weapon) {
            ctx.fillText(`Attack: Space`, 200, 50);
            ctx.fillText(`Damage: ${weapon.damage}`, 200, 70);
            ctx.fillText(`Range: ${weapon.range}`, 200, 90);
        }
    }
    
    /**
     * Load game configuration from config.json
     * @returns {object} - Game configuration
     */
    async loadConfig() {
        try {
            const response = await fetch('config.json');
            const config = await response.json();
            console.log("Loaded game configuration:", config);
            return config;
        } catch (error) {
            console.error("Failed to load config.json:", error);
            // Return default configuration
            return {
                depthTextures: {
                    enabled: true,
                    density: 0.3,
                    minDistance: 1.5,
                    maxDistance: 15.0,
                    randomSeed: 12345
                }
            };
        }
    }
    
    /**
     * Load game assets
     */
    async loadAssets() {
        console.log("Starting to load assets...");
        // Count depth textures
        const depthTextureCount = 4; // lit_torch.png, moss_patch.png, skull.png, small_alcove_with_candle.png
        const totalAssets = 27 + depthTextureCount;
        let loadedAssets = 0;
        
        // Add a loading message to the loading screen
        const loadingText = this.loadingScreen.querySelector('.loading-text');
        if (loadingText) {
            loadingText.innerHTML = 'Loading Dungeon Adventure...<br><small>Loading assets (0/' + totalAssets + ')</small>';
        }
        
        const updateProgress = () => {
            loadedAssets++;
            const progress = (loadedAssets / totalAssets) * 100;
            this.progressBar.style.width = `${progress}%`;
            console.log(`Loaded asset ${loadedAssets}/${totalAssets} (${progress.toFixed(1)}%)`);
            
            // Update loading message
            if (loadingText) {
                loadingText.innerHTML = 'Loading Dungeon Adventure...<br><small>Loading assets (' + loadedAssets + '/' + totalAssets + ')</small>';
            }
        };
        
        // Load configuration
        const config = await this.loadConfig();
        window.gameConfig = config;
        
        // Helper function to load an asset with error handling
        const loadAssetWithFallback = async (loadFunction, name, path) => {
            try {
                await loadFunction(name, path);
            } catch (error) {
                console.warn(`Failed to load asset: ${path}`, error);
                // Create a simple colored rectangle as fallback
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                
                // Use different colors for different asset types
                if (path.includes('wall')) {
                    ctx.fillStyle = '#555';
                } else if (path.includes('door')) {
                    ctx.fillStyle = '#8b4513';
                } else if (path.includes('enemy') || path.includes('skeleton') || path.includes('goblin') || path.includes('wizard') || path.includes('boss')) {
                    ctx.fillStyle = '#f00';
                } else if (path.includes('potion')) {
                    ctx.fillStyle = '#0f0';
                } else if (path.includes('key')) {
                    ctx.fillStyle = '#ff0';
                } else if (path.includes('chest')) {
                    ctx.fillStyle = '#a52a2a';
                } else {
                    ctx.fillStyle = '#888';
                }
                
                ctx.fillRect(0, 0, 64, 64);
                
                // Add a warning text
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Missing', 32, 30);
                ctx.fillText('Asset', 32, 42);
                
                const img = new Image();
                img.src = canvas.toDataURL();
                
                if (path.includes('textures')) {
                    this.engine.textures[name] = img;
                } else if (path.includes('sprites')) {
                    this.engine.sprites[name] = img;
                }
            }
            
            // Update progress regardless of success or failure
            updateProgress();
        };
        
        // Load textures
        const texturePromises = [
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'stone_wall', 'assets/textures/stone_wall.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'brick_wall', 'assets/textures/brick_wall.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'wood_wall', 'assets/textures/wood_wall.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'secret_wall', 'assets/textures/secret_wall.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'floor_stone', 'assets/textures/floor_stone.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'ceiling_stone', 'assets/textures/ceiling_stone.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'door_closed', 'assets/textures/door_closed.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'door_open', 'assets/textures/door_open.png')
        ];
        
        // Load depth textures
        const depthTexturePromises = [
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'lit_torch', 'assets/textures/depth/lit_torch.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'moss_patch', 'assets/textures/depth/moss_patch.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'skull', 'assets/textures/depth/skull.png'),
            loadAssetWithFallback(this.engine.loadTexture.bind(this.engine), 'small_alcove_with_candle', 'assets/textures/depth/small_alcove_with_candle.png')
        ];
        
        // Load sprites
        const spritePromises = [
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'player_hand', 'assets/sprites/player/player_hand.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'crossbow', 'assets/sprites/player/crossbow.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'skeleton_idle', 'assets/sprites/enemies/skeleton_idle.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'goblin_idle', 'assets/sprites/enemies/goblin_idle.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'goblin_attack', 'assets/sprites/enemies/goblin_attack.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'dark_wizard_idle', 'assets/sprites/enemies/dark_wizard_idle.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'dark_wizard_cast', 'assets/sprites/enemies/dark_wizard_cast.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'boss_idle', 'assets/sprites/enemies/boss_idle.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'boss_attack', 'assets/sprites/enemies/boss_attack.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'health_potion', 'assets/sprites/items/health_potion.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'key_gold', 'assets/sprites/items/key_gold.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'key_silver', 'assets/sprites/items/key_silver.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'chest_closed', 'assets/sprites/items/chest_closed.png'),
            loadAssetWithFallback(this.engine.loadSprite.bind(this.engine), 'chest_open', 'assets/sprites/items/chest_open.png')
        ];
        
        // Load audio assets if audio manager is available
        let audioPromises = [];
        if (this.audio) {
            // Helper function to load audio with error handling
            const loadAudioWithFallback = async (loadFunction, name, path) => {
                try {
                    await loadFunction(name, path);
                } catch (error) {
                    console.warn(`Failed to load audio: ${path}`, error);
                }
                
                // Update progress regardless of success or failure
                updateProgress();
            };
            
            // Load sound effects
            audioPromises = [
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'sword_swing', 'assets/audio/sfx/sword_swing.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'door_open', 'assets/audio/sfx/door-creaking.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'chest_open', 'assets/audio/sfx/chest_open.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'enemy_hit', 'assets/audio/sfx/enemy_hit.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'enemy_death', 'assets/audio/sfx/enemy_death.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'enemy_growl', 'assets/audio/sfx/enemy_growl.mp3'),
                
                // Load atmospheric sound effects
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'door-creaking', 'assets/audio/sfx/door-creaking.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'dripping', 'assets/audio/sfx/dripping.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'droplets-in-cave-1', 'assets/audio/sfx/droplets-in-cave-1.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'monster-growl', 'assets/audio/sfx/monster-growl.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'rattling-keys', 'assets/audio/sfx/rattling-keys.mp3'),
                loadAudioWithFallback(this.audio.loadSound.bind(this.audio), 'steps', 'assets/audio/sfx/steps.mp3'),
                
                // Load background music
                loadAudioWithFallback(this.audio.loadMusic.bind(this.audio), 'background_ambiance', 'assets/audio/music/background_ambiance.mp3')
            ];
        }
        
        // Wait for all assets to load or fail
        await Promise.all([...texturePromises, ...depthTexturePromises, ...spritePromises, ...audioPromises]);
        
        console.log('All assets loaded or fallbacks created');
        
        // Start playing background music if available
        if (this.audio && this.audio.music['background_ambiance']) {
            console.log('Starting background ambiance music');
            this.audio.playMusic('background_ambiance', true, 3000);
            
            // Start the atmospheric sounds timer
            console.log('Starting atmospheric sounds timer');
            this.audio.startAtmosphericSoundsTimer();
        }
    }
    
    /**
     * Load a level
     * @param {number} levelNumber - Level number to load
     */
    async loadLevel(levelNumber) {
        try {
            // Fetch level data
            const response = await fetch(`assets/maps/level${levelNumber}.json`);
            const levelData = await response.json();
            
            // Set the map in the engine
            this.engine.setMap(levelData);
            
            // Initialize enemies
            this.initializeEnemies(levelData);
            
            // Update game state
            this.state.level = levelNumber;
            
            // Initialize explored map for minimap
            this.initializeExploredMap(levelData);
            
            return levelData;
        } catch (error) {
            console.error(`Failed to load level ${levelNumber}:`, error);
            
            // Fallback to a basic level if the level file is missing
            const fallbackLevel = this.createFallbackLevel();
            this.engine.setMap(fallbackLevel);
            this.initializeExploredMap(fallbackLevel);
            return fallbackLevel;
        }
    }
    
    /**
     * Initialize explored map for minimap
     * @param {object} levelData - Level data
     */
    initializeExploredMap(levelData) {
        // Create a 2D array to track explored areas
        this.state.exploredMap = Array(levelData.height).fill().map(() => 
            Array(levelData.width).fill(false)
        );
    }
    
    /**
     * Create a fallback level if level loading fails
     * @returns {object} - Fallback level data
     */
    createFallbackLevel() {
        return {
            width: 10,
            height: 10,
            layout: [
                ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W'],
                ['W', '.', '.', '.', '.', '.', '.', '.', '.', 'W'],
                ['W', '.', 'W', 'W', '.', '.', 'W', 'W', '.', 'W'],
                ['W', '.', 'W', '.', '.', '.', '.', 'W', '.', 'W'],
                ['W', '.', '.', '.', 'W', 'W', '.', '.', '.', 'W'],
                ['W', '.', '.', '.', 'W', 'W', '.', '.', '.', 'W'],
                ['W', '.', 'W', '.', '.', '.', '.', 'W', '.', 'W'],
                ['W', '.', 'W', 'W', '.', '.', 'W', 'W', '.', 'W'],
                ['W', '.', '.', '.', '.', '.', '.', '.', '.', 'W'],
                ['W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W', 'W']
            ],
            objects: {},
            playerStart: { x: 1, y: 1 }
        };
    }
    
    /**
     * Initialize enemies from level data
     * @param {object} levelData - Level data
     */
    initializeEnemies(levelData) {
        this.state.enemies = [];
        
        // Scan the level layout for enemy markers
        for (let y = 0; y < levelData.height; y++) {
            for (let x = 0; x < levelData.width; x++) {
                const cell = levelData.layout[y][x];
                
                // Check if the cell is an enemy
                if (cell === 'S' || cell === 'G' || cell === 'W' || cell === 'B') {
                    const objectData = levelData.objects[cell];
                    
                    if (objectData && objectData.type === 'enemy') {
                        // Create enemy object
                        const enemy = {
                            type: objectData.enemyType,
                            x: x + 0.5, // Center of the cell
                            y: y + 0.5, // Center of the cell
                            health: this.getEnemyHealth(objectData.enemyType),
                            damage: this.getEnemyDamage(objectData.enemyType),
                            speed: this.getEnemySpeed(objectData.enemyType),
                            state: 'idle',
                            lastAttack: 0,
                            lastGrowl: 0 // Initialize lastGrowl for enemy growling
                        };
                        
                        this.state.enemies.push(enemy);
                    }
                }
            }
        }
    }
    
    /**
     * Get enemy health based on type
     * @param {string} type - Enemy type
     * @returns {number} - Enemy health
     */
    getEnemyHealth(type) {
        switch (type) {
            case 'skeleton': return 50;
            case 'goblin': return 30;
            case 'wizard': return 40;
            case 'boss': return 200;
            default: return 50;
        }
    }
    
    /**
     * Get enemy damage based on type
     * @param {string} type - Enemy type
     * @returns {number} - Enemy damage
     */
    getEnemyDamage(type) {
        switch (type) {
            case 'skeleton': return 5; // Reduced from 10 to 5
            case 'goblin': return 3; // Reduced from 5 to 3
            case 'wizard': return 8; // Reduced from 15 to 8
            case 'boss': return 12; // Reduced from 25 to 12
            default: return 5; // Reduced from 10 to 5
        }
    }
    
    /**
     * Get enemy speed based on type
     * @param {string} type - Enemy type
     * @returns {number} - Enemy speed
     */
    getEnemySpeed(type) {
        switch (type) {
            case 'skeleton': return 0.02;
            case 'goblin': return 0.04;
            case 'wizard': return 0.01;
            case 'boss': return 0.015;
            default: return 0.02;
        }
    }
    
    /**
     * Update enemies
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    updateEnemies(deltaTime) {
        // Skip if no enemies
        if (this.state.enemies.length === 0) return;
        
        const now = performance.now();
        
        // Update each enemy
        for (let i = 0; i < this.state.enemies.length; i++) {
            const enemy = this.state.enemies[i];
            
            // Calculate distance to player
            const dx = this.engine.player.x - enemy.x;
            const dy = this.engine.player.y - enemy.y;
            const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
            
            // Debug enemy distance
            console.log(`Enemy ${i} (${enemy.type}) distance: ${distanceToPlayer.toFixed(2)}`);
            
            // Enemy behavior based on distance
            if (distanceToPlayer < 1.5) {
                // Enemy is close enough to attack
                if (now - enemy.lastAttack > 1000) { // Attack once per second
                    // Attack player
                    this.state.health -= enemy.damage;
                    console.log(`${enemy.type} attacks! Player health: ${this.state.health}/${this.state.maxHealth}`);
                    
                    // Update health bar
                    this.updateHealthBar();
                    
                    // Update last attack time
                    enemy.lastAttack = now;
                    
                    // Check if player is dead
                    if (this.state.health <= 0) {
                        this.gameOver();
                    }
                }
                
                // Play growl sound randomly when very close
                if (now - enemy.lastGrowl > 3000) { // At least 3 seconds between growls
                    // Random chance to growl (20% chance per second)
                    if (Math.random() < 0.2 * (deltaTime / 1000)) {
                        this.playSound('enemy_growl');
                        enemy.lastGrowl = now;
                    }
                }
            } else if (distanceToPlayer < 5) {
                // Enemy is close enough to chase player
                // Calculate direction to player
                const angle = Math.atan2(dy, dx);
                
                // Move towards player
                const moveSpeed = enemy.speed * deltaTime;
                const newX = enemy.x + Math.cos(angle) * moveSpeed;
                const newY = enemy.y + Math.sin(angle) * moveSpeed;
                
                // Check if new position is valid (not inside a wall)
                if (!this.engine.isWall(newX, enemy.y)) {
                    enemy.x = newX;
                }
                
                if (!this.engine.isWall(enemy.x, newY)) {
                    enemy.y = newY;
                }
            }
        }
    }
    
    /**
     * Bind event handlers
     */
    bindEvents() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Toggle inventory
            if (e.key.toLowerCase() === 'i') {
                this.toggleInventory();
            }
            
            // Interact with objects
            if (e.key.toLowerCase() === 'e') {
                this.interact();
            }
            
            // Attack
            if (e.key === ' ') {
                this.attack();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Mouse events for rotation
        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.mouse.locked = true;
                this.engine.rotatePlayer(e.movementX * 0.003);
            } else {
                this.mouse.locked = false;
            }
        });
        
        // Window events
        window.addEventListener('blur', () => {
            this.state.paused = true;
        });
        
        window.addEventListener('focus', () => {
            this.state.paused = false;
        });
        
        // Inventory toggle
        document.getElementById('inventory-toggle').addEventListener('click', () => {
            this.toggleInventory();
        });
    }
    
    /**
     * Toggle inventory visibility
     */
    toggleInventory() {
        this.inventoryElement.classList.toggle('hidden');
        this.state.paused = !this.inventoryElement.classList.contains('hidden');
        
        if (!this.inventoryElement.classList.contains('hidden')) {
            this.updateInventoryUI();
        }
    }
    
    /**
     * Update inventory UI
     */
    updateInventoryUI() {
        // Clear inventory slots
        this.inventorySlotsElement.innerHTML = '';
        
        // Add inventory items
        for (let i = 0; i < 15; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            if (i < this.state.inventory.length) {
                const item = this.state.inventory[i];
                slot.textContent = item.name;
                
                if (item.type === 'weapon' && item.name === this.state.currentWeapon) {
                    slot.classList.add('selected');
                }
                
                // Add click handler to use/equip item
                slot.addEventListener('click', () => {
                    this.useItem(i);
                });
            }
            
            this.inventorySlotsElement.appendChild(slot);
        }
    }
    
    /**
     * Use or equip an item
     * @param {number} index - Inventory index
     */
    useItem(index) {
        if (index >= this.state.inventory.length) return;
        
        const item = this.state.inventory[index];
        
        if (item.type === 'weapon') {
            // Equip weapon
            this.state.currentWeapon = item.name;
            this.updateInventoryUI();
        } else if (item.type === 'potion') {
            // Use potion
            if (item.effect === 'health') {
                this.state.health = Math.min(this.state.maxHealth, this.state.health + item.value);
                this.updateHealthBar();
                
                // Remove the potion from inventory
                this.state.inventory.splice(index, 1);
                this.updateInventoryUI();
            }
        } else if (item.type === 'key') {
            // Keys are used automatically when interacting with doors
        }
    }
    
    /**
     * Interact with objects in front of the player
     */
    interact() {
        const interactedObject = this.engine.interact();
        
        if (interactedObject) {
            if (interactedObject.type === 'door' && interactedObject.locked) {
                // Check if player has the key
                const keyIndex = this.state.inventory.findIndex(item => 
                    item.type === 'key' && item.keyType === interactedObject.keyType);
                
                if (keyIndex >= 0) {
                    // Unlock the door
                    interactedObject.locked = false;
                    interactedObject.open = true;
                    
                    // Remove the key from inventory
                    this.state.inventory.splice(keyIndex, 1);
                    this.updateInventoryUI();
                    
                    // Play sound
                    this.playSound('door_open');
                } else {
                    // Display message that door is locked
                    console.log('This door is locked. You need a key.');
                }
            } else if (interactedObject.type === 'chest' && !interactedObject.opened) {
                // Open chest and get loot
                interactedObject.opened = true;
                
                if (interactedObject.contains) {
                    // Add item to inventory
                    this.addItemToInventory(interactedObject.contains);
                    
                    // Play sound
                    this.playSound('chest_open');
                }
            }
        }
    }
    
    /**
     * Add an item to the player's inventory
     * @param {string} itemId - Item identifier
     */
    addItemToInventory(itemId) {
        let item;
        
        // Create item object based on ID
        if (itemId === 'health_potion') {
            item = { type: 'potion', effect: 'health', value: 25, name: 'Health Potion' };
        } else if (itemId === 'key_gold') {
            item = { type: 'key', keyType: 'gold', name: 'Gold Key' };
        } else if (itemId === 'key_silver') {
            item = { type: 'key', keyType: 'silver', name: 'Silver Key' };
        } else if (itemId === 'sword') {
            item = { type: 'weapon', damage: 15, name: 'Sword' };
        } else if (itemId === 'crossbow') {
            item = { type: 'weapon', damage: 10, range: 5, name: 'Crossbow' };
        }
        
        if (item) {
            this.state.inventory.push(item);
            this.updateInventoryUI();
        }
    }
    
    /**
     * Attack with the current weapon
     */
    attack() {
        // Get weapon data
        const weapon = this.getWeaponData(this.state.currentWeapon);
        
        if (!weapon) {
            console.log("No weapon equipped! Cannot attack.");
            return;
        }
        
        console.log(`Attacking with ${this.state.currentWeapon}! Range: ${weapon.range}, Damage: ${weapon.damage}`);
        
        // Play attack sound
        this.playSound(weapon.sound);
        
        // Check for enemies in range
        for (let i = 0; i < this.state.enemies.length; i++) {
            const enemy = this.state.enemies[i];
            
            // Calculate distance to enemy
            const dx = enemy.x - this.engine.player.x;
            const dy = enemy.y - this.engine.player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if enemy is in range
            if (distance <= weapon.range) {
                // Calculate angle to enemy
                const angle = Math.atan2(dy, dx);
                
                // Calculate angle difference
                let angleDiff = angle - this.engine.player.angle;
                
                // Normalize angle difference
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // Check if enemy is in front of player (within 45 degrees)
                if (Math.abs(angleDiff) <= Math.PI / 4) {
                    // Hit the enemy
                    enemy.health -= weapon.damage;
                    console.log(`Hit ${enemy.type} enemy! Dealt ${weapon.damage} damage. Enemy health: ${enemy.health}`);
                    
                    // Play hit sound
                    this.playSound('enemy_hit');
                    
                    // Check if enemy is dead
                    if (enemy.health <= 0) {
                        // Remove enemy
                        this.state.enemies.splice(i, 1);
                        i--;
                        
                        console.log(`${enemy.type} enemy defeated!`);
                        
                        // Play death sound
                        this.playSound('enemy_death');
                    }
                }
            }
        }
    }
    
    /**
     * Get weapon data
     * @param {string} weaponName - Weapon name
     * @returns {object|null} - Weapon data or null if not found
     */
    getWeaponData(weaponName) {
        switch (weaponName) {
            case 'sword':
                return { damage: 15, range: 1.5, sound: 'sword_swing' };
            case 'crossbow':
                return { damage: 10, range: 5, sound: 'crossbow_fire' };
            default:
                return null;
        }
    }
    
    /**
     * Play a sound
     * @param {string} soundName - Sound name
     */
    playSound(soundName) {
        console.log(`Playing sound: ${soundName}`);
        
        // Use audio manager if available
        if (this.audio) {
            try {
                this.audio.playSound(soundName);
            } catch (error) {
                console.warn(`Failed to play sound ${soundName}:`, error);
            }
        }
    }
    
    /**
     * Update health bar UI
     */
    updateHealthBar() {
        const healthPercent = (this.state.health / this.state.maxHealth) * 100;
        this.healthBar.style.width = `${healthPercent}%`;
        
        // Change color based on health
        if (healthPercent > 50) {
            this.healthBar.style.backgroundColor = '#f00';
        } else if (healthPercent > 25) {
            this.healthBar.style.backgroundColor = '#f80';
        } else {
            this.healthBar.style.backgroundColor = '#ff0';
        }
    }
    
    /**
     * Save game state to localStorage
     */
    saveGame() {
        const saveData = {
            health: this.state.health,
            inventory: this.state.inventory,
            currentWeapon: this.state.currentWeapon,
            level: this.state.level,
            playerX: this.engine.player.x,
            playerY: this.engine.player.y,
            playerAngle: this.engine.player.angle
        };
        
        localStorage.setItem('dungeonAdventureSave', JSON.stringify(saveData));
    }
    
    /**
     * Load game state from localStorage
     */
    loadGame() {
        const saveData = localStorage.getItem('dungeonAdventureSave');
        
        if (saveData) {
            try {
                const data = JSON.parse(saveData);
                
                // Restore game state
                this.state.health = data.health || this.state.health;
                this.state.inventory = data.inventory || this.state.inventory;
                this.state.currentWeapon = data.currentWeapon || this.state.currentWeapon;
                
                // Load the correct level if different
                if (data.level && data.level !== this.state.level) {
                    this.loadLevel(data.level);
                }
                
                // Restore player position
                if (data.playerX !== undefined && data.playerY !== undefined) {
                    this.engine.player.x = data.playerX;
                    this.engine.player.y = data.playerY;
                }
                
                if (data.playerAngle !== undefined) {
                    this.engine.player.angle = data.playerAngle;
                }
                
                // Update UI
                this.updateHealthBar();
                this.updateInventoryUI();
            } catch (error) {
                console.error('Failed to load saved game:', error);
            }
        }
    }
    
    /**
     * Handle player input
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    handleInput(deltaTime) {
        // Movement speed based on delta time
        const moveSpeed = this.engine.player.speed * deltaTime;
        
        // Forward/backward movement
        if (this.keys['w'] || this.keys['arrowup']) {
            this.engine.movePlayer(moveSpeed);
        }
        if (this.keys['s'] || this.keys['arrowdown']) {
            this.engine.movePlayer(-moveSpeed);
        }
        
        // Strafe left/right
        if (this.keys['a'] || this.keys['arrowleft']) {
            this.engine.strafePlayer(-moveSpeed);
        }
        if (this.keys['d'] || this.keys['arrowright']) {
            this.engine.strafePlayer(moveSpeed);
        }
        
        // Rotation (if not using mouse)
        if (!this.mouse.locked) {
            if (this.keys['q']) {
                this.engine.rotatePlayer(-0.05);
            }
            if (this.keys['e']) {
                this.engine.rotatePlayer(0.05);
            }
        }
    }
    
    /**
     * Display an error message to the user
     * @param {string} message - Error message to display
     */
    showError(message) {
        console.error(message);
        
        // Create error element if it doesn't exist
        let errorElement = document.getElementById('error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.id = 'error-message';
            errorElement.style.position = 'absolute';
            errorElement.style.top = '50%';
            errorElement.style.left = '50%';
            errorElement.style.transform = 'translate(-50%, -50%)';
            errorElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            errorElement.style.color = '#f00';
            errorElement.style.padding = '20px';
            errorElement.style.borderRadius = '5px';
            errorElement.style.zIndex = '1000';
            errorElement.style.maxWidth = '80%';
            errorElement.style.textAlign = 'center';
            document.body.appendChild(errorElement);
        }
        
        // Set error message
        errorElement.innerHTML = `
            <h2>Error</h2>
            <p>${message}</p>
            <p>Click anywhere to continue anyway.</p>
        `;
        
        // Add click handler to dismiss error
        const clickHandler = () => {
            errorElement.style.display = 'none';
            document.removeEventListener('click', clickHandler);
        };
        document.addEventListener('click', clickHandler);
    }
    
    /**
     * Game over handler
     */
    gameOver() {
        this.state.gameOver = true;
        
        // Show game over message
        const gameOverElement = document.createElement('div');
        gameOverElement.className = 'game-over';
        gameOverElement.innerHTML = `
            <h2>Game Over</h2>
            <p>You have been defeated!</p>
            <button id="restart-button">Restart Game</button>
        `;
        
        document.body.appendChild(gameOverElement);
        
        // Add restart button handler
        document.getElementById('restart-button').addEventListener('click', () => {
            // Remove game over message
            document.body.removeChild(gameOverElement);
            
            // Reset game state
            this.state.health = this.state.maxHealth;
            this.state.gameOver = false;
            
            // Reload the current level
            this.loadLevel(this.state.level);
            
            // Update UI
            this.updateHealthBar();
        });
    }
}
