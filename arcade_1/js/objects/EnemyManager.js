class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        
        // Create enemy group
        this.enemies = scene.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });
        
        // Formation properties
        this.formationWidth = 10;
        this.formationHeight = 5;
        this.formationSpacing = { x: 50, y: 40 };
        this.formationOffsetY = 100;
        
        // Movement properties
        this.direction = 1; // 1 = right, -1 = left
        this.moveTimer = 0;
        this.moveDelay = 1000;
        this.moveDistance = 10;
        this.moveDownDistance = 20;
        
        // Current level
        this.currentLevel = 1;
        
        // Flag to track if wave creation is complete
        this.waveCreationComplete = true;
    }
    
    createWave(level) {
        // Clear any existing enemies
        this.enemies.clear(true, true);
        
        // Set wave creation flag to false - wave is being created
        this.waveCreationComplete = false;
        
        // Store current level and add debugging
        this.currentLevel = level;
        console.log(`EnemyManager.createWave: Creating wave for level ${level}, this.currentLevel set to ${this.currentLevel}`);
        
        // Adjust difficulty based on level
        this.adjustDifficulty(level);
        
        // Determine enemy distribution - make early levels MUCH easier
        // Significantly reduced enemy counts for early levels
        let basicEnemyCount, fastEnemyCount, bossEnemyCount;
        
        // Calculate enemy counts based on level with a much more gradual progression
        // Spread difficulty across all 255 levels
        if (level === 1) {
            // Level 1: Very few basic enemies, no fast or boss enemies
            basicEnemyCount = 2;
            fastEnemyCount = 0;
            bossEnemyCount = 0;
        } else if (level <= 5) {
            // Levels 2-5: Slowly introduce more basic enemies
            basicEnemyCount = 2 + Math.floor(level / 2);
            fastEnemyCount = 0;
            bossEnemyCount = 0;
        } else if (level <= 10) {
            // Levels 6-10: Introduce first fast enemy
            basicEnemyCount = 4 + Math.floor((level - 5) / 2);
            fastEnemyCount = 1;
            bossEnemyCount = 0;
        } else if (level <= 20) {
            // Levels 11-20: Slowly increase basic and fast enemies
            basicEnemyCount = 6 + Math.floor((level - 10) / 5);
            fastEnemyCount = 1 + Math.floor((level - 10) / 5);
            bossEnemyCount = 0;
        } else if (level <= 30) {
            // Levels 21-30: Introduce first boss
            basicEnemyCount = 8 + Math.floor((level - 20) / 5);
            fastEnemyCount = 3 + Math.floor((level - 20) / 10);
            bossEnemyCount = 1;
        } else if (level <= 50) {
            // Levels 31-50: Gradual increase
            basicEnemyCount = 10 + Math.floor((level - 30) / 10);
            fastEnemyCount = 4 + Math.floor((level - 30) / 10);
            bossEnemyCount = 1;
        } else if (level <= 100) {
            // Levels 51-100: Medium difficulty
            basicEnemyCount = 12 + Math.floor((level - 50) / 25);
            fastEnemyCount = 5 + Math.floor((level - 50) / 25);
            bossEnemyCount = 1 + Math.floor((level - 50) / 50);
        } else if (level <= 200) {
            // Levels 101-200: Higher difficulty
            basicEnemyCount = 14 + Math.floor((level - 100) / 50);
            fastEnemyCount = 6 + Math.floor((level - 100) / 50);
            bossEnemyCount = 2 + Math.floor((level - 100) / 100);
        } else {
            // Levels 201-255: Maximum difficulty
            basicEnemyCount = Math.min(20, 16 + Math.floor((level - 200) / 50));
            fastEnemyCount = Math.min(8, 7 + Math.floor((level - 200) / 100));
            bossEnemyCount = Math.min(3, 2 + Math.floor((level - 200) / 100));
        }
        
        console.log(`Level ${level} - Enemies: basic=${basicEnemyCount}, fast=${fastEnemyCount}, boss=${bossEnemyCount}`);
        
        // Create enemy formation
        this.createFormation(basicEnemyCount, fastEnemyCount, bossEnemyCount);
        
        // Play spawn sound - safely wrapped
        this.playSpawnSound();
    }
    
    playSpawnSound() {
        // Safely try to play enemy spawn sound
        try {
            if (!GAME.isMuted && this.scene.cache.audio.exists('enemy_spawn')) {
                this.scene.sound.play('enemy_spawn', { volume: 0.5 });
            }
        } catch (err) {
            console.warn("Could not play enemy_spawn sound:", err);
        }
    }
    
    createFormation(basicCount, fastCount, bossCount) {
        const scene = this.scene;
        const gameWidth = scene.cameras.main.width;
        
        // Calculate formation dimensions
        const totalEnemies = basicCount + fastCount + bossCount;
        const rows = Math.min(5, Math.ceil(totalEnemies / this.formationWidth));
        const cols = Math.min(this.formationWidth, totalEnemies);
        
        // Calculate starting position - ensure it's not too close to edges
        const startX = Math.max(50, (gameWidth - (cols - 1) * this.formationSpacing.x) / 2);
        
        // Ensure enemies start higher up on screen (further from player)
        const startY = this.formationOffsetY;
        
        console.log(`Creating enemy formation: ${rows} rows, ${cols} columns`);
        console.log(`Total enemies: basic=${basicCount}, fast=${fastCount}, boss=${bossCount}`);
        
        // Place enemies in formation
        let placedCount = 0;
        let enemiesLeft = totalEnemies;
        
        // Stagger enemy spawning with delays
        const spawnDelay = 300; // milliseconds between each enemy spawn
        
        // Place bosses first (at the top)
        for (let row = 0; row < rows && bossCount > 0; row++) {
            for (let col = 0; col < cols && bossCount > 0; col++) {
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                const enemyIndex = placedCount;
                
                // Stagger enemy spawning with a delay
                scene.time.delayedCall(enemyIndex * spawnDelay, () => {
                    console.log(`Creating boss enemy at (${x}, ${y})`);
                    new Enemy(scene, x, y, 'enemy_boss', 'boss', this.getBossHealth());
                    // Play spawn sound for first enemy only to avoid sound spam
                    if (enemyIndex === 0) this.playSpawnSound();
                });
                
                bossCount--;
                placedCount++;
                enemiesLeft--;
            }
        }
        
        // Place fast attackers next
        for (let row = 0; row < rows && fastCount > 0; row++) {
            for (let col = 0; col < cols && fastCount > 0; col++) {
                // Skip positions that already have bosses
                if (row * cols + col < placedCount - fastCount - bossCount) continue;
                
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                const enemyIndex = placedCount;
                
                // Stagger enemy spawning with a delay
                scene.time.delayedCall(enemyIndex * spawnDelay, () => {
                    console.log(`Creating fast enemy at (${x}, ${y})`);
                    new Enemy(scene, x, y, 'enemy_2', 'fast', this.getFastEnemyHealth());
                    // Play spawn sound for first enemy only if no bosses
                    if (enemyIndex === 0 && bossCount === 0) this.playSpawnSound();
                });
                
                fastCount--;
                placedCount++;
                enemiesLeft--;
            }
        }
        
        // Place basic enemies in remaining positions
        for (let row = 0; row < rows && basicCount > 0; row++) {
            for (let col = 0; col < cols && basicCount > 0; col++) {
                // Skip positions that already have enemies
                if (row * cols + col < placedCount - basicCount) continue;
                
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                const enemyIndex = placedCount;
                
                // Stagger enemy spawning with a delay
                scene.time.delayedCall(enemyIndex * spawnDelay, () => {
                    console.log(`Creating basic enemy at (${x}, ${y})`);
                    new Enemy(scene, x, y, 'enemy_1', 'basic', this.getBasicEnemyHealth());
                    // Play spawn sound for first enemy only if no bosses or fast enemies
                    if (enemyIndex === 0 && bossCount === 0 && fastCount === 0) this.playSpawnSound();
                    
                    // If this is the last enemy to be created, mark wave creation as complete
                    if (enemyIndex === totalEnemies - 1) {
                        this.waveCreationComplete = true;
                        console.log("Wave creation complete - all enemies spawned");
                    }
                });
                
                basicCount--;
                placedCount++;
                enemiesLeft--;
            }
        }
        
        // If no enemies were created at all, mark wave as complete immediately
        if (totalEnemies === 0) {
            this.waveCreationComplete = true;
            console.log("Wave creation complete - no enemies to spawn");
        }
    }
    
    update(time, delta) {
        // Skip if paused
        if (this.scene.isPaused) return;
        
        // Move formation
        if (time > this.moveTimer) {
            this.moveFormation();
            this.moveTimer = time + this.moveDelay;
        }
        
        // Update each enemy
        this.enemies.getChildren().forEach(enemy => {
            enemy.update(time, delta);
        });
    }
    
    moveFormation() {
        const enemies = this.enemies.getChildren();
        if (enemies.length === 0) return;
        
        const gameWidth = this.scene.cameras.main.width;
        
        // Check if formation should change direction
        let changeDirection = false;
        
        enemies.forEach(enemy => {
            // Only check basic enemies that follow the formation
            if (enemy.type !== 'basic') return;
            
            if ((this.direction > 0 && enemy.x > gameWidth - 50) || 
                (this.direction < 0 && enemy.x < 50)) {
                changeDirection = true;
            }
        });
        
        // Move enemies
        enemies.forEach(enemy => {
            // Only move basic enemies in formation
            if (enemy.type !== 'basic') return;
            
            if (changeDirection) {
                // Move down when changing direction
                enemy.y += this.moveDownDistance;
                
                // Check if enemies are getting too close to the player
                if (enemy.y > this.scene.cameras.main.height - 150) {
                    // Trigger game over if enemies reach the bottom
                    this.scene.gameOver();
                }
            } else {
                // Move sideways
                enemy.x += this.direction * this.moveDistance;
            }
        });
        
        // Change direction if needed
        if (changeDirection) {
            this.direction *= -1;
        }
    }
    
    getBasicEnemyHealth() {
        // Basic enemies get 1 health plus 1 for every 20 levels
        return 1 + Math.floor(this.currentLevel / 20);
    }
    
    getFastEnemyHealth() {
        // Fast enemies get 2 health plus 1 for every 15 levels
        return 2 + Math.floor(this.currentLevel / 15);
    }
    
    getBossHealth() {
        // Boss enemies get 5 health plus 1 for every 10 levels
        return 5 + Math.floor(this.currentLevel / 10);
    }
    
    adjustDifficulty(level) {
        // Calculate difficulty parameters based on level with a much more gradual progression
        // Spread difficulty across all 255 levels
        
        // For movement delay (higher = slower)
        if (level <= 10) {
            // Very slow movement in first 10 levels
            this.moveDelay = 1800 - (level * 30); // 1800ms -> 1500ms
        } else if (level <= 50) {
            // Gradually decrease delay from levels 11-50
            this.moveDelay = 1500 - ((level - 10) * 10); // 1500ms -> 1100ms
        } else if (level <= 100) {
            // Continue decreasing from levels 51-100
            this.moveDelay = 1100 - ((level - 50) * 5); // 1100ms -> 850ms
        } else if (level <= 200) {
            // Slower decrease from levels 101-200
            this.moveDelay = 850 - ((level - 100) * 2); // 850ms -> 650ms
        } else {
            // Final decrease from levels 201-255
            this.moveDelay = Math.max(400, 650 - ((level - 200) * 4)); // 650ms -> 400ms minimum
        }
        
        // For horizontal movement distance
        if (level <= 20) {
            // Small movements in early levels
            this.moveDistance = 5 + Math.floor(level / 10); // 5-7 pixels
        } else if (level <= 100) {
            // Gradually increase from levels 21-100
            this.moveDistance = 7 + Math.floor((level - 20) / 20); // 7-11 pixels
        } else {
            // Maximum movement for higher levels
            this.moveDistance = Math.min(15, 11 + Math.floor((level - 100) / 50)); // 11-15 pixels max
        }
        
        // For downward movement distance
        if (level <= 30) {
            // Minimal downward movement in early levels
            this.moveDownDistance = 10; // Fixed small downward movement
        } else if (level <= 100) {
            // Gradually increase from levels 31-100
            this.moveDownDistance = 10 + Math.floor((level - 30) / 14); // 10-15 pixels
        } else if (level <= 200) {
            // Continue increasing from levels 101-200
            this.moveDownDistance = 15 + Math.floor((level - 100) / 20); // 15-20 pixels
        } else {
            // Maximum downward movement for highest levels
            this.moveDownDistance = Math.min(30, 20 + Math.floor((level - 200) / 20)); // 20-30 pixels max
        }
        
        console.log(`Level ${level} - Difficulty: moveDelay=${this.moveDelay}, moveDistance=${this.moveDistance}, moveDownDistance=${this.moveDownDistance}`);
    }
}
