// Script to generate placeholder textures for the dungeon game

// Function to create a canvas and return its context
function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas.getContext('2d');
}

// Function to save a canvas as a PNG file
function saveCanvas(ctx, filename) {
    const link = document.createElement('a');
    link.download = filename;
    link.href = ctx.canvas.toDataURL('image/png');
    link.click();
}

// Generate stone wall texture
function generateStoneWall() {
    const ctx = createCanvas(64, 64);
    
    // Background
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, 64, 64);
    
    // Stone pattern
    ctx.fillStyle = '#777';
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const offsetX = x * 16;
            const offsetY = y * 16;
            
            // Alternate stone pattern
            if ((x + y) % 2 === 0) {
                ctx.fillRect(offsetX + 1, offsetY + 1, 14, 14);
            } else {
                ctx.fillRect(offsetX + 2, offsetY + 2, 12, 12);
            }
        }
    }
    
    // Add some noise
    ctx.fillStyle = '#666';
    for (let i = 0; i < 100; i++) {
        const x = Math.floor(Math.random() * 64);
        const y = Math.floor(Math.random() * 64);
        ctx.fillRect(x, y, 1, 1);
    }
    
    saveCanvas(ctx, 'stone_wall.png');
}

// Generate brick wall texture
function generateBrickWall() {
    const ctx = createCanvas(64, 64);
    
    // Background
    ctx.fillStyle = '#a52a2a';
    ctx.fillRect(0, 0, 64, 64);
    
    // Brick pattern
    ctx.fillStyle = '#8b0000';
    
    // Horizontal lines (mortar)
    for (let y = 0; y < 64; y += 16) {
        ctx.fillRect(0, y, 64, 2);
    }
    
    // Vertical lines (mortar)
    for (let x = 0; x < 64; x += 16) {
        ctx.fillRect(x, 0, 2, 64);
    }
    
    // Offset every other row
    for (let y = 0; y < 64; y += 32) {
        ctx.fillRect(8, y + 16, 64, 2);
    }
    
    saveCanvas(ctx, 'brick_wall.png');
}

// Generate wood wall texture
function generateWoodWall() {
    const ctx = createCanvas(64, 64);
    
    // Background
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, 64, 64);
    
    // Wood grain
    ctx.fillStyle = '#a0522d';
    for (let i = 0; i < 8; i++) {
        ctx.fillRect(0, i * 8, 64, 4);
    }
    
    // Wood knots
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(16, 16, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(48, 40, 5, 0, Math.PI * 2);
    ctx.fill();
    
    saveCanvas(ctx, 'wood_wall.png');
}

// Generate door textures
function generateDoors() {
    // Closed door
    const ctxClosed = createCanvas(64, 64);
    
    // Door background
    ctxClosed.fillStyle = '#8b4513';
    ctxClosed.fillRect(0, 0, 64, 64);
    
    // Door frame
    ctxClosed.fillStyle = '#654321';
    ctxClosed.fillRect(0, 0, 64, 4);
    ctxClosed.fillRect(0, 60, 64, 4);
    ctxClosed.fillRect(0, 0, 4, 64);
    ctxClosed.fillRect(60, 0, 4, 64);
    
    // Door handle
    ctxClosed.fillStyle = '#ffd700';
    ctxClosed.beginPath();
    ctxClosed.arc(52, 32, 4, 0, Math.PI * 2);
    ctxClosed.fill();
    
    saveCanvas(ctxClosed, 'door_closed.png');
    
    // Open door
    const ctxOpen = createCanvas(64, 64);
    
    // Door frame only
    ctxOpen.fillStyle = '#654321';
    ctxOpen.fillRect(0, 0, 64, 4);
    ctxOpen.fillRect(0, 60, 64, 4);
    ctxOpen.fillRect(0, 0, 4, 64);
    ctxOpen.fillRect(60, 0, 4, 64);
    
    // Darkness beyond
    ctxOpen.fillStyle = '#000';
    ctxOpen.fillRect(4, 4, 56, 56);
    
    saveCanvas(ctxOpen, 'door_open.png');
}

