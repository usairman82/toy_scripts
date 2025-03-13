// Tracking API configuration
const lambdaUrl = "https://6jlbcsv4gwkdzefzgvhtzzfzpy0yplsl.lambda-url.us-west-2.on.aws/";
const siteId = "tank_simulator";

// Function to send tracking request
function trackEvent(eventName) {
    fetch(`${lambdaUrl}?site_id=${siteId}&page_name=${eventName}`, { method: 'GET' })
        .then(response => response.json())
        .then(data => console.log("Tracking success:", data))
        .catch(error => console.error("Tracking error:", error));
}

// Game constants
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MINIMAP_SIZE = 150;
const SPRITE_SIZE = 64;
const EXPLOSION_SIZE = 96;
const PLAYER_SPEED = 200;
const PLAYER_ROTATION_SPEED = 0.05;
const MOBILE_ROTATION_SPEED = 0.03; // Slower rotation for mobile
const ENEMY_SPEED = 100;
const ENEMY_SIGHT_RANGE = 400;
const ENEMY_SIGHT_WIDTH = 64;
const ENEMY_FIRE_INTERVAL = 2000; // ms
const PROJECTILE_LIFESPAN = 3000; // ms
const EXPLOSION_DURATION = 500; // ms
const INVINCIBILITY_DURATION = 500; // ms
const PROJECTILE_OFFSET = 40; // pixels ahead of barrel

// Weapon types
const WEAPONS = {
    CANNON: { name: 'Cannon', speed: 400, damage: 20, sprite: 'shell.png' },
    MACHINE_GUN: { name: 'MachineGun', speed: 600, damage: 10, sprite: 'bullet.png' },
    ROCKET: { name: 'Rocket', speed: 300, damage: 50, sprite: 'rocket.png' }
};

// Audio elements
const audioElements = {
    fire: new Audio('assets/sounds/shoot.mp3'),
    explosion: new Audio('assets/sounds/explosion.mp3'),
    hit: new Audio('assets/sounds/hit.mp3'),
    weaponSwitch: new Audio('assets/sounds/switch.mp3'),
    engine: new Audio('assets/sounds/tank_engine.mp3')
};

// Set the engine sound to loop
audioElements.engine.loop = true;
audioElements.engine.volume = 0.2;

// Preload audio
for (const audio of Object.values(audioElements)) {
    audio.load();
}

// Audio play function with error handling
function playSound(sound) {
    try {
        // Create a new audio element by cloning to allow overlapping sounds
        const audioClone = sound.cloneNode();
        audioClone.volume = 0.3; // Lower volume
        audioClone.play().catch(err => {
            // Silently handle autoplay policy errors
            console.log("Audio play interrupted: " + err.message);
        });
    } catch (e) {
        console.log("Error playing sound: " + e.message);
    }
}

// Game state
let gameRunning = true;
let gameWon = false;
let lastFrameTime = 0;
let keysPressed = {};
let playerScore = 0;
let engineSoundPlaying = false;
let multiplayerManager = null;

// Images container
const images = {};
const imageNames = [
    'tank.png', 'enemy.png', 'shell.png', 'bullet.png', 'rocket.png',
    'wall.png', 'crate.png', 'tree.png', 'rock.png', 'explosion.png', 'rubble.png'
];

// Game objects
let player;
let enemies = [];
let obstacles = [];
let projectiles = [];
let explosions = [];
let rubble = [];

// Canvas and context
const gameCanvas = document.getElementById('gameCanvas');
const gameCtx = gameCanvas.getContext('2d');
const minimapCanvas = document.getElementById('minimap');
const minimapCtx = minimapCanvas.getContext('2d');

// Health display
const healthDisplay = document.getElementById('healthDisplay');

// Game over elements
const gameOverElem = document.getElementById('gameOver');
const youWinElem = document.getElementById('youWin');

// Resize minimap
minimapCanvas.width = MINIMAP_SIZE;
minimapCanvas.height = MINIMAP_SIZE;


// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0; // 0 radians = up/north
        this.health = 50;
        this.speed = ENEMY_SPEED;
        this.radius = SPRITE_SIZE / 2;
        this.moveDirection = Math.random() * Math.PI * 2; // Random initial direction
        this.sprite = images['enemy.png'];
        this.lastFireTime = 0;
        this.chasing = false;
        this.directionChangeTimer = 0;
        this.directionChangeInterval = 2000 + Math.random() * 3000; // 2-5 seconds
        this.isAI = true; // Flag to identify AI-controlled enemies
    }

    update(deltaTime) {
        if (this.health <= 0) return;

        // Check if player is in line of sight
        this.chasing = this.isPlayerInLineOfSight();

        // Move the enemy
        const moveSpeed = this.speed * deltaTime;
        const oldX = this.x;
        const oldY = this.y;

        // Update direction change timer
        if (!this.chasing) {
            this.directionChangeTimer += deltaTime * 1000;
            if (this.directionChangeTimer >= this.directionChangeInterval) {
                this.moveDirection = Math.random() * Math.PI * 2;
                this.directionChangeTimer = 0;
                this.directionChangeInterval = 2000 + Math.random() * 3000;
            }
        }

        if (this.chasing) {
            // Calculate angle to player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.rotation = Math.atan2(dx, -dy);
            
            // Move toward player
            this.x += Math.sin(this.rotation) * moveSpeed;
            this.y -= Math.cos(this.rotation) * moveSpeed;
        } else {
            // Properly align rotation with movement direction
            // For random movement, North is 0, East is PI/2, etc.
            this.rotation = this.moveDirection;
            
            // Move in the direction of the barrel (similar to player movement)
            this.x += Math.sin(this.rotation) * moveSpeed;
            this.y -= Math.cos(this.rotation) * moveSpeed;
        }

        // Handle collisions with world bounds
        const hitWorldBounds = 
            this.x < this.radius || 
            this.x > WORLD_WIDTH - this.radius || 
            this.y < this.radius || 
            this.y > WORLD_HEIGHT - this.radius;
        
        if (hitWorldBounds) {
            this.x = oldX;
            this.y = oldY;
            // If not chasing, choose a new random direction
            if (!this.chasing) {
                this.moveDirection = Math.random() * Math.PI * 2;
            }
        }

        // Check for collisions with obstacles
        if (this.checkCollisionWithObstacles()) {
            this.x = oldX;
            this.y = oldY;
            // If not chasing, choose a new random direction
            if (!this.chasing) {
                this.moveDirection = Math.random() * Math.PI * 2;
            }
        }

        // Check for collisions with other enemies
        for (const otherEnemy of enemies) {
            if (otherEnemy !== this && otherEnemy.health > 0) {
                const dx = this.x - otherEnemy.x;
                const dy = this.y - otherEnemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.radius + otherEnemy.radius) {
                    this.x = oldX;
                    this.y = oldY;
                    // If not chasing, choose a new random direction
                    if (!this.chasing) {
                        this.moveDirection = Math.random() * Math.PI * 2;
                    }
                    break;
                }
            }
        }

        // Try to fire at player if in line of sight
        const currentTime = Date.now();
        if (this.chasing && currentTime - this.lastFireTime > ENEMY_FIRE_INTERVAL) {
            this.fire();
            this.lastFireTime = currentTime;
        }
    }

    isPlayerInLineOfSight() {
        // Check if player is in the enemy's line of sight
        if (player.health <= 0) return false;

        // Create a corridor in front of the enemy
        const enemyFront = {
            x: this.x + Math.sin(this.rotation) * ENEMY_SIGHT_RANGE / 2,
            y: this.y - Math.cos(this.rotation) * ENEMY_SIGHT_RANGE / 2
        };

        // Calculate distance and angle to player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
        
        if (distanceToPlayer > ENEMY_SIGHT_RANGE) return false;

        // Check if player is within the corridor angle
        const angleToPlayer = Math.atan2(dx, -dy);
        const angleDiff = Math.abs(normalizeAngle(angleToPlayer - this.rotation));
        
        // Allow seeing the player if within a narrow angle in front
        const maxAngleDiff = Math.atan2(ENEMY_SIGHT_WIDTH / 2, ENEMY_SIGHT_RANGE);
        
        return angleDiff < maxAngleDiff;
    }

    checkCollisionWithObstacles() {
        for (const obstacle of obstacles) {
            if (checkCircleRectCollision(this, obstacle)) {
                return true;
            }
        }
        return false;
    }

    fire() {
        // Create a new projectile at the barrel's end
        const offsetX = Math.sin(this.rotation) * PROJECTILE_OFFSET;
        const offsetY = -Math.cos(this.rotation) * PROJECTILE_OFFSET;
        
        const projectile = new Projectile(
            this.x + offsetX,
            this.y + offsetY,
            this.rotation,
            WEAPONS.CANNON,
            false // isPlayerProjectile
        );
        
        projectiles.push(projectile);
        
        // Play firing sound
        playSound(audioElements.fire);
    }

    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        
        if (this.health <= 0) {
            this.die();
            
            // Update score
            playerScore++;
            document.getElementById('scoreDisplay').textContent = `Tanks Destroyed: ${playerScore}`;
            
            // Check if all enemies and remote players are dead
            checkGameWin();
        }
    }

    die() {
        // Spawn rubble
        rubble.push({
            x: this.x,
            y: this.y,
            sprite: images['rubble.png']
        });
    }

    draw(ctx, offsetX, offsetY) {
        if (this.health <= 0) return;

        ctx.save();
        
        // Translate and rotate
        ctx.translate(this.x - offsetX, this.y - offsetY);
        ctx.rotate(this.rotation);
        
        // Draw tank centered
        ctx.drawImage(
            this.sprite,
            -SPRITE_SIZE / 2,
            -SPRITE_SIZE / 2,
            SPRITE_SIZE,
            SPRITE_SIZE
        );
        
        ctx.restore();
    }
}

