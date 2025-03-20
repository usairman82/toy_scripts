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
            // Find the door object in the map objects
            const doorObj = this.map.objects['D'];
            return !doorObj || !doorObj.open;
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
        
        if (cell === 'W') {
            return 'stone_wall';
        } else if (cell === 'D') {
            return this.map.objects[cell]?.open ? 'door_open' : 'door_closed';
        }
        
        return 'stone_wall'; // Default texture
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
     * Render sprites (enemies, items, etc.)
     * @param {Array} zBuffer - Array of wall distances for each screen column
     * @param {Array} sprites - Array of sprite objects to render
     */
    renderSprites(zBuffer, sprites) {
        try {
            // Sort sprites by distance (furthest first for proper rendering)
            const sortedSprites = [...sprites].sort((a, b) => {
                const distA = Math.pow(a.x - this.player.x, 2) + Math.pow(a.y - this.player.y, 2);
                const distB = Math.pow(b.x - this.player.x, 2) + Math.pow(b.y - this.player.y, 2);
                return distB - distA;
            });
            
            // Render each sprite
            for (const sprite of sortedSprites) {
                // Calculate sprite position relative to player
                const spriteX = sprite.x - this.player.x;
                const spriteY = sprite.y - this.player.y;
                
                // Transform sprite with the inverse camera matrix
                // [ planeX   dirX ] -1                                       [ dirY      -dirX ]
                // [               ]       =  1/(planeX*dirY-dirX*planeY) *   [                 ]
                // [ planeY   dirY ]                                          [ -planeY  planeX ]
                
                const dirX = Math.cos(this.player.angle);
                const dirY = Math.sin(this.player.angle);
                const planeX = -Math.sin(this.player.angle) * (this.fov / 2);
                const planeY = Math.cos(this.player.angle) * (this.fov / 2);
                
                const invDet = 1.0 / (planeX * dirY - dirX * planeY);
                
                const transformX = invDet * (dirY * spriteX - dirX * spriteY);
                const transformY = invDet * (-planeY * spriteX + planeX * spriteY);
                
                // Calculate sprite screen position
                const spriteScreenX = Math.floor((this.canvas.width / 2) * (1 + transformX / transformY));
                
                // Calculate sprite height and width on screen
                const spriteHeight = Math.abs(Math.floor(this.canvas.height / transformY));
                const spriteWidth = spriteHeight; // Square sprites
                
                // Calculate drawing boundaries
                const drawStartY = Math.floor(this.halfHeight - spriteHeight / 2);
                const drawEndY = Math.floor(this.halfHeight + spriteHeight / 2);
                
                const drawStartX = Math.max(0, Math.floor(spriteScreenX - spriteWidth / 2));
                const drawEndX = Math.min(this.canvas.width - 1, Math.floor(spriteScreenX + spriteWidth / 2));
                
                // Only render if sprite is in front of the player
                if (transformY > 0) {
                    // Get the appropriate sprite image based on enemy type
                    let spriteImage;
                    switch (sprite.type) {
                        case 'skeleton':
                            spriteImage = this.sprites['skeleton_idle'];
                            break;
                        case 'goblin':
                            spriteImage = this.sprites['goblin_idle'];
                            break;
                        case 'wizard':
                            spriteImage = this.sprites['dark_wizard_idle'];
                            break;
                        case 'boss':
                            spriteImage = this.sprites['boss_idle'];
                            break;
                        default:
                            spriteImage = null;
                    }
                    
                    // If we have a valid sprite image, render it
                    if (spriteImage) {
                        // Loop through every vertical stripe of the sprite on screen
                        for (let stripe = drawStartX; stripe < drawEndX; stripe++) {
                            // Only render if in front of wall
                            if (transformY < zBuffer[stripe]) {
                                // Calculate texture X coordinate
                                const texX = Math.floor(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * 64 / spriteWidth) / 256;
                                
                                // Draw the sprite vertical stripe
                                this.ctx.drawImage(
                                    spriteImage,
                                    texX, 0, 1, spriteImage.height,
                                    stripe, drawStartY, 1, spriteHeight
                                );
                            }
                        }
                    } else {
                        // Fallback rendering if sprite image is missing
                        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                        this.ctx.fillRect(drawStartX, drawStartY, drawEndX - drawStartX, drawEndY - drawStartY);
                        
                        // Draw enemy type text
                        this.ctx.fillStyle = 'white';
                        this.ctx.font = '10px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(sprite.type, spriteScreenX, drawStartY + spriteHeight / 2);
                    }
                }
            }
        } catch (e) {
            console.error('Error rendering sprites:', e);
        }
    }
    
    /**
     * Move the player forward/backward
     * @param {number} distance - Distance to move (negative for backward)
     */
    movePlayer(distance) {
        const newX = this.player.x + Math.cos(this.player.angle) * distance * this.player.speed;
        const newY = this.player.y + Math.sin(this.player.angle) * distance * this.player.speed;
        
        // Collision detection
        if (!this.isWall(newX, this.player.y)) {
            this.player.x = newX;
        }
        
        if (!this.isWall(this.player.x, newY)) {
            this.player.y = newY;
        }
    }
    
    /**
     * Strafe the player left/right
     * @param {number} distance - Distance to strafe (negative for left)
     */
    strafePlayer(distance) {
        const strafeAngle = this.player.angle + Math.PI / 2;
        const newX = this.player.x + Math.cos(strafeAngle) * distance * this.player.speed;
        const newY = this.player.y + Math.sin(strafeAngle) * distance * this.player.speed;
        
        // Collision detection
        if (!this.isWall(newX, this.player.y)) {
            this.player.x = newX;
        }
        
        if (!this.isWall(this.player.x, newY)) {
            this.player.y = newY;
        }
    }
    
    /**
     * Rotate the player
     * @param {number} angle - Angle to rotate (negative for left)
     */
    rotatePlayer(angle) {
        this.player.angle += angle * this.player.rotationSpeed;
        
        // Normalize angle
        this.player.angle = this.player.angle % (2 * Math.PI);
        if (this.player.angle < 0) {
            this.player.angle += 2 * Math.PI;
        }
    }
    
    /**
     * Draw a textured wall slice using pre-processed texture data
     * @param {number} x - X coordinate on the canvas
     * @param {number} drawStart - Y coordinate to start drawing
     * @param {number} lineHeight - Height of the wall slice
     * @param {number} brightness - Brightness factor based on distance
     * @param {number} side - Wall side (0 for x-side, 1 for y-side)
     * @param {string} textureName - Name of the texture to use
     * @param {number} textureX - X coordinate in the texture
     */
    drawTexturedWallSlice(x, drawStart, lineHeight, brightness, side, textureName, textureX) {
        // Get the texture data
        const textureData = this.textureData[textureName];
        if (!textureData) {
            this.drawFallbackWallSlice(x, drawStart, lineHeight, brightness, side);
            return;
        }
        
        // Create image data for the wall slice
        const imageData = this.ctx.createImageData(1, lineHeight);
        const textureYStep = textureData.height / lineHeight;
        
        // Apply shading based on distance and side
        const shadeFactor = side === 1 ? 0.7 : 1; // Darker for y-side walls
        
        // Ensure textureX is within bounds
        const tx = textureX % textureData.width;
        
        // Draw the wall slice
        for (let y = 0; y < lineHeight; y++) {
            // Calculate texture Y coordinate
            const ty = Math.floor(y * textureYStep);
            
            // Get pixel color from texture data
            // Each pixel is 4 bytes (RGBA)
            const textureIndex = (ty * textureData.width + tx) * 4;
            
            // Set pixel in image data
            const pixelIndex = y * 4;
            imageData.data[pixelIndex] = textureData.data[textureIndex] * brightness * shadeFactor;
            imageData.data[pixelIndex + 1] = textureData.data[textureIndex + 1] * brightness * shadeFactor;
            imageData.data[pixelIndex + 2] = textureData.data[textureIndex + 2] * brightness * shadeFactor;
            imageData.data[pixelIndex + 3] = 255; // Alpha
        }
        
        // Draw the image data
        this.ctx.putImageData(imageData, x, drawStart);
        
        // Check if we should draw a depth texture overlay
        if (this.depthTextureConfig?.enabled) {
            // Get the ray angle for this column
            const rayAngle = this.player.angle - this.fov / 2 + (x / this.canvas.width) * this.fov;
            
            // Cast a ray to get the wall information
            const rayResult = this.castRay(rayAngle);
            
            // Skip if ray didn't hit a wall or is too far/close
            if (!rayResult || 
                rayResult.distance < this.depthTextureConfig.minDistance || 
                rayResult.distance > this.depthTextureConfig.maxDistance) {
                return;
            }
            
            // Check if this wall has a depth texture
            const wallSection = this.findWallSectionWithDepth(
                rayResult.mapX, 
                rayResult.mapY, 
                side, 
                textureX / 64 // Normalize to 0-1 range
            );
            
            if (wallSection) {
                this.drawDepthTextureOverlay(x, drawStart, lineHeight, brightness, wallSection);
            }
        }
    }
    
    /**
     * Find a wall section with depth texture at the given coordinates
     * @param {number} mapX - X coordinate in the map
     * @param {number} mapY - Y coordinate in the map
     * @param {number} side - Wall side (0 for x-side, 1 for y-side)
     * @param {number} position - Position along the wall (0-1)
     * @returns {object|null} - Wall section with depth texture or null if not found
     */
    findWallSectionWithDepth(mapX, mapY, side, position) {
        if (!this.wallSectionsWithDepth) return null;
        
        // Convert side (0/1) to cardinal direction (0-3 for N, E, S, W)
        // For x-side walls (side=0), it's either East (1) or West (3)
        // For y-side walls (side=1), it's either North (0) or South (2)
        let wallSide;
        if (side === 0) {
            wallSide = position < 0.5 ? 1 : 3; // East or West
        } else {
            wallSide = position < 0.5 ? 0 : 2; // North or South
        }
        
        // Find a matching wall section
        for (const section of this.wallSectionsWithDepth) {
            if (section.x === mapX && section.y === mapY && section.side === wallSide) {
                // Check if the position is within range
                const posRange = 0.2; // Position tolerance
                if (Math.abs(section.position - position) <= posRange) {
                    return section;
                }
            }
        }
        
        return null;
    }
    
    /**
     * Draw a depth texture overlay on a wall slice
     * @param {number} x - X coordinate on the canvas
     * @param {number} drawStart - Y coordinate to start drawing
     * @param {number} lineHeight - Height of the wall slice
     * @param {number} brightness - Brightness factor based on distance
     * @param {object} wallSection - Wall section with depth texture
     */
    drawDepthTextureOverlay(x, drawStart, lineHeight, brightness, wallSection) {
        // Get the depth texture
        const depthTextureName = wallSection.textureName;
        const depthTextureData = this.textureData[depthTextureName];
        
        if (!depthTextureData) {
            return;
        }
        
        // Calculate the scale and position of the depth texture
        const scale = wallSection.scale;
        const scaledHeight = Math.floor(lineHeight * scale);
        
        // Position the depth texture vertically centered on the wall
        const depthDrawStart = drawStart + (lineHeight - scaledHeight) / 2;
        
        // Reuse the offscreen canvas for depth textures
        this.offscreenCanvas.width = 1;
        this.offscreenCanvas.height = scaledHeight;
        
        // Create image data for the depth texture slice
        const depthImageData = this.offscreenCtx.createImageData(1, scaledHeight);
        const depthTextureYStep = depthTextureData.height / scaledHeight;
        
        // Calculate the x-coordinate in the depth texture
        // Use the position to offset the texture horizontally
        const depthTextureX = Math.floor(wallSection.position * depthTextureData.width);
        
        // Draw the depth texture slice
        for (let y = 0; y < scaledHeight; y++) {
            // Calculate texture Y coordinate
            const ty = Math.floor(y * depthTextureYStep);
            
            // Get pixel color from depth texture data
            const textureIndex = (ty * depthTextureData.width + depthTextureX) * 4;
            
            // Only draw if the pixel is not fully transparent
            if (depthTextureData.data[textureIndex + 3] > 0) {
                // Set pixel in image data with distance-based brightness
                const pixelIndex = y * 4;
                depthImageData.data[pixelIndex] = depthTextureData.data[textureIndex] * brightness;
                depthImageData.data[pixelIndex + 1] = depthTextureData.data[textureIndex + 1] * brightness;
                depthImageData.data[pixelIndex + 2] = depthTextureData.data[textureIndex + 2] * brightness;
                depthImageData.data[pixelIndex + 3] = depthTextureData.data[textureIndex + 3]; // Keep original alpha
            }
        }
        
        // Draw the depth texture image data
        this.offscreenCtx.putImageData(depthImageData, 0, 0);
        
        // Draw the offscreen canvas onto the main canvas
        this.ctx.drawImage(this.offscreenCanvas, x, depthDrawStart);
        
        // Increment the depth texture counter for debugging
        this.depthTexturesRendered = (this.depthTexturesRendered || 0) + 1;
    }
    
    /**
     * Draw a fallback wall slice when texture rendering fails
     * @param {number} x - X coordinate on the canvas
     * @param {number} drawStart - Y coordinate to start drawing
     * @param {number} lineHeight - Height of the wall slice
     * @param {number} brightness - Brightness factor based on distance
     * @param {number} side - Wall side (0 for x-side, 1 for y-side)
     */
    drawFallbackWallSlice(x, drawStart, lineHeight, brightness, side) {
        let color;
        
        if (side === 1) {
            // Darker for y-side walls
            color = `rgb(${Math.floor(150 * brightness)}, ${Math.floor(150 * brightness)}, ${Math.floor(150 * brightness)})`;
        } else {
            color = `rgb(${Math.floor(200 * brightness)}, ${Math.floor(200 * brightness)}, ${Math.floor(200 * brightness)})`;
        }
        
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, drawStart, 1, lineHeight);
    }
    
    /**
     * Interact with objects in front of the player
     * @returns {object|null} - The object the player interacted with, or null
     */
    interact() {
        // Cast a ray directly in front of the player
        const rayResult = this.castRay(this.player.angle);
        
        // Check if the ray hit something interactive within range
        if (rayResult.distance <= 2) {
            const cell = this.map.layout[rayResult.mapY][rayResult.mapX];
            
            // Check if it's an interactive object
            if (cell !== 'W' && cell !== '.') {
                const object = this.map.objects[cell];
                
                if (object) {
                    // Handle different types of objects
                    if (object.type === 'door') {
                        object.open = !object.open;
                        return object;
                    } else if (object.type === 'chest') {
                        object.opened = true;
                        return object;
                    } else if (object.type === 'lever') {
                        object.activated = !object.activated;
                        return object;
                    }
                }
            }
        }
        
        return null;
    }
}

// Export the engine
window.RaycastingEngine = RaycastingEngine;
