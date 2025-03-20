/**
 * Raycasting Engine for Dungeon Adventure Game
 * Handles 3D rendering of a 2D grid-based map using raycasting techniques
 */

class RaycastingEngine {
    constructor(canvas, fov = 75) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.fov = fov * (Math.PI / 180); // Convert to radians
        this.textures = {};
        this.sprites = {};
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
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.textures[name] = img;
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load texture: ${url}`));
            img.src = url;
        });
    }
    
    /**
     * Load a sprite from a URL
     * @param {string} name - Sprite identifier
     * @param {string} url - Sprite URL
     * @returns {Promise} - Promise that resolves when the sprite is loaded
     */
    loadSprite(name, url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.sprites[name] = img;
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load sprite: ${url}`));
            img.src = url;
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
        return cell === 'W' || (cell === 'D' && !this.map.objects[cell]?.open);
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
        // Clear the canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.map) return;
        
        // Draw ceiling
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(0, 0, this.canvas.width, this.halfHeight);
        
        // Draw floor
        this.ctx.fillStyle = '#555';
        this.ctx.fillRect(0, this.halfHeight, this.canvas.width, this.halfHeight);
        
        // Cast rays
        const startAngle = this.player.angle - this.fov / 2;
        
        for (let i = 0; i < this.numRays; i++) {
            const rayAngle = startAngle + i * this.rayAngleStep;
            const rayResult = this.castRay(rayAngle);
            
            // Calculate wall height
            const lineHeight = Math.min(this.canvas.height, (this.CELL_SIZE * this.canvas.height) / rayResult.distance);
            
            // Calculate drawing start and end positions
            const drawStart = this.halfHeight - lineHeight / 2;
            const drawEnd = drawStart + lineHeight;
            
            // Apply distance-based shading
            const brightness = Math.min(1, 1 - rayResult.distance / this.MAX_DISTANCE);
            
            // Draw the wall slice
            if (this.textures[rayResult.texture]) {
                // Textured rendering
                const texture = this.textures[rayResult.texture];
                const textureX = rayResult.textureX;
                
                // Draw the textured wall slice
                const imageData = this.ctx.createImageData(1, lineHeight);
                const textureYStep = 64 / lineHeight; // Assuming 64x64 textures
                
                for (let y = 0; y < lineHeight; y++) {
                    const textureY = Math.floor(y * textureYStep);
                    
                    // Get pixel color from texture
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = texture.width;
                    tempCanvas.height = texture.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx.drawImage(texture, 0, 0);
                    
                    const pixelData = tempCtx.getImageData(textureX, textureY, 1, 1).data;
                    
                    // Apply shading based on distance and side
                    const shadeFactor = rayResult.side === 1 ? 0.7 : 1; // Darker for y-side walls
                    
                    // Set pixel in image data
                    const pixelIndex = y * 4;
                    imageData.data[pixelIndex] = pixelData[0] * brightness * shadeFactor;
                    imageData.data[pixelIndex + 1] = pixelData[1] * brightness * shadeFactor;
                    imageData.data[pixelIndex + 2] = pixelData[2] * brightness * shadeFactor;
                    imageData.data[pixelIndex + 3] = 255; // Alpha
                }
                
                // Draw the image data
                this.ctx.putImageData(imageData, i, drawStart);
            } else {
                // Fallback to solid color rendering
                let color;
                
                if (rayResult.side === 1) {
                    // Darker for y-side walls
                    color = `rgb(${Math.floor(150 * brightness)}, ${Math.floor(150 * brightness)}, ${Math.floor(150 * brightness)})`;
                } else {
                    color = `rgb(${Math.floor(200 * brightness)}, ${Math.floor(200 * brightness)}, ${Math.floor(200 * brightness)})`;
                }
                
                this.ctx.fillStyle = color;
                this.ctx.fillRect(i, drawStart, 1, lineHeight);
            }
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
