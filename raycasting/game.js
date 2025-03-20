/**
 * Main Game Logic for Dungeon Adventure Game
 * Handles input, game state, and mechanics
 */

class DungeonGame {
    constructor() {
        // Initialize canvas
        this.canvas = document.getElementById('game-canvas');
        
        // Initialize raycasting engine
        this.engine = new RaycastingEngine(this.canvas);
        
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
            loading: true
        };
        
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
            // Load assets
            await this.loadAssets();
            
            // Load the first level
            await this.loadLevel(1);
            
            // Hide loading screen
            this.state.loading = false;
            this.loadingScreen.style.display = 'none';
            
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
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }
    
    /**
     * Load game assets
     */
    async loadAssets() {
        const totalAssets = 10; // Update this number based on actual assets
        let loadedAssets = 0;
        
        const updateProgress = () => {
            loadedAssets++;
            const progress = (loadedAssets / totalAssets) * 100;
            this.progressBar.style.width = `${progress}%`;
        };
        
        // Load textures
        const texturePromises = [
            this.engine.loadTexture('stone_wall', 'assets/textures/stone_wall.png').then(updateProgress),
            this.engine.loadTexture('brick_wall', 'assets/textures/brick_wall.png').then(updateProgress),
            this.engine.loadTexture('wood_wall', 'assets/textures/wood_wall.png').then(updateProgress),
            this.engine.loadTexture('door_closed', 'assets/textures/door_closed.png').then(updateProgress),
            this.engine.loadTexture('door_open', 'assets/textures/door_open.png').then(updateProgress)
        ];
        
        // Load sprites
        const spritePromises = [
            this.engine.loadSprite('player_hand', 'assets/sprites/player_hand.png').then(updateProgress),
            this.engine.loadSprite('skeleton_idle', 'assets/sprites/skeleton_idle.png').then(updateProgress),
            this.engine.loadSprite('health_potion', 'assets/sprites/health_potion.png').then(updateProgress),
            this.engine.loadSprite('key_gold', 'assets/sprites/key_gold.png').then(updateProgress),
            this.engine.loadSprite('chest_closed', 'assets/sprites/chest_closed.png').then(updateProgress)
        ];
        
        // Wait for all assets to load
        await Promise.all([...texturePromises, ...spritePromises]);
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
            
            return levelData;
        } catch (error) {
            console.error(`Failed to load level ${levelNumber}:`, error);
            
            // Fallback to a basic level if the level file is missing
            const fallbackLevel = this.createFallbackLevel();
            this.engine.setMap(fallbackLevel);
            return fallbackLevel;
        }
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
                            lastAttack: 0
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
            case 'skeleton': return 10;
            case 'goblin': return 5;
            case 'wizard': return 15;
            case 'boss': return 25;
            default: return 10;
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
        
        // Mouse events
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
        
        if (!weapon) return;
        
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
                    
                    // Play hit sound
                    this.playSound('enemy_hit');
                    
                    // Check if enemy is dead
                    if (enemy.health <= 0) {
                        // Remove enemy
                        this.state.enemies.splice(i, 1);
                        i--;
                        
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
        // In a real implementation, this would play the sound
        console.log(`Playing sound: ${soundName}`);
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
     * Show an error message
     * @param {string} message - Error message
     */
    showError(message) {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        document.body.appendChild(errorElement);
    }
    
    /**
     * Handle player input
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    handleInput(deltaTime) {
        if (this.state.paused) return;
        
        // Movement
        if (this.keys['w']) {
            this.engine.movePlayer(1);
        }
        
        if (this.keys['s']) {
            this.engine.movePlayer(-1);
        }
        
        if (this.keys['a']) {
            this.engine.strafePlayer(-1);
        }
        
        if (this.keys['d']) {
            this.engine.strafePlayer(1);
        }
        
        // Rotation with arrow keys (alternative to mouse)
        if (this.keys['arrowleft']) {
            this.engine.rotatePlayer(-1);
        }
        
        if (this.keys['arrowright']) {
            this.engine.rotatePlayer(1);
        }
    }
    
    /**
     * Update enemy positions and states
     * @param {number} deltaTime - Time since last frame in milliseconds
     */
    updateEnemies(deltaTime) {
        for (const enemy of this.state.enemies) {
            // Calculate distance to player
            const dx = this.engine.player.x - enemy.x;
            const dy = this.engine.player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Update enemy state based on distance
            if (distance < 5) {
                // Enemy is close to player
                if (distance < 1.5 && performance.now() - enemy.lastAttack > 1000) {
                    // Attack player
                    enemy.state = 'attack';
                    enemy.lastAttack = performance.now();
                    
                    // Damage player
                    this.state.health -= enemy.damage;
                    this.updateHealthBar();
                    
                    // Check if player is dead
                    if (this.state.health <= 0) {
                        this.gameOver();
                    }
                } else {
                    // Move towards player
                    enemy.state = 'chase';
                    
                    // Calculate movement direction
                    const angle = Math.atan2(dy, dx);
                    const newX = enemy.x + Math.cos(angle) * enemy.speed * deltaTime;
                    const newY = enemy.y + Math.sin(angle) * enemy.speed * deltaTime;
                    
                    // Check for collisions
                    if (!this.engine.isWall(newX, enemy.y)) {
                        enemy.x = newX;
                    }
                    
                    if (!this.engine.isWall(enemy.x, newY)) {
                        enemy.y = newY;
                    }
                }
            } else {
                // Enemy is far from player
                enemy.state = 'idle';
            }
        }
    }
    
    /**
     * Game over
     */
    gameOver() {
        this.state.gameOver = true;
        this.state.paused = true;
        
        // Show game over screen
        const gameOverElement = document.createElement('div');
        gameOverElement.className = 'game-over';
        gameOverElement.innerHTML = `
            <h1>Game Over</h1>
            <p>You died in the dungeon.</p>
            <button id="restart-button">Restart</button>
        `;
        document.body.appendChild(gameOverElement);
        
        // Add restart button handler
        document.getElementById('restart-button').addEventListener('click', () => {
            // Remove game over screen
            document.body.removeChild(gameOverElement);
            
            // Reset game state
            this.state.health = this.state.maxHealth;
            this.state.gameOver = false;
            this.state.paused = false;
            
            // Reload the current level
            this.loadLevel(this.state.level);
            
            // Update UI
            this.updateHealthBar();
        });
    }
    
    /**
     * Main game loop
     * @param {number} timestamp - Current timestamp
     */
    gameLoop(timestamp) {
        // Calculate delta time
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Handle input
        this.handleInput(deltaTime);
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Render the scene
        this.engine.render();
        
        // Save game periodically (every 10 seconds)
        if (Math.floor(timestamp / 10000) > Math.floor(this.lastTime / 10000)) {
            this.saveGame();
        }
        
        // Continue the game loop
        requestAnimationFrame(this.gameLoop.bind(this));
    }
}

// Start the game when the page is loaded
window.addEventListener('load', () => {
    window.game = new DungeonGame();
});
