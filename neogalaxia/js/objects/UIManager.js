class UIManager {
    constructor(scene) {
        this.scene = scene;
        this.config = {
            fonts: {
                pixel: {
                    fontFamily: 'monospace',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#FFFFFF',
                    stroke: '#000000',
                    strokeThickness: 4
                }
            },
            colors: {
                healthFull: 0x00FF00,     // Green
                healthMedium: 0xFFFF00,   // Yellow
                healthLow: 0xFF0000,      // Red
                background: 0x222222,     // Dark gray
                powerupShield: 0x00FFFF,  // Cyan
                powerupSpeed: 0xFFFF00,   // Yellow
                powerupDouble: 0xFF00FF,  // Magenta
                scoreText: 0xFFFFFF       // White
            },
            padding: 10,
            healthBarWidth: 200,
            healthBarHeight: 20,
            lifeIconSize: 20
        };
        
        // Create container for all UI elements
        this.container = scene.add.container(0, 0);
        
        // Make container fixed to camera
        this.container.setScrollFactor(0);
        
        // Initialize UI elements
        this.createScoreDisplay();
        this.createHealthBar();
        this.createLivesCounter();
        this.createPowerUpIndicators();
    }
    
    // Score Display
    createScoreDisplay() {
        // Create pixelated score text
        this.scoreText = this.scene.add.text(
            this.config.padding, 
            this.config.padding, 
            'SCORE: 0', 
            this.config.fonts.pixel
        );
        
        // Add to UI container
        this.container.add(this.scoreText);
    }
    
    updateScore(score) {
        this.scoreText.setText('SCORE: ' + score);
        
        // Add a small scale animation for score changes
        this.scene.tweens.add({
            targets: this.scoreText,
            scale: { from: 1.1, to: 1 },
            duration: 200,
            ease: 'Quad.out'
        });
    }
    
    // Health Bar
    createHealthBar() {
        // Create graphics object for drawing the health bar
        this.healthBar = this.scene.add.graphics();
        
        // Add to UI container
        this.container.add(this.healthBar);
        
        // Initial render with full health
        this.updateHealthBar(100);
    }
    
    updateHealthBar(percentage) {
        // Ensure the percentage is between 0 and 100
        percentage = Phaser.Math.Clamp(percentage, 0, 100);
        
        // Clear previous graphics
        this.healthBar.clear();
        
        // Calculate position (below score text)
        const x = this.config.padding;
        const y = this.scoreText.height + (this.config.padding * 2);
        
        // Draw background
        this.healthBar.fillStyle(this.config.colors.background, 0.8);
        this.healthBar.fillRect(x, y, this.config.healthBarWidth, this.config.healthBarHeight);
        
        // Choose color based on health level
        let color = this.config.colors.healthFull;
        
        if (percentage < 30) {
            color = this.config.colors.healthLow;
        } else if (percentage < 60) {
            color = this.config.colors.healthMedium;
        }
        
        // Draw health segments (pixelated look)
        const segmentWidth = 8;
        const segmentCount = Math.floor((this.config.healthBarWidth / segmentWidth) * (percentage / 100));
        const segmentPadding = 2;
        
        this.healthBar.fillStyle(color, 1);
        
        for (let i = 0; i < segmentCount; i++) {
            this.healthBar.fillRect(
                x + (i * segmentWidth) + segmentPadding,
                y + segmentPadding,
                segmentWidth - (segmentPadding * 2),
                this.config.healthBarHeight - (segmentPadding * 2)
            );
        }
        
        // Add "HEALTH" label
        if (!this.healthLabel) {
            this.healthLabel = this.scene.add.text(
                x + this.config.healthBarWidth + 10,
                y + 2,
                'HEALTH',
                {
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    color: '#FFFFFF'
                }
            );
            this.container.add(this.healthLabel);
        }
    }
    
    // Lives Counter
    createLivesCounter() {
        // Create container for lives
        this.livesContainer = this.scene.add.container(
            this.scene.cameras.main.width - this.config.padding, 
            this.config.padding
        );
        
        // Create "LIVES" label
        this.livesLabel = this.scene.add.text(
            -80,
            4,
            'LIVES:',
            {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#FFFFFF'
            }
        );
        
        this.livesContainer.add(this.livesLabel);
        
        // Array to store life icons
        this.lifeIcons = [];
        
        // Add to UI container
        this.container.add(this.livesContainer);
        
        // Initial update with 3 lives
        this.updateLives(3);
    }
    
    updateLives(lives) {
        // Clear existing life icons
        this.lifeIcons.forEach(icon => icon.destroy());
        this.lifeIcons = [];
        
        // Create new life icons
        for (let i = 0; i < lives; i++) {
            // Create a ship-shaped polygon for each life
            const lifeIcon = this.scene.add.graphics();
            
            // Position each icon
            lifeIcon.x = -60 + (i * (this.config.lifeIconSize + 5));
            
            // Draw a small ship icon
            lifeIcon.fillStyle(0xFFFFFF, 1);
            
            // Draw triangular ship
            lifeIcon.beginPath();
            lifeIcon.moveTo(0, 0);
            lifeIcon.lineTo(this.config.lifeIconSize, 0);
            lifeIcon.lineTo(this.config.lifeIconSize / 2, this.config.lifeIconSize);
            lifeIcon.closePath();
            lifeIcon.fillPath();
            
            // Add to container and store reference
            this.livesContainer.add(lifeIcon);
            this.lifeIcons.push(lifeIcon);
        }
        
        // Animate new lives being added
        if (this.lifeIcons.length > 0) {
            const lastIcon = this.lifeIcons[this.lifeIcons.length - 1];
            this.scene.tweens.add({
                targets: lastIcon,
                scale: { from: 1.5, to: 1 },
                duration: 300,
                ease: 'Bounce.out'
            });
        }
    }
    
    // Power-Up Indicators
    createPowerUpIndicators() {
        // Create container for power-up indicators
        this.powerupContainer = this.scene.add.container(
            this.scene.cameras.main.width - this.config.padding,
            this.config.padding + 40
        );
        
        // Create "POWER-UPS" label
        this.powerupLabel = this.scene.add.text(
            -120,
            0,
            'POWER-UPS:',
            {
                fontFamily: 'monospace',
                fontSize: '16px',
                color: '#FFFFFF'
            }
        );
        
        this.powerupContainer.add(this.powerupLabel);
        
        // Object to store active power-up indicators
        this.powerupIcons = {
            shield: null,
            speed: null,
            doubleShot: null
        };
        
        // Add to UI container
        this.container.add(this.powerupContainer);
    }
    
    showPowerUp(type, duration) {
        // Remove existing power-up of this type if it exists
        if (this.powerupIcons[type]) {
            this.powerupIcons[type].destroy();
        }
        
        // Create new power-up icon
        const icon = this.scene.add.graphics();
        
        // Position based on type
        let xOffset = -100;
        let color;
        
        switch (type) {
            case 'shield':
                xOffset = -100;
                color = this.config.colors.powerupShield;
                break;
            case 'speed':
                xOffset = -70;
                color = this.config.colors.powerupSpeed;
                break;
            case 'doubleShot':
                xOffset = -40;
                color = this.config.colors.powerupDouble;
                break;
        }
        
        icon.x = xOffset;
        
        // Draw different shapes based on power-up type
        icon.fillStyle(color, 1);
        
        switch (type) {
            case 'shield':
                // Draw shield circle
                icon.fillCircle(10, 10, 10);
                break;
            case 'speed':
                // Draw speed arrow
                icon.fillTriangle(0, 15, 20, 15, 10, 0);
                break;
            case 'doubleShot':
                // Draw double shot squares
                icon.fillRect(3, 5, 7, 15);
                icon.fillRect(13, 5, 7, 15);
                break;
        }
        
        // Add to container and store reference
        this.powerupContainer.add(icon);
        this.powerupIcons[type] = icon;
        
        // Animate icon appearance
        this.scene.tweens.add({
            targets: icon,
            scale: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.out'
        });
        
        // Create timer bar under the icon
        const timerBar = this.scene.add.graphics();
        timerBar.x = icon.x - 5;
        timerBar.y = 25;
        this.powerupContainer.add(timerBar);
        
        // Update timer bar
        let timeLeft = duration;
        
        const timerEvent = this.scene.time.addEvent({
            delay: 100, // Update every 100ms
            callback: () => {
                timeLeft -= 100;
                
                // Redraw timer bar
                timerBar.clear();
                timerBar.fillStyle(color, 1);
                
                const width = Math.max(0, (timeLeft / duration) * 30);
                timerBar.fillRect(0, 0, width, 3);
                
                // Remove power-up icon when time expires
                if (timeLeft <= 0) {
                    this.hidePowerUp(type);
                    timerEvent.remove();
                    timerBar.destroy();
                }
            },
            repeat: duration / 100
        });
        
        // Store timer reference with the icon
        icon.timerEvent = timerEvent;
        icon.timerBar = timerBar;
    }
    
    hidePowerUp(type) {
        if (this.powerupIcons[type]) {
            // Clear timer if it exists
            if (this.powerupIcons[type].timerEvent) {
                this.powerupIcons[type].timerEvent.remove();
            }
            
            // Clear timer bar if it exists
            if (this.powerupIcons[type].timerBar) {
                this.powerupIcons[type].timerBar.destroy();
            }
            
            // Animate the icon fading out
            this.scene.tweens.add({
                targets: this.powerupIcons[type],
                alpha: 0,
                scale: 1.5,
                duration: 300,
                onComplete: () => {
                    this.powerupIcons[type].destroy();
                    this.powerupIcons[type] = null;
                }
            });
        }
    }
    
    // Resize method to handle different screen sizes
    resize(width, height) {
        // Update position of lives counter
        this.livesContainer.x = width - this.config.padding;
        
        // Update position of power-up indicators
        this.powerupContainer.x = width - this.config.padding;
    }
}