// Generate player hand sprite
function generatePlayerHand() {
    const ctx = createCanvas(64, 64);
    
    // Transparent background
    ctx.clearRect(0, 0, 64, 64);
    
    // Hand/arm
    ctx.fillStyle = '#ffdab9';
    ctx.fillRect(24, 32, 16, 32);
    
    // Sword handle
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(28, 16, 8, 16);
    
    // Sword blade
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(28, 0, 8, 16);
    
    saveCanvas(ctx, 'player_hand.png');
}

// Generate skeleton sprite
function generateSkeletonIdle() {
    const ctx = createCanvas(64, 64);
    
    // Transparent background
    ctx.clearRect(0, 0, 64, 64);
    
    // Skeleton body
    ctx.fillStyle = '#f8f8ff';
    
    // Head
    ctx.beginPath();
    ctx.arc(32, 16, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillRect(24, 28, 16, 24);
    
    // Arms
    ctx.fillRect(16, 28, 8, 16);
    ctx.fillRect(40, 28, 8, 16);
    
    // Legs
    ctx.fillRect(24, 52, 8, 12);
    ctx.fillRect(32, 52, 8, 12);
    
    // Eyes
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(28, 14, 2, 0, Math.PI * 2);
    ctx.arc(36, 14, 2, 0, Math.PI * 2);
    ctx.fill();
    
    saveCanvas(ctx, 'skeleton_idle.png');
}

// Generate health potion sprite
function generateHealthPotion() {
    const ctx = createCanvas(32, 32);
    
    // Transparent background
    ctx.clearRect(0, 0, 32, 32);
    
    // Bottle
    ctx.fillStyle = '#8b0000';
    ctx.fillRect(10, 12, 12, 16);
    
    // Bottle neck
    ctx.fillStyle = '#a52a2a';
    ctx.fillRect(12, 8, 8, 4);
    
    // Bottle cap
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(12, 4, 8, 4);
    
    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(14, 14, 4, 8);
    
    saveCanvas(ctx, 'health_potion.png');
}

// Generate gold key sprite
function generateGoldKey() {
    const ctx = createCanvas(32, 32);
    
    // Transparent background
    ctx.clearRect(0, 0, 32, 32);
    
    // Key handle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(10, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Key hole
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, 10, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Key shaft
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(16, 8, 12, 4);
    
    // Key teeth
    ctx.fillRect(22, 12, 2, 4);
    ctx.fillRect(26, 12, 2, 6);
    
    saveCanvas(ctx, 'key_gold.png');
}

// Generate chest sprites
function generateChest() {
    // Closed chest
    const ctxClosed = createCanvas(64, 64);
    
    // Transparent background
    ctxClosed.clearRect(0, 0, 64, 64);
    
    // Chest body
    ctxClosed.fillStyle = '#8b4513';
    ctxClosed.fillRect(8, 24, 48, 32);
    
    // Chest lid
    ctxClosed.fillStyle = '#a0522d';
    ctxClosed.fillRect(8, 16, 48, 8);
    
    // Chest lock
    ctxClosed.fillStyle = '#ffd700';
    ctxClosed.fillRect(28, 20, 8, 4);
    
    // Chest details
    ctxClosed.fillStyle = '#654321';
    ctxClosed.fillRect(8, 40, 48, 2);
    ctxClosed.fillRect(16, 24, 2, 32);
    ctxClosed.fillRect(46, 24, 2, 32);
    
    saveCanvas(ctxClosed, 'chest_closed.png');
    
    // Open chest
    const ctxOpen = createCanvas(64, 64);
    
    // Transparent background
    ctxOpen.clearRect(0, 0, 64, 64);
    
    // Chest body
    ctxOpen.fillStyle = '#8b4513';
    ctxOpen.fillRect(8, 24, 48, 32);
    
    // Chest lid (open)
    ctxOpen.fillStyle = '#a0522d';
    ctxOpen.fillRect(8, 8, 48, 8);
    
    // Chest lock (open)
    ctxOpen.fillStyle = '#ffd700';
    ctxOpen.fillRect(28, 8, 8, 4);
    
    // Chest details
    ctxOpen.fillStyle = '#654321';
    ctxOpen.fillRect(8, 40, 48, 2);
    ctxOpen.fillRect(16, 24, 2, 32);
    ctxOpen.fillRect(46, 24, 2, 32);
    
    // Chest interior
    ctxOpen.fillStyle = '#000';
    ctxOpen.fillRect(10, 26, 44, 14);
    
    // Chest treasure glow
    ctxOpen.fillStyle = 'rgba(255, 215, 0, 0.5)';
    ctxOpen.fillRect(16, 30, 32, 6);
    
    saveCanvas(ctxOpen, 'chest_open.png');
}

// Generate floor texture
function generateFloorTexture() {
    const ctx = createCanvas(64, 64);
    
    // Background
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, 64, 64);
    
    // Floor pattern
    ctx.fillStyle = '#444';
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            if ((x + y) % 2 === 0) {
                ctx.fillRect(x * 8, y * 8, 8, 8);
            }
        }
    }
    
    saveCanvas(ctx, 'floor_stone.png');
}

