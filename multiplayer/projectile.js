// Complete Projectile class with multiplayer enhancements
class Projectile {
    constructor(x, y, rotation, weapon, isPlayerProjectile, playerId = null) {
        this.x = x;
        this.y = y;
        this.rotation = rotation;
        this.speed = weapon.speed;
        this.damage = weapon.damage;
        this.weapon = weapon;
        this.sprite = images[weapon.sprite];
        this.isPlayerProjectile = isPlayerProjectile;
        this.playerId = playerId; // ID of the player who fired it (null for AI)
        this.radius = SPRITE_SIZE / 4; // Smaller collision radius
        this.creationTime = Date.now();
    }

    update(deltaTime) {
        // Move the projectile
        const moveSpeed = this.speed * deltaTime;
        this.x += Math.sin(this.rotation) * moveSpeed;
        this.y -= Math.cos(this.rotation) * moveSpeed;

        // Check for lifetime
        if (Date.now() - this.creationTime > PROJECTILE_LIFESPAN) {
            return true; // Mark for removal
        }

        // Check for world bounds
        if (
            this.x < 0 || 
            this.x > WORLD_WIDTH || 
            this.y < 0 || 
            this.y > WORLD_HEIGHT
        ) {
            return true; // Mark for removal
        }

        // Check for collision with obstacles
        for (const obstacle of obstacles) {
            if (checkCircleRectCollision(this, obstacle)) {
                this.explode();
                return true; // Mark for removal
            }
        }

        // If this is a local player projectile
        if (this.isPlayerProjectile && (!this.playerId || this.playerId === multiplayerManager?.localPlayerId)) {
            // Check for collision with enemies (AI)
            for (const enemy of enemies) {
                if (enemy.health > 0) {
                    const dx = this.x - enemy.x;
                    const dy = this.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.radius + enemy.radius) {
                        enemy.takeDamage(this.damage);
                        this.explode();
                        return true; // Mark for removal
                    }
                }
            }
            
            // Check for collision with remote players in multiplayer
            if (multiplayerManager) {
                for (const playerId in multiplayerManager.players) {
                    const remotePlayer = multiplayerManager.players[playerId];
                    
                    if (remotePlayer.health > 0) {
                        const dx = this.x - remotePlayer.x;
                        const dy = this.y - remotePlayer.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < this.radius + SPRITE_SIZE / 2) {
                            // Broadcast hit
                            multiplayerManager.broadcastHit("player", playerId, this.damage);
                            this.explode();
                            return true; // Mark for removal
                        }
                    }
                }
            }
        }
        // If this is a remote player's projectile
        else if (this.playerId && this.playerId !== multiplayerManager?.localPlayerId) {
            // Check for collision with local player
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius + player.radius) {
                player.takeDamage(this.damage);
                this.explode();
                return true; // Mark for removal
            }
            
            // Check for collision with AI enemies
            for (const enemy of enemies) {
                if (enemy.health > 0 && enemy.isAI) {
                    const dx = this.x - enemy.x;
                    const dy = this.y - enemy.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < this.radius + enemy.radius) {
                        enemy.takeDamage(this.damage);
                        this.explode();
                        return true; // Mark for removal
                    }
                }
            }
        }
        // If this is an AI enemy projectile
        else if (!this.isPlayerProjectile && !this.playerId) {
            // Check for collision with local player
            const dx = this.x - player.x;
            const dy = this.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.radius + player.radius) {
                player.takeDamage(this.damage);
                this.explode();
                return true; // Mark for removal
            }
            
            // Check for collision with remote players in multiplayer
            if (multiplayerManager) {
                for (const playerId in multiplayerManager.players) {
                    const remotePlayer = multiplayerManager.players[playerId];
                    
                    if (remotePlayer.health > 0) {
                        const dx = this.x - remotePlayer.x;
                        const dy = this.y - remotePlayer.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < this.radius + SPRITE_SIZE / 2) {
                            // We don't need to do anything here as the remote player
                            // will handle their own hit detection
                            this.explode();
                            return true; // Mark for removal
                        }
                    }
                }
            }
        }

        return false; // Keep the projectile
    }

    explode() {
        // Create explosion at projectile position
        explosions.push({
            x: this.x,
            y: this.y,
            creationTime: Date.now(),
            sprite: images['explosion.png']
        });
        
        // Play explosion sound
        playSound(audioElements.explosion);
    }

    draw(ctx, offsetX, offsetY) {
        ctx.save();
        
        // Translate and rotate
        ctx.translate(this.x - offsetX, this.y - offsetY);
        ctx.rotate(this.rotation);
        
        // Draw projectile centered
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