// Preload all images before starting the game
let imagesLoaded = 0;
function preloadImages() {
    imageNames.forEach(name => {
        const img = new Image();
        img.src = `assets/${name}`;
        img.onload = () => {
            imagesLoaded++;
            if (imagesLoaded === imageNames.length) {
                initGame();
            }
        };
        img.onerror = () => {
            console.error(`Failed to load ${name}`);
        };
        images[name] = img;
    });
}

// Initialize game
function initGame() {
    // Create obstacles
    createObstacles();
    
    // Create player with random position
    let validPlayerPosition = false;
    let playerX, playerY;
    
    while (!validPlayerPosition) {
        playerX = Math.random() * (WORLD_WIDTH - 2 * SPRITE_SIZE) + SPRITE_SIZE;
        playerY = Math.random() * (WORLD_HEIGHT - 2 * SPRITE_SIZE) + SPRITE_SIZE;
        
        validPlayerPosition = true;
        
        // Create temporary player object to check for collisions with a larger buffer
        const tempPlayer = { 
            x: playerX, 
            y: playerY, 
            radius: SPRITE_SIZE * 0.75 // Larger buffer zone for player spawn
        };
        
        // Check for collisions with existing obstacles
        for (const obstacle of obstacles) {
            if (checkCircleRectCollision(tempPlayer, obstacle)) {
                validPlayerPosition = false;
                break;
            }
        }
        
        // Additional check for minimum distance to any obstacle
        if (validPlayerPosition) {
            for (const obstacle of obstacles) {
                const dx = playerX - (obstacle.x + obstacle.width/2);
                const dy = playerY - (obstacle.y + obstacle.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 96) { // Enforce 96px minimum distance from obstacle centers
                    validPlayerPosition = false;
                    break;
                }
            }
        }
    }
    
    player = new Player(playerX, playerY);
    
    // Create enemies with random positions
    createEnemies();

    // Add multiplayer start button
    addMultiplayerStartButton();

    // Start game loop
    requestAnimationFrame(gameLoop);
}