// Generate ceiling texture
function generateCeilingTexture() {
    const ctx = createCanvas(64, 64);
    
    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 64, 64);
    
    // Ceiling pattern
    ctx.fillStyle = '#222';
    for (let i = 0; i < 64; i += 16) {
        ctx.fillRect(0, i, 64, 1);
        ctx.fillRect(i, 0, 1, 64);
    }
    
    saveCanvas(ctx, 'ceiling_stone.png');
}

// Generate secret wall texture
function generateSecretWall() {
    const ctx = createCanvas(64, 64);
    
    // Background (similar to stone wall but with a subtle difference)
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, 64, 64);
    
    // Stone pattern
    ctx.fillStyle = '#777';
    for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
            const offsetX = x * 16;
            const offsetY = y * 16;
            
            // Alternate stone pattern
            if ((x + y) % 2 === 0) {
                ctx.fillRect(offsetX + 1, offsetY + 1, 14, 14);
            } else {
                ctx.fillRect(offsetX + 2, offsetY + 2, 12, 12);
            }
        }
    }
    
    // Secret mark (subtle)
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fill();
    
    saveCanvas(ctx, 'secret_wall.png');
}

// Generate goblin sprite
function generateGoblinSprites() {
    // Goblin idle
    const ctxIdle = createCanvas(64, 64);
    
    // Transparent background
    ctxIdle.clearRect(0, 0, 64, 64);
    
    // Goblin body (green)
    ctxIdle.fillStyle = '#0a5';
    
    // Head
    ctxIdle.beginPath();
    ctxIdle.arc(32, 16, 10, 0, Math.PI * 2);
    ctxIdle.fill();
    
    // Body
    ctxIdle.fillRect(26, 26, 12, 20);
    
    // Arms
    ctxIdle.fillRect(18, 26, 8, 12);
    ctxIdle.fillRect(38, 26, 8, 12);
    
    // Legs
    ctxIdle.fillRect(26, 46, 6, 10);
    ctxIdle.fillRect(32, 46, 6, 10);
    
    // Eyes
    ctxIdle.fillStyle = '#f00';
    ctxIdle.beginPath();
    ctxIdle.arc(28, 14, 2, 0, Math.PI * 2);
    ctxIdle.arc(36, 14, 2, 0, Math.PI * 2);
    ctxIdle.fill();
    
    saveCanvas(ctxIdle, 'goblin_idle.png');
    
    // Goblin attack
    const ctxAttack = createCanvas(64, 64);
    
    // Transparent background
    ctxAttack.clearRect(0, 0, 64, 64);
    
    // Goblin body (green)
    ctxAttack.fillStyle = '#0a5';
    
    // Head
    ctxAttack.beginPath();
    ctxAttack.arc(32, 16, 10, 0, Math.PI * 2);
    ctxAttack.fill();
    
    // Body
    ctxAttack.fillRect(26, 26, 12, 20);
    
    // Arms (attacking position)
    ctxAttack.fillRect(14, 20, 12, 6);
    ctxAttack.fillRect(38, 20, 12, 6);
    
    // Legs
    ctxAttack.fillRect(26, 46, 6, 10);
    ctxAttack.fillRect(32, 46, 6, 10);
    
    // Eyes (angry)
    ctxAttack.fillStyle = '#f00';
    ctxAttack.beginPath();
    ctxAttack.arc(28, 14, 3, 0, Math.PI * 2);
    ctxAttack.arc(36, 14, 3, 0, Math.PI * 2);
    ctxAttack.fill();
    
    saveCanvas(ctxAttack, 'goblin_attack.png');
}

