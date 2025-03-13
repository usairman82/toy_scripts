// Mobile Controls for Tank Game
// Add this to your game.js file or create a new mobile-controls.js file and include it
// Adjust game canvas size to fit mobile screens properly
function adjustCanvasForMobile() {
    // Only run on mobile devices
    if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        return;
    }
    
    const gameCanvas = document.getElementById('gameCanvas');
    if (!gameCanvas) return;
    
    // Check if device is in landscape mode
    const isLandscape = window.innerWidth > window.innerHeight;
    if (!isLandscape) return;
    
    // Get screen dimensions
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    // Calculate a safe bottom margin (10% of screen height for games)
    // This ensures controls don't overlap the tank at the bottom
    const safeMargin = Math.floor(screenHeight * 0.12); // 12% margin
    
    // Calculate new canvas dimensions
    // Keep width the same, reduce height by the margin
    const newHeight = screenHeight - safeMargin;
    
    // Update canvas size
    if (gameCanvas.height > newHeight) {
        gameCanvas.height = newHeight;
        
        // If game has CANVAS_HEIGHT constant, override it (safer approach than modifying code)
        if (typeof CANVAS_HEIGHT !== 'undefined') {
            window.CANVAS_HEIGHT = newHeight;
        }
    }
    
    console.log("Canvas adjusted for mobile: " + gameCanvas.width + "x" + gameCanvas.height);
}


