/**
 * Debug fix for the raycasting engine
 * This script fixes the "Cannot read properties of undefined (reading 'width')" error
 * by adding texture properties to enemy objects
 */

// Wait for the game to initialize
window.addEventListener('load', function() {
    // Wait a bit to ensure the game is fully loaded
    setTimeout(function() {
        if (window.gameInstance && window.gameInstance.state && window.gameInstance.state.enemies) {
            console.log("Applying debug fix to enemy sprites...");
            
            // Fix each enemy by adding the appropriate texture property
            window.gameInstance.state.enemies.forEach(function(enemy) {
                if (!enemy.texture) {
                    // Set the appropriate texture based on enemy type
                    switch (enemy.type) {
                        case 'skeleton':
                            enemy.texture = 'skeleton_idle';
                            break;
                        case 'goblin':
                            enemy.texture = 'goblin_idle';
                            break;
                        case 'wizard':
                            enemy.texture = 'dark_wizard_idle';
                            break;
                        case 'boss':
                            enemy.texture = 'boss_idle';
                            break;
                        default:
                            // Fallback to skeleton if type is unknown
                            enemy.texture = 'skeleton_idle';
                    }
                    console.log(`Set texture '${enemy.texture}' for enemy type '${enemy.type}'`);
                }
            });
            
            console.log("Debug fix applied successfully!");
        } else {
            console.error("Could not apply debug fix: Game instance or enemies not found");
        }
    }, 1000); // Wait 1 second to ensure game is loaded
});