// Generate wizard sprite
function generateWizardSprites() {
    // Wizard idle
    const ctxIdle = createCanvas(64, 64);
    
    // Transparent background
    ctxIdle.clearRect(0, 0, 64, 64);
    
    // Wizard body (purple)
    ctxIdle.fillStyle = '#609';
    
    // Robe
    ctxIdle.beginPath();
    ctxIdle.moveTo(22, 20);
    ctxIdle.lineTo(42, 20);
    ctxIdle.lineTo(46, 56);
    ctxIdle.lineTo(18, 56);
    ctxIdle.closePath();
    ctxIdle.fill();
    
    // Head
    ctxIdle.fillStyle = '#ffdab9';
    ctxIdle.beginPath();
    ctxIdle.arc(32, 16, 8, 0, Math.PI * 2);
    ctxIdle.fill();
    
    // Hat
    ctxIdle.fillStyle = '#609';
    ctxIdle.beginPath();
    ctxIdle.moveTo(20, 16);
    ctxIdle.lineTo(32, 0);
    ctxIdle.lineTo(44, 16);
    ctxIdle.closePath();
    ctxIdle.fill();
    
    // Eyes
    ctxIdle.fillStyle = '#000';
    ctxIdle.beginPath();
    ctxIdle.arc(29, 16, 1, 0, Math.PI * 2);
    ctxIdle.arc(35, 16, 1, 0, Math.PI * 2);
    ctxIdle.fill();
    
    saveCanvas(ctxIdle, 'dark_wizard_idle.png');
    
    // Wizard casting
    const ctxCast = createCanvas(64, 64);
    
    // Transparent background
    ctxCast.clearRect(0, 0, 64, 64);
    
    // Wizard body (purple)
    ctxCast.fillStyle = '#609';
    
    // Robe
    ctxCast.beginPath();
    ctxCast.moveTo(22, 20);
    ctxCast.lineTo(42, 20);
    ctxCast.lineTo(46, 56);
    ctxCast.lineTo(18, 56);
    ctxCast.closePath();
    ctxCast.fill();
    
    // Head
    ctxCast.fillStyle = '#ffdab9';
    ctxCast.beginPath();
    ctxCast.arc(32, 16, 8, 0, Math.PI * 2);
    ctxCast.fill();
    
    // Hat
    ctxCast.fillStyle = '#609';
    ctxCast.beginPath();
    ctxCast.moveTo(20, 16);
    ctxCast.lineTo(32, 0);
    ctxCast.lineTo(44, 16);
    ctxCast.closePath();
    ctxCast.fill();
    
    // Eyes (glowing)
    ctxCast.fillStyle = '#0ff';
    ctxCast.beginPath();
    ctxCast.arc(29, 16, 2, 0, Math.PI * 2);
    ctxCast.arc(35, 16, 2, 0, Math.PI * 2);
    ctxCast.fill();
    
    // Casting hands
    ctxCast.fillStyle = '#ffdab9';
    ctxCast.beginPath();
    ctxCast.arc(48, 30, 4, 0, Math.PI * 2);
    ctxCast.fill();
    
    // Magic effect
    ctxCast.fillStyle = 'rgba(0, 255, 255, 0.5)';
    ctxCast.beginPath();
    ctxCast.arc(52, 30, 8, 0, Math.PI * 2);
    ctxCast.fill();
    
    saveCanvas(ctxCast, 'dark_wizard_cast.png');
}

