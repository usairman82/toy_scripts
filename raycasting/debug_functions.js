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
