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
            speed: 0.1,
            rotationSpeed: 0.05
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
     * Set the current map
     * @param {object} map - Map data
     */
    setMap(map) {
        this.map = map;
        if (map.playerStart) {
            this.player.x = map.playerStart.x * this.CELL_SIZE + this.CELL_SIZE / 2;
            this.player.y = map.playerStart.y * this.CELL_SIZE + this.CELL_SIZE / 2;
        }
        
        // Initialize depth textures
        this.initializeDepthTextures();
    }
    
    /**
     * Initialize depth textures for walls
     */
    initializeDepthTextures() {
        // Get configuration from window.gameConfig
        const config = window.gameConfig?.depthTextures || {
            enabled: true,
            density: 0.3,
            minDistance: 1.5,
            maxDistance: 15.0,
            randomSeed: 12345
        };
        
        // Store configuration
        this.depthTextureConfig = config;
        
        // Initialize wall sections with depth textures
        this.wallSectionsWithDepth = [];
        
        if (!this.map || !config.enabled) {
            return;
        }
        
        // Use a seeded random number generator for consistent results
        let seed = config.randomSeed || 12345;
        const random = () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        
        // Get all wall cells in the map
        const wallCells = [];
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.layout[y][x] === 'W') {
                    wallCells.push({ x, y });
                }
            }
        }
        
        // Get available depth texture names
        const depthTextureNames = Object.keys(this.textures).filter(name => 
            name === 'lit_torch' || 
            name === 'moss_patch' || 
            name === 'skull' || 
            name === 'small_alcove_with_candle'
        );
        
        if (depthTextureNames.length === 0) {
            console.warn("No depth textures available for placement");
            return;
        }
        
        // Determine how many depth textures to place based on density
        const numDepthTextures = Math.floor(wallCells.length * config.density);
        
        // Randomly place depth textures on walls
        for (let i = 0; i < numDepthTextures; i++) {
            // Pick a random wall cell
            const wallIndex = Math.floor(random() * wallCells.length);
            const wall = wallCells[wallIndex];
            
            // Pick a random depth texture
            const textureName = depthTextureNames[Math.floor(random() * depthTextureNames.length)];
            
            // Determine which side of the wall to place the texture on (0-3 for N, E, S, W)
            const side = Math.floor(random() * 4);
            
            // Random position along the wall (0.0 to 1.0)
            const position = random();
            
            // Random scale factor (0.5 to 1.5)
            const scale = 0.5 + random();
            
            // Add to wall sections with depth
            this.wallSectionsWithDepth.push({
                x: wall.x,
                y: wall.y,
                side,
                position,
                textureName,
                scale
            });
        }
        
        console.log(`Generated ${this.wallSectionsWithDepth.length} wall sections with depth textures`);
    }
    
    
    /**
     * Check if a position is inside a wall
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {boolean} - True if the position is inside a wall
     */
    isWall(x, y) {
        const mapX = Math.floor(x / this.CELL_SIZE);
        const mapY = Math.floor(y / this.CELL_SIZE);
        
        if (mapX < 0 || mapX >= this.map.width || mapY < 0 || mapY >= this.map.height) {
            return true; // Out of bounds is considered a wall
        }
        
        const cell = this.map.layout[mapY][mapX];
        
        // If it's a door, check if it's open
        if (cell === 'D') {
            // Get the door object from the map objects
            const doorObj = this.map.objects['D'];
            
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
     * Check if a wall is a secret wall
     * @param {number} mapX - X coordinate in the map
     * @param {number} mapY - Y coordinate in the map
     * @returns {boolean} - True if the wall is a secret wall
     */
    isSecretWall(mapX, mapY) {
        // Check if the cell is a wall
        if (mapX < 0 || mapX >= this.map.width || mapY < 0 || mapY >= this.map.height) {
            return false;
        }
        
        const cell = this.map.layout[mapY][mapX];
        
        if (cell !== 'W') {
            return false;
        }
        
        // Check if this wall has a secret door marker in the map objects
        // This is a simple implementation - in a real game, you might have a more complex way to identify secret walls
        // For now, we'll check if there's a 'secret' property in the map objects for this position
        const secretKey = `secret_${mapX}_${mapY}`;
        
        // Debug log to help diagnose secret wall detection - but only log occasionally to prevent console spam
        if (window.gameInstance && window.gameInstance.debug.enabled && Math.random() < 0.01) {
            console.log(`Checking for secret wall at (${mapX}, ${mapY}), key: ${secretKey}, exists: ${Boolean(this.map.objects && this.map.objects[secretKey])}`);
        }
        
        return this.map.objects && this.map.objects[secretKey];
    }
    
    /**
     * Create a red-tinted version of an existing texture
     * @param {string} sourceTextureName - Name of the source texture
     * @param {string} targetTextureName - Name for the new red-tinted texture
     */
    createRedTintedTexture(sourceTextureName, targetTextureName) {
        // Get the source texture
        const sourceTexture = this.textures[sourceTextureName];
        if (!sourceTexture) {
            console.warn(`Source texture ${sourceTextureName} not found for red tinting`);
            return;
        }
        
        // Set the offscreen canvas dimensions to match the source texture
        this.offscreenCanvas.width = sourceTexture.width || 64;
        this.offscreenCanvas.height = sourceTexture.height || 64;
        
        // Draw the source texture to the offscreen canvas
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        this.offscreenCtx.drawImage(sourceTexture, 0, 0);
        
        try {
            // Get the image data
            const imageData = this.offscreenCtx.getImageData(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
            const data = imageData.data;
            
            // Tint the image data red (increase red channel, decrease others)
            for (let i = 0; i < data.length; i += 4) {
                // Keep alpha channel as is
                if (data[i + 3] > 0) {
                    // Boost red channel
                    data[i] = Math.min(255, data[i] * 1.5);
                    // Reduce green and blue channels
                    data[i + 1] = Math.floor(data[i + 1] * 0.5);
                    data[i + 2] = Math.floor(data[i + 2] * 0.5);
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
                    // Continue with the next ray
                }
            }
            
            // Render sprites (enemies, items, etc.)
            if (window.gameInstance && window.gameInstance.state.enemies) {
                this.renderSprites(zBuffer, window.gameInstance.state.enemies);
            }
            
            // Render player's hand and weapon
            this.renderPlayerHand();
            
            // Draw debug information
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('Render frame complete', 10, this.canvas.height - 30);
            
            // Display depth texture information if enabled
            if (this.depthTextureConfig?.enabled) {
                this.ctx.fillText(`Depth textures: ${this.depthTexturesRendered || 0} rendered / ${this.wallSectionsWithDepth?.length || 0} total`, 
                    10, this.canvas.height - 10);
                
                // Reset the counter for the next frame
                this.depthTexturesRendered = 0;
            }
            
            // If in debug mode, render the debug map
            if (debugMode) {
                this.renderDebugMap();
            }
            
        } catch (e) {
            console.error('Critical rendering error:', e);
            
            // Draw a simple error message on the screen
            try {
                this.ctx.fillStyle = '#f00';
                this.ctx.font = '16px Arial';
                this.ctx.fillText('Rendering Error: ' + e.message, 20, 50);
            } catch (finalError) {
                console.error('Failed to display error message:', finalError);
            }
        }
    }
    
    /**
     * Draw a textured wall slice
     * @param {number} x - X coordinate on the screen
     * @param {number} drawStart - Y coordinate to start drawing
     * @param {number} lineHeight - Height of the wall slice
     * @param {number} brightness - Brightness factor (0-1)
     * @param {number} side - Wall side (0 for x-side, 1 for y-side)
     * @param {string} textureName - Name of the texture to use
     * @param {number} textureX - X coordinate in the texture
     */
    drawTexturedWallSlice(x, drawStart, lineHeight, brightness, side, textureName, textureX) {
        // Get the texture data
        const textureData = this.textureData[textureName];
        if (!textureData) return;
        
        // Apply side-dependent shading
        const shadeFactor = side === 1 ? 0.7 : 1.0;
        
        // Create an image data object for the wall slice
        const sliceHeight = Math.ceil(lineHeight);
        const imageData = this.ctx.createImageData(1, sliceHeight);
        const data = imageData.data;
        
        // Draw the wall slice pixel by pixel
        for (let y = 0; y < sliceHeight; y++) {
            // Calculate y coordinate in the texture
            const textureY = Math.floor((y / lineHeight) * textureData.height);
            
            // Get the pixel from the texture
            const texelIndex = (textureY * textureData.width + textureX) * 4;
            
            // Apply brightness and side-dependent shading
            const r = textureData.data[texelIndex] * brightness * shadeFactor;
            const g = textureData.data[texelIndex + 1] * brightness * shadeFactor;
            const b = textureData.data[texelIndex + 2] * brightness * shadeFactor;
            const a = textureData.data[texelIndex + 3];
            
            // Set the pixel in the wall slice
            const pixelIndex = y * 4;
            data[pixelIndex] = r;
            data[pixelIndex + 1] = g;
            data[pixelIndex + 2] = b;
            data[pixelIndex + 3] = a;
        }
        
        // Draw the wall slice on the canvas
        this.ctx.putImageData(imageData, x, drawStart);
    }
    
    /**
     * Draw a fallback wall slice with solid color
     * @param {number} x - X coordinate on the screen
     * @param {number} drawStart - Y coordinate to start drawing
     * @param {number} lineHeight - Height of the wall slice
     * @param {number} brightness - Brightness factor (0-1)
     * @param {number} side - Wall side (0 for x-side, 1 for y-side)
     */
    drawFallbackWallSlice(x, drawStart, lineHeight, brightness, side) {
        // Apply side-dependent shading
        const shadeFactor = side === 1 ? 0.7 : 1.0;
        
        // Calculate color based on brightness and side
        const color = Math.floor(255 * brightness * shadeFactor);
        
        // Draw a solid color wall slice
        this.ctx.fillStyle = `rgb(${color}, ${color}, ${color})`;
        this.ctx.fillRect(x, drawStart, 1, lineHeight);
    }
    
    /**
     * Render sprites (enemies, items, etc.)
     * @param {Array} zBuffer - Array of wall distances for depth testing
     * @param {Array} sprites - Array of sprites to render
     */
    renderSprites(zBuffer, sprites) {
        // Sort sprites by distance (furthest first for proper rendering)
        const sortedSprites = [...sprites].sort((a, b) => {
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
                        const texX = Math.floor(256 * (stripe - drawStartX) / spriteWidth) / 256 * spriteTexture.width;
                        
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
    
    /**
     * Render the player's hand and weapon
     */
    renderPlayerHand() {
        // Get the hand sprite
        const handSprite = this.sprites['player_hand'];
        if (!handSprite) return;
        
        // Calculate hand position and size
        const handWidth = this.canvas.width * 0.4;
        const handHeight = handWidth * (handSprite.height / handSprite.width);
        const handX = this.canvas.width - handWidth;
        const handY = this.canvas.height - handHeight;
        
        // Draw the hand
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
            const weaponY = this.canvas.height - weaponHeight;
            
            // Draw the weapon
            this.ctx.drawImage(weaponSprite, weaponX, weaponY, weaponWidth, weaponHeight);
        }
    }
    
    /**
     * Render a debug map overlay in the corner of the screen
     */
    renderDebugMap() {
        if (!this.map) return;
        
        // Check if debug mode is enabled
        const debugEnabled = window.gameInstance?.debug?.enabled || false;
        
        // If debug mode is disabled, remove any existing debug map canvas
        if (!debugEnabled) {
            const existingCanvas = document.getElementById('debug-map-canvas');
            if (existingCanvas) {
                existingCanvas.remove();
            }
            return;
        }
        
        // Create a debug map in the top-right corner (same level as minimap)
        const mapSize = 150; // Reduced size from 200 to 150
        const cellSize = mapSize / Math.max(this.map.width, this.map.height);
        
        // Handle the debug map canvas
        let debugMapCanvas = document.getElementById('debug-map-canvas');
        
        // Create the debug map canvas if it doesn't exist
        if (!debugMapCanvas) {
            debugMapCanvas = document.createElement('canvas');
            debugMapCanvas.id = 'debug-map-canvas';
            debugMapCanvas.width = mapSize + 20;
            debugMapCanvas.height = mapSize + 20;
            debugMapCanvas.style.position = 'absolute';
            debugMapCanvas.style.top = '20px';
            debugMapCanvas.style.right = '20px';
            debugMapCanvas.style.zIndex = '1001'; // Just above minimap (1000) but below other UI
            debugMapCanvas.style.pointerEvents = 'none'; // Important: Allow clicks to pass through
            debugMapCanvas.style.opacity = '0.8'; // Make it slightly transparent
            
            // Add to the game container
            const gameContainer = document.getElementById('game-container');
            if (gameContainer) {
                gameContainer.appendChild(debugMapCanvas);
            } else {
                console.warn('Game container not found, cannot add debug map canvas');
                return;
            }
        }
        
        // Get the debug map canvas context
        const debugCtx = debugMapCanvas.getContext('2d');
        
        // Clear the debug map canvas
        debugCtx.clearRect(0, 0, debugMapCanvas.width, debugMapCanvas.height);
        
        // Draw background
        debugCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // More transparent background
        debugCtx.fillRect(0, 0, mapSize + 20, mapSize + 20);
        
        // Draw title
        debugCtx.fillStyle = '#ff0';
        debugCtx.font = '10px monospace'; // Smaller font
        debugCtx.fillText('DEBUG MAP', 10, 15);
        
        // Draw map cells
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const cell = this.map.layout[y][x];
                
                // Set color based on cell type
                if (cell === 'W') {
                    // Check if this is a secret wall
                    const isSecretWall = this.isSecretWall(x, y);
                    if (isSecretWall) {
                        debugCtx.fillStyle = '#ff0000'; // Red for secret walls
                    } else {
                        debugCtx.fillStyle = '#888'; // Regular wall
                    }
                } else if (cell === 'D') {
                    // Check if door is open
                    const doorObj = this.map.objects['D'];
                    if (doorObj && doorObj.open) {
                        debugCtx.fillStyle = '#444'; // Open door
                    } else {
                        debugCtx.fillStyle = '#8b4513'; // Closed door
                    }
                } else if (cell === '.') {
                    debugCtx.fillStyle = '#222'; // Floor
                } else {
                    // Special object
                    const object = this.map.objects[cell];
                    if (object) {
                        if (object.type === 'enemy') {
                            debugCtx.fillStyle = '#f00'; // Enemy
                        } else if (object.type === 'chest') {
                            debugCtx.fillStyle = '#fd0'; // Chest
                        } else {
                            debugCtx.fillStyle = '#0ff'; // Other objects
                        }
                    } else {
                        debugCtx.fillStyle = '#222'; // Default floor
                    }
                }
                
                // Draw the cell
                debugCtx.fillRect(
                    10 + x * cellSize, 
                    20 + y * cellSize, 
                    cellSize, 
                    cellSize
                );
            }
        }
        
        // Draw player position
        const playerMapX = 10 + this.player.x * cellSize;
        const playerMapY = 20 + this.player.y * cellSize;
        
        // Draw player as a circle
        debugCtx.fillStyle = '#0f0';
        debugCtx.beginPath();
        debugCtx.arc(playerMapX, playerMapY, cellSize / 2, 0, Math.PI * 2);
        debugCtx.fill();
        
        // Draw player direction
        const dirX = Math.cos(this.player.angle) * cellSize * 2;
        const dirY = Math.sin(this.player.angle) * cellSize * 2;
        
        debugCtx.strokeStyle = '#0f0';
        debugCtx.lineWidth = 2;
        debugCtx.beginPath();
        debugCtx.moveTo(playerMapX, playerMapY);
        debugCtx.lineTo(playerMapX + dirX, playerMapY + dirY);
        debugCtx.stroke();
        
        // Draw field of view lines
        const leftAngle = this.player.angle - this.fov / 2;
        const rightAngle = this.player.angle + this.fov / 2;
        
        const leftDirX = Math.cos(leftAngle) * cellSize * 5;
        const leftDirY = Math.sin(leftAngle) * cellSize * 5;
        const rightDirX = Math.cos(rightAngle) * cellSize * 5;
        const rightDirY = Math.sin(rightAngle) * cellSize * 5;
        
        debugCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        debugCtx.lineWidth = 1;
        
        // Left FOV line
        debugCtx.beginPath();
        debugCtx.moveTo(playerMapX, playerMapY);
        debugCtx.lineTo(playerMapX + leftDirX, playerMapY + leftDirY);
        debugCtx.stroke();
        
        // Right FOV line
        debugCtx.beginPath();
        debugCtx.moveTo(playerMapX, playerMapY);
        debugCtx.lineTo(playerMapX + rightDirX, playerMapY + rightDirY);
        debugCtx.stroke();
    }
    
    /**
     * Visualize a ray on the debug map
     * @param {number} angle - Angle of the ray
     * @param {object} rayResult - Result of the ray cast
     */
    visualizeRay(angle, rayResult) {
        if (!this.map || !rayResult) return;
        
        // Check if debug mode is enabled
        const debugEnabled = window.gameInstance?.debug?.enabled || false;
        if (!debugEnabled) return;
        
        // Get the debug map canvas
        const debugMapCanvas = document.getElementById('debug-map-canvas');
        if (!debugMapCanvas) return;
        
        const debugCtx = debugMapCanvas.getContext('2d');
        
        // Use a smaller map size to match the renderDebugMap function
        const mapSize = 150;
        const cellSize = mapSize / Math.max(this.map.width, this.map.height);
        
        // Player position on debug map
        const playerMapX = 10 + this.player.x * cellSize;
        const playerMapY = 20 + this.player.y * cellSize;
        
        // Calculate ray end point
        const rayEndX = 10 + rayResult.mapX * cellSize + cellSize / 2;
        const rayEndY = 20 + rayResult.mapY * cellSize + cellSize / 2;
        
        // Draw the ray
        debugCtx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        debugCtx.lineWidth = 1;
        debugCtx.beginPath();
        debugCtx.moveTo(playerMapX, playerMapY);
        debugCtx.lineTo(rayEndX, rayEndY);
        debugCtx.stroke();
        
        // Draw a small dot at the hit point
        debugCtx.fillStyle = '#ff0';
        debugCtx.beginPath();
        debugCtx.arc(rayEndX, rayEndY, 2, 0, Math.PI * 2);
        debugCtx.fill();
    }
}

// Export the engine
window.RaycastingEngine = RaycastingEngine;