// Generate boss sprite
function generateBossSprites() {
    // Boss idle
    const ctxIdle = createCanvas(64, 64);
    
    // Transparent background
    ctxIdle.clearRect(0, 0, 64, 64);
    
    // Boss body (dark red)
    ctxIdle.fillStyle = '#900';
    
    // Larger body
    ctxIdle.fillRect(22, 24, 20, 32);
    
    // Head
    ctxIdle.beginPath();
    ctxIdle.arc(32, 16, 14, 0, Math.PI * 2);
    ctxIdle.fill();
    
    // Horns
    ctxIdle.beginPath();
    ctxIdle.moveTo(24, 10);
    ctxIdle.lineTo(18, 0);
    ctxIdle.lineTo(26, 8);
    ctxIdle.closePath();
    ctxIdle.fill();
    
    ctxIdle.beginPath();
    ctxIdle.moveTo(40, 10);
    ctxIdle.lineTo(46, 0);
    ctxIdle.lineTo(38, 8);
    ctxIdle.closePath();
    ctxIdle.fill();
    
    // Eyes
    ctxIdle.fillStyle = '#ff0';
    ctxIdle.beginPath();
    ctxIdle.arc(26, 14, 3, 0, Math.PI * 2);
    ctxIdle.arc(38, 14, 3, 0, Math.PI * 2);
    ctxIdle.fill();
    
    saveCanvas(ctxIdle, 'boss_idle.png');
    
    // Boss attack
    const ctxAttack = createCanvas(64, 64);
    
    // Transparent background
    ctxAttack.clearRect(0, 0, 64, 64);
    
    // Boss body (dark red)
    ctxAttack.fillStyle = '#900';
    
    // Larger body
    ctxAttack.fillRect(22, 24, 20, 32);
    
    // Head
    ctxAttack.beginPath();
    ctxAttack.arc(32, 16, 14, 0, Math.PI * 2);
    ctxAttack.fill();
    
    // Horns
    ctxAttack.beginPath();
    ctxAttack.moveTo(24, 10);
    ctxAttack.lineTo(18, 0);
    ctxAttack.lineTo(26, 8);
    ctxAttack.closePath();
    ctxAttack.fill();
    
    ctxAttack.beginPath();
    ctxAttack.moveTo(40, 10);
    ctxAttack.lineTo(46, 0);
    ctxAttack.lineTo(38, 8);
    ctxAttack.closePath();
    ctxAttack.fill();
    
    // Eyes (angry)
    ctxAttack.fillStyle = '#f00';
    ctxAttack.beginPath();
    ctxAttack.arc(26, 14, 4, 0, Math.PI * 2);
    ctxAttack.arc(38, 14, 4, 0, Math.PI * 2);
    ctxAttack.fill();
    
    // Attack claws
    ctxAttack.fillStyle = '#600';
    ctxAttack.beginPath();
    ctxAttack.moveTo(16, 30);
    ctxAttack.lineTo(10, 26);
    ctxAttack.lineTo(14, 34);
    ctxAttack.lineTo(8, 32);
    ctxAttack.lineTo(16, 38);
    ctxAttack.closePath();
    ctxAttack.fill();
    
    ctxAttack.beginPath();
    ctxAttack.moveTo(48, 30);
    ctxAttack.lineTo(54, 26);
    ctxAttack.lineTo(50, 34);
    ctxAttack.lineTo(56, 32);
    ctxAttack.lineTo(48, 38);
    ctxAttack.closePath();
    ctxAttack.fill();
    
    saveCanvas(ctxAttack, 'boss_attack.png');
}

