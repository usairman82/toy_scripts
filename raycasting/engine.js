/**
 * Raycasting Engine for Dungeon Adventure Game
 * Handles 3D rendering of a 2D grid-based map using raycasting techniques
 */

console.log("Engine.js loaded - Script execution started");

class RaycastingEngine {
    constructor(canvas, fov = 75) {
        console.log("RaycastingEngine constructor called");
        this.canvas = canvas;
        // Set willReadFrequently to true for better performance with getImageData
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.fov = fov * (Math.PI / 180); // Convert to radians
        this.textures = {};
        this.sprites = {};
        this.textureData = {}; // Cache for processed texture data
        this.map = null;
        this.player = {
            x: 0,
            y: 0,
            angle: 0,
            speed: 0.03,
            rotationSpeed: 0.05
        };
        
        // Animation state
        this.animationState = {
            walking: false,
            attacking: false,
            handOffset: 0,
            lastStep: 0,
            attackFrame: 0,
            lastAttack: 0
        };
        
        // Constants
        this.CELL_SIZE = 1; // Size of each cell in the grid
        this.WALL_HEIGHT = 1; // Height of walls
        this.MAX_DISTANCE = 20; // Maximum rendering distance
        
        // Create a single reusable offscreen canvas for texture processing
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = 64;
        this.offscreenCanvas.height = 64;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
        
        // Screen dimensions
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }
    