// Create obstacles
function createObstacles() {
    // Clear existing obstacles
    obstacles = [];
    
    // Create rock borders - starting at 0 and placing rocks every 64 pixels
    for (let x = 0; x < WORLD_WIDTH; x += SPRITE_SIZE) {
        // Top and bottom borders - at y=0 and y=2000-64=1936
        obstacles.push({
            x: x,
            y: 0,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            sprite: images['rock.png']
        });
        
        obstacles.push({
            x: x,
            y: WORLD_HEIGHT - SPRITE_SIZE,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            sprite: images['rock.png']
        });
    }
    
    for (let y = SPRITE_SIZE; y < WORLD_HEIGHT - SPRITE_SIZE; y += SPRITE_SIZE) {
        // Left and right borders - at x=0 and x=2000-64=1936
        obstacles.push({
            x: 0,
            y: y,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            sprite: images['rock.png']
        });
        
        obstacles.push({
            x: WORLD_WIDTH - SPRITE_SIZE,
            y: y,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            sprite: images['rock.png']
        });
    }
    
    // Create random obstacles
    const obstacleTypes = ['wall.png', 'crate.png', 'tree.png'];
    const minDistance = 96; // Minimum center-to-center distance
    
    for (let i = 0; i < 50; i++) {
        let validPosition = false;
        let obstacleX, obstacleY;
        
        while (!validPosition) {
            obstacleX = Math.random() * (WORLD_WIDTH - 2 * SPRITE_SIZE) + SPRITE_SIZE;
            obstacleY = Math.random() * (WORLD_HEIGHT - 2 * SPRITE_SIZE) + SPRITE_SIZE;
            
            validPosition = true;
            
            // Check distance from existing obstacles
            for (const obstacle of obstacles) {
                const dx = obstacleX - obstacle.x;
                const dy = obstacleY - obstacle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        // Pick a random obstacle type
        const obstacleType = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        obstacles.push({
            x: obstacleX,
            y: obstacleY,
            width: SPRITE_SIZE,
            height: SPRITE_SIZE,
            sprite: images[obstacleType]
        });
    }
}

// Create enemies
function createEnemies() {
    enemies = [];
    
    for (let i = 0; i < 5; i++) {
        let validPosition = false;
        let enemyX, enemyY;
        
        while (!validPosition) {
            enemyX = Math.random() * (WORLD_WIDTH - 2 * SPRITE_SIZE) + SPRITE_SIZE;
            enemyY = Math.random() * (WORLD_HEIGHT - 2 * SPRITE_SIZE) + SPRITE_SIZE;
            
            // Check distance from player (at least 500 pixels)
            const dxPlayer = enemyX - player.x;
            const dyPlayer = enemyY - player.y;
            const distanceToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
            
            if (distanceToPlayer < 500) {
                continue; // Too close to player
            }
            
            validPosition = true;
            
            // Create temporary enemy object to check for collisions
            const tempEnemy = { 
                x: enemyX, 
                y: enemyY, 
                radius: SPRITE_SIZE * 0.75 // Larger buffer zone for enemy spawn
            };
            
            // Check for collisions with obstacles
            for (const obstacle of obstacles) {
                if (checkCircleRectCollision(tempEnemy, obstacle)) {
                    validPosition = false;
                    break;
                }
            }
            
            // Additional check for minimum distance to any obstacle
            if (validPosition) {
                for (const obstacle of obstacles) {
                    const dx = enemyX - (obstacle.x + obstacle.width/2);
                    const dy = enemyY - (obstacle.y + obstacle.height/2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 96) { // Enforce 96px minimum distance from obstacle centers
                        validPosition = false;
                        break;
                    }
                }
            }
            
            // Check for collisions with other enemies
            for (const enemy of enemies) {
                const dx = enemyX - enemy.x;
                const dy = enemyY - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < SPRITE_SIZE * 2) {
                    validPosition = false;
                    break;
                }
            }
        }
        
        enemies.push(new Enemy(enemyX, enemyY));
    }
}

// Check collision between a circle and a rectangle
function checkCircleRectCollision(circle, rect) {
    // Find the closest point on the rectangle to the circle
    const closestX = Math.max(rect.x + 5, Math.min(circle.x, rect.x + rect.width - 5));
    const closestY = Math.max(rect.y + 5, Math.min(circle.y, rect.y + rect.height - 5));
    
    // Calculate the distance between the circle's center and this closest point
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    
    // Reduced collision radius for better navigation
    const reducedRadius = circle.radius * 0.85;
    
    // If the distance is less than the circle's radius, an intersection occurs
    const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
    return distanceSquared < (reducedRadius * reducedRadius);
}

function normalizeAngle(angle) {
    // Normalize angle to be between -PI and PI
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time
    const deltaTime = (timestamp - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = timestamp;
    
    // Clear canvas - using actual canvas dimensions instead of constants
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Calculate viewport offset - using actual canvas dimensions for centering
    const offsetX = Math.max(0, Math.min(WORLD_WIDTH - gameCanvas.width, player.x - gameCanvas.width / 2));
    const offsetY = Math.max(0, Math.min(WORLD_HEIGHT - gameCanvas.height, player.y - gameCanvas.height / 2));
    
    // Update game objects
    if (gameRunning) {
        // Update player
        player.move(deltaTime);
        
        // Update enemies
        for (const enemy of enemies) {
            enemy.update(deltaTime);
        }
        
        // Update projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
            if (projectiles[i].update(deltaTime)) {
                projectiles.splice(i, 1);
            }
        }
        
        // Update explosions
        for (let i = explosions.length - 1; i >= 0; i--) {
            if (Date.now() - explosions[i].creationTime > EXPLOSION_DURATION) {
                explosions.splice(i, 1);
            }
        }
        
        // Broadcast player position at a reasonable rate (10 times per second)
        if (multiplayerManager && timestamp % 100 < 16) {
            multiplayerManager.broadcastPlayerUpdate();
        }
        
        // Update multiplayer UI
        if (multiplayerManager) {
            updateMultiplayerUI();
        }
    }
    
    // Draw game world
    drawWorld(offsetX, offsetY);
    
    // Draw minimap
    drawMinimap();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Draw game world
function drawWorld(offsetX, offsetY) {
    // Draw obstacles
    for (const obstacle of obstacles) {
        // Check if obstacle is in viewport
        if (
            obstacle.x + obstacle.width >= offsetX &&
            obstacle.x <= offsetX + CANVAS_WIDTH &&
            obstacle.y + obstacle.height >= offsetY &&
            obstacle.y <= offsetY + CANVAS_HEIGHT
        ) {
            gameCtx.drawImage(
                obstacle.sprite,
                obstacle.x - offsetX,
                obstacle.y - offsetY,
                obstacle.width,
                obstacle.height
            );
        }
    }
    
    // Draw rubble
    for (const piece of rubble) {
        gameCtx.drawImage(
            piece.sprite,
            piece.x - SPRITE_SIZE / 2 - offsetX,
            piece.y - SPRITE_SIZE / 2 - offsetY,
            SPRITE_SIZE,
            SPRITE_SIZE
        );
    }
    
    // Draw projectiles
    for (const projectile of projectiles) {
        projectile.draw(gameCtx, offsetX, offsetY);
    }
    
    // Draw player
    if (player.health > 0) {
        player.draw(gameCtx, offsetX, offsetY);
    }
    
    // Draw remote players in multiplayer mode
    if (multiplayerManager) {
        drawRemotePlayers(gameCtx, offsetX, offsetY);
    }
    
    // Draw enemies
    for (const enemy of enemies) {
        enemy.draw(gameCtx, offsetX, offsetY);
    }
    
    // Draw explosions
    for (const explosion of explosions) {
        gameCtx.drawImage(
            explosion.sprite,
            explosion.x - EXPLOSION_SIZE / 2 - offsetX,
            explosion.y - EXPLOSION_SIZE / 2 - offsetY,
            EXPLOSION_SIZE,
            EXPLOSION_SIZE
        );
    }
}

// Draw minimap
function drawMinimap() {
    // Clear minimap
    minimapCtx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Draw minimap background
    minimapCtx.fillStyle = '#555555';
    minimapCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
    
    // Scale factor
    const scaleX = MINIMAP_SIZE / WORLD_WIDTH;
    const scaleY = MINIMAP_SIZE / WORLD_HEIGHT;
    
    // Draw player on minimap
    if (player.health > 0) {
        minimapCtx.fillStyle = multiplayerManager ? player.color : 'green';
        minimapCtx.beginPath();
        minimapCtx.arc(player.x * scaleX, player.y * scaleY, 3, 0, Math.PI * 2);
        minimapCtx.fill();
    }
    
    // Draw remote players on minimap
    if (multiplayerManager) {
        for (const playerId in multiplayerManager.players) {
            const remotePlayer = multiplayerManager.players[playerId];
            if (remotePlayer.health > 0) {
                minimapCtx.fillStyle = remotePlayer.color;
                minimapCtx.beginPath();
                minimapCtx.arc(remotePlayer.x * scaleX, remotePlayer.y * scaleY, 3, 0, Math.PI * 2);
                minimapCtx.fill();
            }
        }
    }
    
    // Draw enemies on minimap
    for (const enemy of enemies) {
        if (enemy.health > 0) {
            minimapCtx.fillStyle = 'red';
            minimapCtx.beginPath();
            minimapCtx.arc(enemy.x * scaleX, enemy.y * scaleY, 3, 0, Math.PI * 2);
            minimapCtx.fill();
        }
    }
}

// Helper function to get weapon by name
function weaponFromName(name) {
    switch (name) {
        case "Cannon": return WEAPONS.CANNON;
        case "MachineGun": return WEAPONS.MACHINE_GUN;
        case "Rocket": return WEAPONS.ROCKET;
        default: return WEAPONS.CANNON;
    }
}

// Create a new AI enemy
function createAIEnemy() {
    let validPosition = false;
    let enemyX, enemyY;
    
    while (!validPosition) {
        enemyX = Math.random() * (WORLD_WIDTH - 2 * SPRITE_SIZE) + SPRITE_SIZE;
        enemyY = Math.random() * (WORLD_HEIGHT - 2 * SPRITE_SIZE) + SPRITE_SIZE;
        
        // Check distance from player (at least 500 pixels)
        const dxPlayer = enemyX - player.x;
        const dyPlayer = enemyY - player.y;
        const distanceToPlayer = Math.sqrt(dxPlayer * dxPlayer + dyPlayer * dyPlayer);
        
        if (distanceToPlayer < 500) {
            continue; // Too close to player
        }
        
        validPosition = true;
        
        // Create temporary enemy object to check for collisions
        const tempEnemy = { 
            x: enemyX, 
            y: enemyY, 
            radius: SPRITE_SIZE * 0.75
        };
        
        // Check for collisions with obstacles
        for (const obstacle of obstacles) {
            if (checkCircleRectCollision(tempEnemy, obstacle)) {
                validPosition = false;
                break;
            }
        }
        
        // Additional check for minimum distance to any obstacle
        if (validPosition) {
            for (const obstacle of obstacles) {
                const dx = enemyX - (obstacle.x + obstacle.width/2);
                const dy = enemyY - (obstacle.y + obstacle.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 96) { // Enforce 96px minimum distance from obstacle centers
                    validPosition = false;
                    break;
                }
            }
        }
        
        // Check for collisions with other enemies
        for (const enemy of enemies) {
            const dx = enemyX - enemy.x;
            const dy = enemyY - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < SPRITE_SIZE * 2) {
                validPosition = false;
                break;
            }
        }
    }
    
    const enemy = new Enemy(enemyX, enemyY);
    enemy.isAI = true; // Mark as AI-controlled
    enemies.push(enemy);
}

// Function to draw remote players
function drawRemotePlayers(ctx, offsetX, offsetY) {
    if (!multiplayerManager) return;
    
    for (const playerId in multiplayerManager.players) {
        const remotePlayer = multiplayerManager.players[playerId];
        
        // Skip dead players
        if (remotePlayer.health <= 0) continue;
        
        ctx.save();
        
        // Apply player color filter
        ctx.filter = `sepia(1) hue-rotate(${getHueRotation(remotePlayer.color)})`;
        
        // Translate and rotate
        ctx.translate(remotePlayer.x - offsetX, remotePlayer.y - offsetY);
        ctx.rotate(remotePlayer.rotation);
        
        // Draw tank
        ctx.drawImage(
            images['tank.png'],
            -SPRITE_SIZE / 2,
            -SPRITE_SIZE / 2,
            SPRITE_SIZE,
            SPRITE_SIZE
        );
        
        // Draw player number
        ctx.fillStyle = remotePlayer.color;
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`P${remotePlayer.playerIndex + 1}`, 0, -SPRITE_SIZE / 2 - 5);
        
        ctx.restore();
    }
}

