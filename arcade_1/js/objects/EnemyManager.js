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
    }
    
    createWave(level) {
        // Clear any existing enemies
        this.enemies.clear(true, true);
        
        // Store current level
        this.currentLevel = level;
        
        // Adjust difficulty based on level
        this.adjustDifficulty(level);
        
        // Determine enemy distribution
        const basicEnemyCount = Math.min(40, 20 + Math.floor(level / 10) * 5);
        const fastEnemyCount = Math.min(10, Math.floor(level / 5));
        const bossEnemyCount = Math.min(3, Math.floor(level / 20));
        
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
        
        // Calculate starting position
        const startX = (gameWidth - (cols - 1) * this.formationSpacing.x) / 2;
        const startY = this.formationOffsetY;
        
        // Place enemies in formation
        let placedCount = 0;
        let enemiesLeft = totalEnemies;
        
        // Place bosses first (at the top)
        for (let row = 0; row < rows && bossCount > 0; row++) {
            for (let col = 0; col < cols && bossCount > 0; col++) {
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                
                new Enemy(scene, x, y, 'enemy_boss', 'boss', this.getBossHealth());
                bossCount--;
                placedCount++;
                enemiesLeft--;
            }
        }
        
        // Place fast attackers next
        for (let row = 0; row < rows && fastCount > 0; row++) {
            for (let col = 0; col < cols && fastCount > 0; col++) {
                // Skip positions that already have bosses
                if (row * cols + col < placedCount) continue;
                
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                
                new Enemy(scene, x, y, 'enemy_2', 'fast', this.getFastEnemyHealth());
                fastCount--;
                placedCount++;
                enemiesLeft--;
            }
        }
        
        // Place basic enemies in remaining positions
        for (let row = 0; row < rows && basicCount > 0; row++) {
            for (let col = 0; col < cols && basicCount > 0; col++) {
                // Skip positions that already have enemies
                if (row * cols + col < placedCount) continue;
                
                const x = startX + col * this.formationSpacing.x;
                const y = startY + row * this.formationSpacing.y;
                
                new Enemy(scene, x, y, 'enemy_1', 'basic', this.getBasicEnemyHealth());
                basicCount--;
                placedCount++;
                enemiesLeft--;
            }
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
        // Adjust movement speed based on level
        this.moveDelay = Math.max(200, 1000 - (level * 10));
        this.moveDistance = Math.min(25, 10 + Math.floor(level / 20) * 5);
        
        // Make enemies move down faster at higher levels
        this.moveDownDistance = Math.min(40, 20 + Math.floor(level / 15) * 5);
    }
}