    /**
     * Resize the canvas to match the window size
     */
    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.halfHeight = this.canvas.height / 2;
        this.numRays = this.canvas.width;
        this.rayAngleStep = this.fov / this.numRays;
    }
    
    /**
     * Load a texture from a URL
     * @param {string} name - Texture identifier
     * @param {string} url - Texture URL
     * @returns {Promise} - Promise that resolves when the texture is loaded
     */
    loadTexture(name, url) {
        console.log(`Loading texture: ${name} from ${url}`);
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set a timeout to detect stalled loads
            const loadTimeout = setTimeout(() => {
                console.warn(`Texture load timeout for ${name} (${url})`);
                reject(new Error(`Texture load timeout: ${url}`));
            }, 5000); // 5 second timeout
            
            img.onload = () => {
                clearTimeout(loadTimeout);
                console.log(`Texture loaded successfully: ${name} (${img.width}x${img.height})`);
                this.textures[name] = img;
                
                // Pre-process the texture data for faster rendering
                this.processTextureData(name, img);
                
                resolve(img);
            };
            
            img.onerror = (error) => {
                clearTimeout(loadTimeout);
                console.warn(`Failed to load texture: ${url}`, error);
                reject(new Error(`Failed to load texture: ${url}`));
            };
            
            // Start loading the image
            img.src = url;
            
            // For some browsers, if the image is already cached, onload might not fire
            // This check helps handle that case
            if (img.complete) {
                clearTimeout(loadTimeout);
                console.log(`Texture already loaded (from cache): ${name}`);
                this.textures[name] = img;
                this.processTextureData(name, img);
                resolve(img);
            }
        });
    }
    
    /**
     * Process texture data for faster rendering
     * @param {string} name - Texture identifier
     * @param {Image} img - Texture image
     */
    processTextureData(name, img) {
        try {
            // Check if the image is fully loaded
            if (!img.complete || !img.naturalWidth) {
                console.warn(`Image ${name} not fully loaded, creating fallback`);
                this.createFallbackTextureData(name);
                return;
            }
            
            // Reset the offscreen canvas
            this.offscreenCanvas.width = img.width || 64;
            this.offscreenCanvas.height = img.height || 64;
            
            // Draw the texture to the offscreen canvas
            this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
            this.offscreenCtx.drawImage(img, 0, 0);
            
            try {
                // Get the image data for the entire texture
                const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
                
                // Store the processed data
                this.textureData[name] = {
                    width: this.offscreenCanvas.width,
                    height: this.offscreenCanvas.height,
                    data: imageData.data
                };
                
                console.log(`Successfully processed texture data for ${name}`);
            } catch (e) {
                console.error(`Error getting image data for ${name}:`, e);
                this.createFallbackTextureData(name);
            }
        } catch (e) {
            console.warn(`Failed to process texture data for ${name}:`, e);
            // Create a fallback texture
            this.createFallbackTextureData(name);
        }
    }
    
    /**
     * Create fallback texture data
     * @param {string} name - Texture identifier
     */
    createFallbackTextureData(name) {
        // Create a simple colored texture as fallback
        this.offscreenCanvas.width = 64;
        this.offscreenCanvas.height = 64;
        
        // Use different colors for different texture types
        let color;
        if (name.includes('wall')) {
            color = '#555';
        } else if (name.includes('door')) {
            color = '#8b4513';
        } else {
            color = '#888';
        }
        
        this.offscreenCtx.fillStyle = color;
        this.offscreenCtx.fillRect(0, 0, 64, 64);
        
        // Add a warning text
        this.offscreenCtx.fillStyle = '#fff';
        this.offscreenCtx.font = '10px Arial';
        this.offscreenCtx.textAlign = 'center';
        this.offscreenCtx.fillText('Missing', 32, 30);
        this.offscreenCtx.fillText('Texture', 32, 42);
        
        // Get the image data
        const imageData = this.offscreenCtx.getImageData(0, 0, 64, 64);
        
        // Store the processed data
        this.textureData[name] = {
            width: 64,
            height: 64,
            data: imageData.data
        };
    }
    
    /**
     * Load a sprite from a URL
     * @param {string} name - Sprite identifier
     * @param {string} url - Sprite URL
     * @returns {Promise} - Promise that resolves when the sprite is loaded
     */
    loadSprite(name, url) {
        console.log(`Loading sprite: ${name} from ${url}`);
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            // Set a timeout to detect stalled loads
            const loadTimeout = setTimeout(() => {
                console.warn(`Sprite load timeout for ${name} (${url})`);
                reject(new Error(`Sprite load timeout: ${url}`));
            }, 5000); // 5 second timeout
            
            img.onload = () => {
                clearTimeout(loadTimeout);
                console.log(`Sprite loaded successfully: ${name} (${img.width}x${img.height})`);
                this.sprites[name] = img;
                resolve(img);
            };
            
            img.onerror = (error) => {
                clearTimeout(loadTimeout);
                console.warn(`Failed to load sprite: ${url}`, error);
                reject(new Error(`Failed to load sprite: ${url}`));
            };
            
            // Start loading the image
            img.src = url;
            
            // For some browsers, if the image is already cached, onload might not fire
            // This check helps handle that case
            if (img.complete) {
                clearTimeout(loadTimeout);
                console.log(`Sprite already loaded (from cache): ${name}`);
                this.sprites[name] = img;
                resolve(img);
            }
        });
    }
    
    
    /**
     * Render the player's hand and weapon
     */
    renderPlayerHand() {
        // Get the hand sprite
        const handSprite = this.sprites['player_hand'];
        if (!handSprite) return;
        
        // Get current time for animations
        const now = performance.now();
        
        // Calculate hand position and size
        const handWidth = this.canvas.width * 0.4;
        const handHeight = handWidth * (handSprite.height / handSprite.width);
        const handX = this.canvas.width - handWidth;
        let handY = this.canvas.height - handHeight;
        
        // Check if player is moving (walking animation)
        const isMoving = window.gameInstance && (
            window.gameInstance.keys['w'] || 
            window.gameInstance.keys['a'] || 
            window.gameInstance.keys['s'] || 
            window.gameInstance.keys['d'] ||
            window.gameInstance.keys['arrowup'] ||
            window.gameInstance.keys['arrowleft'] ||
            window.gameInstance.keys['arrowdown'] ||
            window.gameInstance.keys['arrowright']
        );
        
        // Check if player is attacking
        const isAttacking = window.gameInstance && window.gameInstance.isAttacking;
        
        // Update animation state
        if (isMoving && !isAttacking) {
            // Walking animation
            this.animationState.walking = true;
            
            // Bobbing effect for walking
            const walkCycleSpeed = 400; // ms per cycle
            const bobAmount = 10; // pixels
            this.animationState.handOffset = Math.sin((now % walkCycleSpeed) / walkCycleSpeed * Math.PI * 2) * bobAmount;
            
            // Play footstep sound occasionally
            if (now - this.animationState.lastStep > 400) { // Every 400ms
                if (window.gameInstance && window.gameInstance.audio) {
                    window.gameInstance.audio.playSound('steps', 0.3);
                }
                this.animationState.lastStep = now;
            }
        } else if (isAttacking) {
            // Attack animation
            this.animationState.walking = false;
            this.animationState.attacking = true;
            
            // Attack animation timing
            const attackDuration = 500; // ms
            const attackProgress = Math.min(1, (now - window.gameInstance.attackStartTime) / attackDuration);
            
            // Attack animation curve (horizontal swing motion)
            if (attackProgress < 0.5) {
                // Swing right to left
                this.animationState.handOffset = 0; // Maintain vertical position
                // Apply horizontal swing transformation when drawing the hand
                handX += 30 * Math.sin(attackProgress * Math.PI); // Horizontal swing motion
                handY -= 10 * Math.sin(attackProgress * Math.PI); // Slight upward arc
            } else {
                // Return to original position
                this.animationState.handOffset = 0;
                handX += 30 * Math.sin(attackProgress * Math.PI); // Continue horizontal motion
                handY -= 10 * Math.sin(attackProgress * Math.PI); // Continue arc
            }
            
            // Reset attack state when animation completes
            if (attackProgress >= 1) {
                this.animationState.attacking = false;
            }
        } else {
            // Idle animation - slight breathing movement
            this.animationState.walking = false;
            this.animationState.attacking = false;
            const breathCycleSpeed = 3000; // ms per breath
            const breathAmount = 3; // pixels
            this.animationState.handOffset = Math.sin((now % breathCycleSpeed) / breathCycleSpeed * Math.PI * 2) * breathAmount;
        }
        
        // Apply animation offset to hand position
        handY += this.animationState.handOffset;
        
        // Draw the hand with animation
        this.ctx.drawImage(handSprite, handX, handY, handWidth, handHeight);
        
        // Only render the crossbow if it's the current weapon
        if (window.gameInstance && window.gameInstance.state.currentWeapon === 'crossbow') {
            // Get the weapon sprite
            const weaponSprite = this.sprites['crossbow'];
            if (!weaponSprite) return;
            
            // Calculate weapon position and size
            const weaponWidth = this.canvas.width * 0.3;
            const weaponHeight = weaponWidth * (weaponSprite.height / weaponSprite.width);
            const weaponX = this.canvas.width / 2 - weaponWidth / 2;
            const weaponY = this.canvas.height - weaponHeight + this.animationState.handOffset;
            
            // Draw the weapon
            this.ctx.drawImage(weaponSprite, weaponX, weaponY, weaponWidth, weaponHeight);
        }
    }
    
    
    /**
     * Check if a position is inside a wall
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if the position is inside a wall
     */
    isWall(x, y) {
        // Check for NaN values which can cause teleporting
        if (isNaN(x) || isNaN(y) || x === undefined || y === undefined) {
            console.warn("Invalid position check: x or y is NaN or undefined");
            return true; // Treat as wall to prevent movement
        }
        
        // Check if map is valid
        if (!this.map) {
            console.warn("Map is not loaded, treating all positions as walls");
            return true;
        }
        
        const mapX = Math.floor(x / this.CELL_SIZE);
        const mapY = Math.floor(y / this.CELL_SIZE);
        
        // Check bounds
        if (mapX < 0 || mapX >= this.map.width || mapY < 0 || mapY >= this.map.height) {
            return true; // Out of bounds is considered a wall
        }
        
        // Check if layout is valid
        if (!this.map.layout || !Array.isArray(this.map.layout) || !this.map.layout[mapY]) {
            console.warn("Map layout is invalid when checking position", x, y);
            return true; // Treat as wall to prevent movement
        }
        
        const cell = this.map.layout[mapY][mapX];
        
        // If cell is undefined or null, treat as a wall
        if (cell === undefined || cell === null) {
            console.warn(`Invalid cell at position (${mapX}, ${mapY})`);
            return true;
        }
        
        // If it's a door, check if it's open
        if (cell === 'D') {
            // Get the door object from the map objects
            const doorObj = this.map.objects && this.map.objects['D'];
            
            // Door is a wall if it exists and is not open
            if (doorObj && !doorObj.open) {
                return true;
            }
            
            // Door is not a wall if it's open or doesn't exist
            return false;
        }
        
        return cell === 'W';
    }
    
    /**
     * Get the texture for a wall at the given position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} - Texture name
     */
    getWallTexture(x, y) {
        const mapX = Math.floor(x / this.CELL_SIZE);
        const mapY = Math.floor(y / this.CELL_SIZE);
        
        if (mapX < 0 || mapX >= this.map.width || mapY < 0 || mapY >= this.map.height) {
            return 'stone_wall'; // Default texture for out of bounds
        }
        
        const cell = this.map.layout[mapY][mapX];
        
        // Check if this is a secret wall
        const isSecretWall = this.isSecretWall(mapX, mapY);
        
        if (cell === 'W') {
            // If it's a secret wall
            if (isSecretWall) {
                // If debug mode is enabled, create a red-tinted version of the secret wall texture
                if (window.gameInstance && window.gameInstance.debug.enabled) {
                    // Create a red-tinted version of the secret wall texture if it doesn't exist
                    const redSecretTextureName = 'secret_wall_red';
                    if (!this.textures[redSecretTextureName]) {
                        this.createRedTintedTexture('secret_wall', redSecretTextureName);
                    }
                    return redSecretTextureName;
                }
                return 'secret_wall';
            }
            return 'stone_wall';
        } else if (cell === 'D') {
            // If it's a door and it's a secret door (rare case but possible)
            if (isSecretWall) {
                // If debug mode is enabled, create a red-tinted version of the door texture
                if (window.gameInstance && window.gameInstance.debug.enabled) {
                    const doorTexture = this.map.objects[cell]?.open ? 'door_open' : 'door_closed';
                    const redDoorTextureName = doorTexture + '_red';
                    if (!this.textures[redDoorTextureName]) {
                        this.createRedTintedTexture(doorTexture, redDoorTextureName);
                    }
                    return redDoorTextureName;
                }
            }
            return this.map.objects[cell]?.open ? 'door_open' : 'door_closed';
        }
        
        return 'stone_wall'; // Default texture
    }
    
    /**
     * Render sprites (enemies, items, etc.)
     * @param {Array} zBuffer - Array of wall distances for depth testing
     * @param {Array} sprites - Array of sprites to render
     */
    renderSprites(zBuffer, sprites) {
        // Get chest objects from the map
        const chestObjects = [];
        if (this.map && this.map.layout) {
            for (let y = 0; y < this.map.height; y++) {
                for (let x = 0; x < this.map.width; x++) {
                    const cell = this.map.layout[y][x];
                    if (cell === 'C' || cell === 'P') { // Chest markers from level data
                        const chestData = this.map.objects[cell];
                        if (chestData && chestData.type === 'chest') {
                            // Create a sprite-like object for the chest
                            chestObjects.push({
                                x: x + 0.5, // Center of the cell
                                y: y + 0.5, // Center of the cell
                                texture: chestData.opened ? 'chest_open' : 'chest_closed'
                            });
                        }
                    }
                }
            }
        }
        
        // Combine enemy sprites and chest objects
        const allSprites = [...sprites, ...chestObjects];
        
        // Sort sprites by distance (furthest first for proper rendering)
        const sortedSprites = [...allSprites].sort((a, b) => {
            const distA = Math.pow(this.player.x - a.x, 2) + Math.pow(this.player.y - a.y, 2);
            const distB = Math.pow(this.player.x - b.x, 2) + Math.pow(this.player.y - b.y, 2);
            return distB - distA;
        });
        
        // Render each sprite
        for (const sprite of sortedSprites) {
            // Calculate sprite position relative to the player
            const spriteX = sprite.x - this.player.x;
            const spriteY = sprite.y - this.player.y;
            
            // Transform sprite with the inverse camera matrix
            const invDet = 1.0 / (Math.cos(this.player.angle) * Math.sin(this.player.angle + Math.PI / 2) - 
                                 Math.sin(this.player.angle) * Math.cos(this.player.angle + Math.PI / 2));
            
            const transformX = invDet * (Math.sin(this.player.angle + Math.PI / 2) * spriteX - Math.cos(this.player.angle + Math.PI / 2) * spriteY);
            const transformY = invDet * (-Math.sin(this.player.angle) * spriteX + Math.cos(this.player.angle) * spriteY);
            
            // Calculate sprite screen position
            const spriteScreenX = Math.floor((this.canvas.width / 2) * (1 + transformX / transformY));
            
            // Calculate sprite height and width on screen
            const spriteHeight = Math.abs(Math.floor(this.canvas.height / transformY));
            const spriteWidth = spriteHeight; // Assuming square sprites
            
            // Calculate drawing boundaries
            const drawStartY = Math.floor(this.halfHeight - spriteHeight / 2);
            const drawEndY = Math.floor(this.halfHeight + spriteHeight / 2);
            const drawStartX = Math.floor(spriteScreenX - spriteWidth / 2);
            const drawEndX = Math.floor(spriteScreenX + spriteWidth / 2);
            
            // Get the sprite texture
            const spriteTexture = this.sprites[sprite.texture];
            
            // Only render if the sprite is in front of the camera and on screen
            if (transformY > 0 && spriteScreenX > 0 && spriteScreenX < this.canvas.width) {
                // Draw the sprite
                for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
                    // Check if the stripe is visible and in front of walls
                    if (stripe >= 0 && stripe < this.canvas.width && transformY < zBuffer[stripe]) {
                        // Calculate texture X coordinate
                        const texX = Math.floor(256 * (stripe - drawStartX) / spriteWidth) / 256 * (spriteTexture ? spriteTexture.width : 64);
                        
                        // Draw the sprite stripe
                        if (spriteTexture) {
                            this.ctx.drawImage(
                                spriteTexture,
                                texX, 0, 1, spriteTexture.height,
                                stripe, drawStartY, 1, drawEndY - drawStartY
                            );
                        } else {
                            // Fallback if texture is missing
                            this.ctx.fillStyle = '#f00';
                            this.ctx.fillRect(stripe, drawStartY, 1, drawEndY - drawStartY);
                        }
                    }
                }
            }
        }
    }
            
            // Put the modified image data back
            this.offscreenCtx.putImageData(imageData, 0, 0);
            
            // Create a new image from the canvas
            const img = new Image();
            img.src = this.offscreenCanvas.toDataURL();
            
            // Store the texture
            this.textures[targetTextureName] = img;
            
            // Process the texture data
            this.processTextureData(targetTextureName, img);
            
            console.log(`Created red-tinted texture: ${targetTextureName} from ${sourceTextureName}`);
        } catch (e) {
            console.error(`Error creating red-tinted texture: ${e.message}`);
        }
    }
    
    /**
     * Create a red texture for debug mode (legacy method, kept for compatibility)
     */
    createRedTexture() {
        // Create a red texture for debug mode
        this.offscreenCanvas.width = 64;
        this.offscreenCanvas.height = 64;
        
        // Fill with red color
        this.offscreenCtx.fillStyle = '#ff0000';
        this.offscreenCtx.fillRect(0, 0, 64, 64);
        
        // Add some texture to make it more visible
        this.offscreenCtx.fillStyle = '#ff3333';
        for (let y = 0; y < 64; y += 8) {
            for (let x = 0; x < 64; x += 8) {
                if ((x + y) % 16 === 0) {
                    this.offscreenCtx.fillRect(x, y, 4, 4);
                }
            }
        }
        
        // Create an image from the canvas
        const img = new Image();
        img.src = this.offscreenCanvas.toDataURL();
        
        // Store the texture
        this.textures['debug_red'] = img;
        
        // Process the texture data
        this.processTextureData('debug_red', img);
    }
    
    /**
     * Cast a single ray and calculate the distance to the nearest wall
     * @param {number} angle - Angle of the ray
     * @returns {object} - Information about the ray hit
     */
    castRay(angle) {
        // Normalize angle
        angle = angle % (2 * Math.PI);
        if (angle < 0) angle += 2 * Math.PI;
        
        const rayDirX = Math.cos(angle);
        const rayDirY = Math.sin(angle);
        
        // Player's position in the grid
        const mapX = Math.floor(this.player.x / this.CELL_SIZE);
        const mapY = Math.floor(this.player.y / this.CELL_SIZE);
        
        // Length of ray from current position to next x or y-side
        let sideDistX, sideDistY;
        
        // Length of ray from one x or y-side to next x or y-side
        const deltaDistX = Math.abs(1 / rayDirX);
        const deltaDistY = Math.abs(1 / rayDirY);
        
        // Direction to step in x or y direction (either +1 or -1)
        const stepX = rayDirX >= 0 ? 1 : -1;
        const stepY = rayDirY >= 0 ? 1 : -1;
        
        // Calculate distance to first x and y intersection
        if (rayDirX < 0) {
            sideDistX = (this.player.x - mapX * this.CELL_SIZE) * deltaDistX;
        } else {
            sideDistX = ((mapX + 1) * this.CELL_SIZE - this.player.x) * deltaDistX;
        }
        
        if (rayDirY < 0) {
            sideDistY = (this.player.y - mapY * this.CELL_SIZE) * deltaDistY;
        } else {
            sideDistY = ((mapY + 1) * this.CELL_SIZE - this.player.y) * deltaDistY;
        }
        
        // Perform DDA (Digital Differential Analysis)
        let hit = false;
        let side = 0; // 0 for x-side, 1 for y-side
        let currentMapX = mapX;
        let currentMapY = mapY;
        
        while (!hit && (Math.abs(currentMapX - mapX) < this.MAX_DISTANCE || Math.abs(currentMapY - mapY) < this.MAX_DISTANCE)) {
            // Jump to next map square
            if (sideDistX < sideDistY) {
                sideDistX += deltaDistX;
                currentMapX += stepX;
                side = 0;
            } else {
                sideDistY += deltaDistY;
                currentMapY += stepY;
                side = 1;
            }
            
            // Check if ray has hit a wall
            if (currentMapX < 0 || currentMapX >= this.map.width || currentMapY < 0 || currentMapY >= this.map.height) {
                hit = true; // Hit the boundary of the map
            } else {
                const cell = this.map.layout[currentMapY][currentMapX];
                if (cell === 'W' || (cell === 'D' && !this.map.objects[cell]?.open)) {
                    hit = true;
                }
            }
        }
        
        // Calculate distance projected on camera direction
        let perpWallDist;
        let wallX;
        
        if (side === 0) {
            perpWallDist = (currentMapX - this.player.x + (1 - stepX) / 2) / rayDirX;
            wallX = this.player.y + perpWallDist * rayDirY;
        } else {
            perpWallDist = (currentMapY - this.player.y + (1 - stepY) / 2) / rayDirY;
            wallX = this.player.x + perpWallDist * rayDirX;
        }
        
        // Normalize wallX to get texture coordinate
        wallX = wallX % this.CELL_SIZE;
        if (wallX < 0) wallX += this.CELL_SIZE;
        
        const textureX = Math.floor(wallX * 64); // Assuming 64x64 textures
        
        return {
            distance: perpWallDist,
            side,
            mapX: currentMapX,
            mapY: currentMapY,
            textureX,
            texture: this.getWallTexture(currentMapX * this.CELL_SIZE, currentMapY * this.CELL_SIZE)
        };
    }
    
    /**
     * Render the scene
     */
    render() {
        try {
            // Clear the canvas
            this.ctx.fillStyle = '#000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            if (!this.map) {
                console.warn("No map data available for rendering");
                return;
            }
            
            // Draw ceiling
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(0, 0, this.canvas.width, this.halfHeight);
            
            // Draw floor
            this.ctx.fillStyle = '#555';
            this.ctx.fillRect(0, this.halfHeight, this.canvas.width, this.halfHeight);
            
            // Array to store wall distances for sprite rendering
            const zBuffer = new Array(this.numRays).fill(Infinity);
            
            // Cast rays
            const startAngle = this.player.angle - this.fov / 2;
            
            // Check if debug mode is enabled to visualize raycasting
            const debugMode = window.gameInstance?.debug?.enabled || false;
            
            for (let i = 0; i < this.numRays; i++) {
                try {
                    const rayAngle = startAngle + i * this.rayAngleStep;
                    const rayResult = this.castRay(rayAngle);
                    
                    if (!rayResult) {
                        console.warn(`Ray ${i} returned no result`);
                        continue;
                    }
                    
                    // Store distance in z-buffer for sprite rendering
                    zBuffer[i] = rayResult.distance;
                    
                    // Calculate wall height
                    const lineHeight = Math.min(this.canvas.height, (this.CELL_SIZE * this.canvas.height) / rayResult.distance);
                    
                    // Calculate drawing start and end positions
                    const drawStart = this.halfHeight - lineHeight / 2;
                    
                    // Apply distance-based shading
                    const brightness = Math.min(1, 1 - rayResult.distance / this.MAX_DISTANCE);
                    
                    // Draw the wall slice
                    try {
                        const textureName = rayResult.texture;
                        
                        if (this.textureData[textureName]) {
                            // Use pre-processed texture data for rendering
                            this.drawTexturedWallSlice(
                                i, drawStart, lineHeight, 
                                brightness, rayResult.side, 
                                textureName, rayResult.textureX
                            );
                        } else if (this.textures[textureName]) {
                            // If texture exists but data isn't processed yet, process it now
                            this.processTextureData(textureName, this.textures[textureName]);
                            this.drawTexturedWallSlice(
                                i, drawStart, lineHeight, 
                                brightness, rayResult.side, 
                                textureName, rayResult.textureX
                            );
                        } else {
                            // Fallback to solid color rendering if texture is missing
                            this.drawFallbackWallSlice(i, drawStart, lineHeight, brightness, rayResult.side);
                        }
                        
                        // If in debug mode, visualize this ray on the 2D map
                        if (debugMode && i % 20 === 0) { // Only draw every 20th ray for performance
                            this.visualizeRay(rayAngle, rayResult);
                        }
                    } catch (e) {
                        // Ultimate fallback if anything goes wrong
                        console.error(`Rendering error for ray ${i}:`, e);
                        this.drawFallbackWallSlice(i, drawStart, lineHeight, brightness, rayResult.side);
                    }
                } catch (rayError) {
                    console.error(`Error processing ray ${i}:`, rayError);
