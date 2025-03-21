/**
 * Debug functions for the raycasting engine
 * These functions are used to visualize the game state for debugging purposes
 */

// Add debug functions to the RaycastingEngine prototype
(function() {
    // Check if the engine is available
    if (typeof window.RaycastingEngine === 'undefined') {
        console.error('RaycastingEngine not found, cannot add debug functions');
        return;
    }

    console.log('Adding debug functions to RaycastingEngine');

    // These functions are already defined in the engine.js file
    // This file is kept for reference and compatibility with older code
    // The actual implementations are in engine.js:
    // - renderDebugMap
    // - visualizeRay
})();

// Add debug toggle function to the game
window.addEventListener('load', function() {
    // Wait a bit to ensure the game is fully loaded
    setTimeout(function() {
        if (window.gameInstance) {
            console.log('Adding debug toggle function to game instance');
            
            // Add a function to toggle debug mode
            window.gameInstance.toggleDebugMode = function() {
                this.debug.enabled = !this.debug.enabled;
                this.debug.showMapObjects = this.debug.enabled;
                console.log(`Debug mode ${this.debug.enabled ? 'enabled' : 'disabled'}`);
                
                // Update debug indicator in UI
                const debugIndicator = document.getElementById('debug-indicator');
                if (debugIndicator) {
                    debugIndicator.style.display = this.debug.enabled ? 'block' : 'none';
                }
                
                return this.debug.enabled;
            };
            
            console.log('Debug functions added successfully');
        } else {
            console.error('Game instance not found, cannot add debug functions');
        }
    }, 1500); // Wait 1.5 seconds to ensure game is loaded
});