// Create and initialize mobile controls
function initMobileControls() {
    // Create mobile controls container
    const mobileControls = document.createElement('div');
    mobileControls.id = 'mobileControls';
    mobileControls.className = 'mobile-controls';
    document.body.appendChild(mobileControls);

    // Create movement joystick container
    const movementJoystick = document.createElement('div');
    movementJoystick.id = 'movementJoystick';
    movementJoystick.className = 'joystick movement-joystick';
    mobileControls.appendChild(movementJoystick);

    // Create joystick thumb (the inner circle that moves)
    const movementThumb = document.createElement('div');
    movementThumb.id = 'movementThumb';
    movementThumb.className = 'joystick-thumb';
    movementJoystick.appendChild(movementThumb);

    // Create action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.id = 'actionButtons';
    actionButtons.className = 'action-buttons';
    mobileControls.appendChild(actionButtons);

    // Create fire button
    const fireButton = document.createElement('button');
    fireButton.id = 'fireButton';
    fireButton.className = 'action-button fire-button';
    fireButton.innerHTML = '🔥';
    actionButtons.appendChild(fireButton);

    // Create weapon switch button
    const weaponButton = document.createElement('button');
    weaponButton.id = 'weaponButton';
    weaponButton.className = 'action-button weapon-button';
    weaponButton.innerHTML = '🔄';
    actionButtons.appendChild(weaponButton);

    // Add styles for mobile controls
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        .mobile-controls {
            display: none; /* Hidden by default, shown on mobile devices */
            position: fixed;
            bottom: 20px;
            left: 0;
            right: 0;
            z-index: 1000;
            touch-action: none;
        }
        
        .joystick {
            position: absolute;
            bottom: 20px;
            width: 120px;
            height: 120px;
            background-color: rgba(0, 0, 0, 0.3);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
        }
        
        .movement-joystick {
            left: 20px;
        }
        
        .joystick-thumb {
            width: 50px;
            height: 50px;
            background-color: rgba(255, 255, 255, 0.7);
            border-radius: 50%;
            pointer-events: none;
        }
        
        .action-buttons {
            position: absolute;
            bottom: 20px;
            right: 20px;
            display: flex;
            gap: 15px;
        }
        
        .action-button {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.5);
            border: 2px solid rgba(255, 255, 255, 0.5);
            color: white;
            font-size: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
            -webkit-tap-highlight-color: transparent;
        }
        
        .fire-button {
            background-color: rgba(255, 50, 50, 0.7);
        }
        
        .weapon-button {
            background-color: rgba(50, 50, 255, 0.7);
        }
        
        /* Make controls visible only on touch devices or small screens */
        @media (max-width: 1024px), (pointer: coarse) {
            .mobile-controls {
                display: block;
            }
            
            #instructions {
                display: none; /* Hide keyboard instructions on mobile */
            }
        }
    `;
    document.head.appendChild(styleElement);

    // Setup event handlers for movement joystick
    let movementActive = false;
    let movementCenter = { x: 0, y: 0 };
    let movementStartPosition = { x: 0, y: 0 };
    let currentThumbPosition = { x: 0, y: 0 };

    // Initialize joystick position
    function initJoystickPosition() {
        const rect = movementJoystick.getBoundingClientRect();
        movementCenter = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    // Handle joystick movement
    function updateJoystickPosition(clientX, clientY) {
        if (!movementActive) return;
        
        // Calculate distance from center
        const deltaX = clientX - movementStartPosition.x;
        const deltaY = clientY - movementStartPosition.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Limit distance to joystick radius
        const maxDistance = movementJoystick.clientWidth / 2 - movementThumb.clientWidth / 2;
        const limitedDistance = Math.min(distance, maxDistance);
        
        // Calculate angle
        const angle = Math.atan2(deltaY, deltaX);
        
        // Calculate new position with limited distance
        const newX = limitedDistance * Math.cos(angle);
        const newY = limitedDistance * Math.sin(angle);
        
        // Update thumb position
        movementThumb.style.transform = `translate(${newX}px, ${newY}px)`;
        
        // Store current position
        currentThumbPosition = { 
            x: newX / maxDistance, // Normalized -1 to 1
            y: newY / maxDistance  // Normalized -1 to 1
        };
        
        // Update game controls
        updateMobileControls();
    }

    // Touch event handlers for movement joystick
    movementJoystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        initJoystickPosition();
        movementActive = true;
        movementStartPosition = {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
        };
        movementJoystick.classList.add('active');
    });

    movementJoystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (movementActive) {
            updateJoystickPosition(e.touches[0].clientX, e.touches[0].clientY);
        }
    });

    const endJoystickMovement = () => {
        movementActive = false;
        movementThumb.style.transform = 'translate(0px, 0px)';
        currentThumbPosition = { x: 0, y: 0 };
        movementJoystick.classList.remove('active');
        
        // Reset game controls
        keysPressed['ArrowUp'] = false;
        keysPressed['ArrowDown'] = false;
        keysPressed['ArrowLeft'] = false;
        keysPressed['ArrowRight'] = false;
    };

    movementJoystick.addEventListener('touchend', endJoystickMovement);
    movementJoystick.addEventListener('touchcancel', endJoystickMovement);

	// Function to convert joystick position to key presses with reduced sensitivity
	function updateMobileControls() {
		// Create a dead zone in the center (increased from 0.3 to 0.4)
		const deadZone = 0.4;
		
		// Apply dampening to make controls less sensitive
		const dampening = 0.6; // Lower = less sensitive
		const dampX = currentThumbPosition.x * dampening;
		const dampY = currentThumbPosition.y * dampening;
		
		// Vertical movement (forward/backward) with dead zone
		if (dampY < -deadZone) {
			keysPressed['ArrowUp'] = true;
			keysPressed['ArrowDown'] = false;
		} else if (dampY > deadZone) {
			keysPressed['ArrowUp'] = false;
			keysPressed['ArrowDown'] = true;
		} else {
			keysPressed['ArrowUp'] = false;
			keysPressed['ArrowDown'] = false;
		}
		
		// Horizontal movement (rotation left/right) with dead zone and reduced sensitivity
		if (dampX < -deadZone) {
			keysPressed['ArrowLeft'] = true;
			keysPressed['ArrowRight'] = false;
		} else if (dampX > deadZone) {
			keysPressed['ArrowLeft'] = false;
			keysPressed['ArrowRight'] = true;
		} else {
			keysPressed['ArrowLeft'] = false;
			keysPressed['ArrowRight'] = false;
		}
	}

    // Add event listeners for action buttons
    fireButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fireButton.classList.add('pressed');
        player.fire();
    });

    fireButton.addEventListener('touchend', () => {
        fireButton.classList.remove('pressed');
    });

    weaponButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        weaponButton.classList.add('pressed');
        player.cycleWeapon();
    });

    weaponButton.addEventListener('touchend', () => {
        weaponButton.classList.remove('pressed');
    });

    // Initialize joystick position after the page is fully loaded
    window.addEventListener('resize', initJoystickPosition);
    window.addEventListener('orientationchange', initJoystickPosition);
    
    // Check if this is a mobile device
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
    }
    
    // Show/hide mobile controls based on device
    if (isMobileDevice()) {
        mobileControls.style.display = 'block';
        
        // Create mobile-specific instructions
        const mobileInstructions = document.createElement('div');
        mobileInstructions.id = 'mobileInstructions';
        mobileInstructions.className = 'mobile-instructions';
        mobileInstructions.innerHTML = `
            <p>Left joystick: Move and rotate</p>
            <p>🔥: Fire weapon</p>
            <p>🔄: Switch weapon</p>
        `;
        document.body.appendChild(mobileInstructions);
        
        // Style for mobile instructions
        const mobileInstructionsStyle = document.createElement('style');
        mobileInstructionsStyle.textContent = `
            .mobile-instructions {
                position: absolute;
                top: 10px;
                right: 10px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                z-index: 1000;
                max-width: 200px;
            }
            
            .mobile-instructions p {
                margin: 5px 0;
            }
        `;
        document.head.appendChild(mobileInstructionsStyle);
        
        // Hide after 5 seconds
        setTimeout(() => {
            mobileInstructions.style.opacity = '0';
            mobileInstructions.style.transition = 'opacity 1s';
            setTimeout(() => {
                mobileInstructions.style.display = 'none';
            }, 1000);
        }, 5000);
    }

    // Initialize joystick position
    setTimeout(initJoystickPosition, 100);
}

// Call this after the game is initialized
// Add this line to the end of your initGame function
document.addEventListener('DOMContentLoaded', () => {
    if (typeof player !== 'undefined') {
        initMobileControls();
    } else {
        // If player isn't initialized yet, wait for game initialization
        const checkPlayer = setInterval(() => {
            if (typeof player !== 'undefined') {
                initMobileControls();
                clearInterval(checkPlayer);
            }
        }, 100);
    }
});

// Call the function when the page loads and when orientation changes
document.addEventListener('DOMContentLoaded', adjustCanvasForMobile);
window.addEventListener('orientationchange', function() {
    // Wait a moment for the orientation change to complete
    setTimeout(adjustCanvasForMobile, 300);
});
window.addEventListener('resize', function() {
    // Only run on mobile devices to avoid unnecessary adjustments on desktop
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setTimeout(adjustCanvasForMobile, 300);
    }
});