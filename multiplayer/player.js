// Complete Player class with multiplayer enhancements
// Add this helper function if not already defined
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
}


class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.rotation = 0; // 0 radians = up/north
        this.health = 1000;
        this.currentWeaponIndex = 0;
        this.weapons = [
            WEAPONS.CANNON,
            WEAPONS.MACHINE_GUN,
            WEAPONS.ROCKET
        ];
        
        // Initialize weapon display
        const weaponIconElem = document.getElementById('weaponIcon');
        if (weaponIconElem) {
            weaponIconElem.style.backgroundImage = `url(assets/${this.currentWeapon.sprite})`;
        }
        
        this.invincible = false;
        this.invincibleTimer = 0;
        this.radius = SPRITE_SIZE / 2;
        this.sprite = images['tank.png'];
        this.playerIndex = 0; // Default is player 1 (for multiplayer)
        this.color = "#FF0000"; // Default color (red)
    }

    get currentWeapon() {
        return this.weapons[this.currentWeaponIndex];
    }

    cycleWeapon() {
        this.currentWeaponIndex = (this.currentWeaponIndex + 1) % this.weapons.length;
        const timestamp = Date.now();
        console.log(`[${timestamp}] Weapon switched to: ${this.currentWeapon.name}`);
        
        // Update weapon display
        const weaponNameElem = document.getElementById('weaponName');
        const weaponIconElem = document.getElementById('weaponIcon');
        
        if (weaponNameElem) {
            weaponNameElem.textContent = this.currentWeapon.name;
        }
        
        if (weaponIconElem) {
            weaponIconElem.style.backgroundImage = `url(assets/${this.currentWeapon.sprite})`;
        }
        
        // Play weapon switch sound
        playSound(audioElements.weaponSwitch);
    }

	move(deltaTime) {
		const moveSpeed = PLAYER_SPEED * deltaTime;
		
		// Only move if not destroyed
		if (this.health <= 0) return;

		// Store old position for collision resolution
		const oldX = this.x;
		const oldY = this.y;
		
		let isMoving = false;

		// Use reduced rotation speed on mobile
		const rotationSpeed = isMobileDevice() ? MOBILE_ROTATION_SPEED : PLAYER_ROTATION_SPEED;

		if (keysPressed['ArrowUp']) {
			// Move forward in direction of barrel
			this.x += Math.sin(this.rotation) * moveSpeed;
			this.y -= Math.cos(this.rotation) * moveSpeed;
			isMoving = true;
		}
		if (keysPressed['ArrowDown']) {
			// Move backward in opposite direction of barrel
			this.x -= Math.sin(this.rotation) * moveSpeed;
			this.y += Math.cos(this.rotation) * moveSpeed;
			isMoving = true;
		}
		if (keysPressed['ArrowLeft']) {
			this.rotation -= rotationSpeed;
		}
		if (keysPressed['ArrowRight']) {
			this.rotation += rotationSpeed;
		}
		
		// Handle engine sound
		if (isMoving && !engineSoundPlaying) {
			audioElements.engine.play().catch(err => {
				console.log("Engine audio play interrupted: " + err.message);
			});
			engineSoundPlaying = true;
		} else if (!isMoving && engineSoundPlaying) {
			audioElements.engine.pause();
			engineSoundPlaying = false;
		}

		// World bounds check
		this.x = Math.max(this.radius, Math.min(WORLD_WIDTH - this.radius, this.x));
		this.y = Math.max(this.radius, Math.min(WORLD_HEIGHT - this.radius, this.y));

		// Collision detection with obstacles
		if (this.checkCollisionWithObstacles()) {
			this.x = oldX;
			this.y = oldY;
		}

		// Update invincibility timer
		if (this.invincible) {
			this.invincibleTimer -= deltaTime * 1000; // Convert to ms
			if (this.invincibleTimer <= 0) {
				this.invincible = false;
			}
		}
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
            this.currentWeapon,
            true, // isPlayerProjectile
            multiplayerManager ? multiplayerManager.localPlayerId : null
        );
        
        projectiles.push(projectile);
        
        // Play firing sound
        playSound(audioElements.fire);
        
        // Broadcast projectile fired event in multiplayer
        if (multiplayerManager) {
            multiplayerManager.broadcastProjectileFired(projectile);
        }
    }

    takeDamage(amount) {
        if (!this.invincible) {
            this.health = Math.max(0, this.health - amount);
            healthDisplay.textContent = `Health: ${this.health}`;
            
            // Set invincibility
            this.invincible = true;
            this.invincibleTimer = INVINCIBILITY_DURATION;
            
            // Play hit sound
            playSound(audioElements.hit);

            // Check for game over
            if (this.health <= 0) {
                this.die();
            }
        }
    }

    die() {
        // Spawn rubble
        rubble.push({
            x: this.x,
            y: this.y,
            sprite: images['rubble.png']
        });

        // Show game over screen
        gameRunning = false;
        gameOverElem.style.display = 'block';
        
        // Stop engine sound
        audioElements.engine.pause();
        engineSoundPlaying = false;
        
        // Track game over
        trackEvent('game_over');
    }

    getHueRotation() {
        // Calculate hue rotation based on player color
        switch (this.color) {
            case "#FF0000": return "0deg";     // Red (no rotation needed)
            case "#00FF00": return "120deg";   // Green
            case "#0000FF": return "240deg";   // Blue
            case "#FFFF00": return "60deg";    // Yellow
            case "#FF00FF": return "300deg";   // Magenta
            default: return "0deg";
        }
    }

    draw(ctx, offsetX, offsetY) {
        ctx.save();
        
        // Apply tinting if invincible
        if (this.invincible) {
            ctx.filter = 'sepia(1) hue-rotate(-50deg)'; // Red tint
        } else if (this.color && multiplayerManager) {
            // Apply player color tint in multiplayer mode
            ctx.filter = `sepia(1) hue-rotate(${this.getHueRotation()})`;
        }
        
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
        
        // In multiplayer mode, draw player number above tank
        if (multiplayerManager) {
            ctx.fillStyle = this.color;
            ctx.font = "bold 16px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`P${this.playerIndex + 1}`, 0, -SPRITE_SIZE / 2 - 5);
        }
        
        ctx.restore();
    }
}