// Generate silver key sprite
function generateSilverKey() {
    const ctx = createCanvas(32, 32);
    
    // Transparent background
    ctx.clearRect(0, 0, 32, 32);
    
    // Key handle
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.arc(10, 10, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Key hole
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(10, 10, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Key shaft
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(16, 8, 12, 4);
    
    // Key teeth
    ctx.fillRect(22, 12, 2, 4);
    ctx.fillRect(26, 12, 2, 6);
    
    saveCanvas(ctx, 'key_silver.png');
}

// Generate crossbow sprite
function generateCrossbow() {
    const ctx = createCanvas(64, 64);
    
    // Transparent background
    ctx.clearRect(0, 0, 64, 64);
    
    // Crossbow body
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(24, 32, 16, 32);
    
    // Crossbow horizontal part
    ctx.fillRect(8, 36, 48, 6);
    
    // Bowstring
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(8, 39);
    ctx.lineTo(24, 32);
    ctx.moveTo(56, 39);
    ctx.lineTo(40, 32);
    ctx.stroke();
    
    // Arrow
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(24, 20, 2, 12);
    
    // Arrow tip
    ctx.fillStyle = '#c0c0c0';
    ctx.beginPath();
    ctx.moveTo(25, 16);
    ctx.lineTo(28, 20);
    ctx.lineTo(22, 20);
    ctx.closePath();
    ctx.fill();
    
    saveCanvas(ctx, 'crossbow.png');
}

// Generate HUD elements
function generateHudElements() {
    // Health bar
    const ctxHealth = createCanvas(200, 20);
    ctxHealth.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctxHealth.fillRect(0, 0, 200, 20);
    ctxHealth.fillStyle = '#f00';
    ctxHealth.fillRect(2, 2, 196, 16);
    saveCanvas(ctxHealth, 'hud_healthbar.png');
    
    // Crosshair
    const ctxCrosshair = createCanvas(32, 32);
    ctxCrosshair.strokeStyle = '#fff';
    ctxCrosshair.lineWidth = 2;
    ctxCrosshair.beginPath();
    ctxCrosshair.moveTo(16, 8);
    ctxCrosshair.lineTo(16, 24);
    ctxCrosshair.moveTo(8, 16);
    ctxCrosshair.lineTo(24, 16);
    ctxCrosshair.stroke();
    saveCanvas(ctxCrosshair, 'hud_crosshair.png');
    
    // Inventory frame
    const ctxInvFrame = createCanvas(64, 64);
    ctxInvFrame.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctxInvFrame.fillRect(0, 0, 64, 64);
    ctxInvFrame.strokeStyle = '#fff';
    ctxInvFrame.lineWidth = 2;
    ctxInvFrame.strokeRect(2, 2, 60, 60);
    saveCanvas(ctxInvFrame, 'inventory_frame.png');
    
    // Inventory selected
    const ctxInvSelected = createCanvas(64, 64);
    ctxInvSelected.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctxInvSelected.fillRect(0, 0, 64, 64);
    ctxInvSelected.strokeStyle = '#ff0';
    ctxInvSelected.lineWidth = 2;
    ctxInvSelected.strokeRect(2, 2, 60, 60);
    saveCanvas(ctxInvSelected, 'inventory_selected.png');
}

// Generate all textures
function generateAllTextures() {
    // Wall textures
    generateStoneWall();
    generateBrickWall();
    generateWoodWall();
    generateSecretWall();
    
    // Floor and ceiling
    generateFloorTexture();
    generateCeilingTexture();
    
    // Doors
    generateDoors();
    
    // Player items
    generatePlayerHand();
    generateCrossbow();
    
    // Enemies
    generateSkeletonIdle();
    generateGoblinSprites();
    generateWizardSprites();
    generateBossSprites();
    
    // Items
    generateHealthPotion();
    generateGoldKey();
    generateSilverKey();
    generateChest();
    
    // UI elements
    generateHudElements();
}

// Call the function to generate all textures
generateAllTextures();
