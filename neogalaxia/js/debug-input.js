// Debug script to test keyboard input
console.log("Debug input script loaded");

// Global event listener for keyboard events
document.addEventListener('keydown', function(event) {
    console.log('Keydown event detected:', event.key, event.keyCode);
});

// Function to check if Phaser input is working
function checkPhaserInput(game) {
    if (!game || !game.input || !game.input.keyboard) {
        console.error("Phaser input system not available");
        return;
    }
    
    console.log("Phaser input system available");
    
    // Check if the current scene has input handlers
    const currentScene = game.scene.scenes.find(scene => scene.sys.settings.active);
    if (currentScene) {
        console.log("Current active scene:", currentScene.sys.settings.key);
        
        // Check if the scene has keyboard input defined
        if (currentScene.input && currentScene.input.keyboard) {
            console.log("Scene has keyboard input defined");
            
            // Log the keys that are registered
            if (currentScene.cursors) {
                console.log("Arrow keys registered");
            }
            
            if (currentScene.wasd) {
                console.log("WASD keys registered");
            }
            
            if (currentScene.spaceKey) {
                console.log("Space key registered");
            }
        } else {
            console.warn("Scene does not have keyboard input defined");
        }
    } else {
        console.warn("No active scene found");
    }
}

// Wait for the game to be initialized
window.addEventListener('load', function() {
    // Give the game time to initialize
    setTimeout(() => {
        if (window.game) {
            console.log("Game object found, checking input system");
            checkPhaserInput(window.game);
        } else {
            console.error("Game object not found");
        }
    }, 2000); // Wait 2 seconds for game to initialize
});

// Add a focus check
window.addEventListener('focus', function() {
    console.log("Window gained focus");
});

window.addEventListener('blur', function() {
    console.log("Window lost focus");
});

// Check if the game container has focus
function checkGameContainerFocus() {
    const gameContainer = document.getElementById('game-container');
    if (gameContainer) {
        console.log("Game container found");
        
        // Add focus/blur events to the game container
        gameContainer.addEventListener('focus', function() {
            console.log("Game container gained focus");
        });
        
        gameContainer.addEventListener('blur', function() {
            console.log("Game container lost focus");
        });
        
        // Check if the game container contains the active element
        const isGameFocused = gameContainer.contains(document.activeElement);
        console.log("Is game container focused:", isGameFocused);
        
        // Log the active element
        console.log("Active element:", document.activeElement);
    } else {
        console.warn("Game container not found");
    }
}

// Check focus after a short delay
setTimeout(checkGameContainerFocus, 3000);