// Helper function for hue rotation
function getHueRotation(color) {
    switch (color) {
        case "#FF0000": return "0deg";     // Red (no rotation needed)
        case "#00FF00": return "120deg";   // Green
        case "#0000FF": return "240deg";   // Blue
        case "#FFFF00": return "60deg";    // Yellow
        case "#FF00FF": return "300deg";   // Magenta
        default: return "0deg";
    }
}

// Check if all enemies and players are destroyed
function checkGameWin() {
    // In multiplayer, we only win if all AI enemies and all other players are destroyed
    const allEnemiesDestroyed = enemies.every(enemy => enemy.health <= 0);
    
    let allRemotePlayersDestroyed = true;
    if (multiplayerManager) {
        allRemotePlayersDestroyed = Object.values(multiplayerManager.players)
            .every(remotePlayer => remotePlayer.health <= 0);
    }
    
    if (allEnemiesDestroyed && allRemotePlayersDestroyed) {
        gameWon = true;
        gameRunning = false;
        youWinElem.style.display = 'block';
        
        // Stop engine sound
        audioElements.engine.pause();
        engineSoundPlaying = false;
        
        trackEvent('game_win');
    }
}

// Event listeners
window.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
    
    // Weapon switching
    if (e.key === 'w' && !e.repeat && gameRunning && player.health > 0) {
        player.cycleWeapon();
    }
    
    // Firing
    if (e.key === ' ' && !e.repeat && gameRunning && player.health > 0) {
        player.fire();
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

