// Player notification system
function showPlayerJoinNotification(playerIndex) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'player-notification';
    notification.innerHTML = `Player ${playerIndex + 1} has entered the arena!`;
    
    // Style the notification
    Object.assign(notification.style, {
        position: 'absolute',
        top: '120px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        fontWeight: 'bold',
        zIndex: '1000',
        animation: 'fadeInOut 3s ease-in-out'
    });
    
    // Create and add the animation
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeInOut {
            0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            15% { opacity: 1; transform: translateX(-50%) translateY(0); }
            85% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
        }
    `;
    document.head.appendChild(style);
    
    // Add to body and remove after animation
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Update the MultiplayerManager's handleNewPlayer method to show notification
function updateMultiplayerManagerWithNotifications() {
    // Store the original method
    const originalHandleNewPlayer = MultiplayerManager.prototype.handleNewPlayer;
    
    // Override with new implementation
    MultiplayerManager.prototype.handleNewPlayer = function(message) {
        const newPlayerId = message.playerId;
        
        // Call the original method first
        originalHandleNewPlayer.call(this, message);
        
        // Show notification (after a short delay to let connection establish)
        setTimeout(() => {
            // Find the player's index based on their ID
            let playerIndex = 0;
            for (const pid in this.players) {
                if (pid === newPlayerId && this.players[pid]) {
                    playerIndex = this.players[pid].playerIndex;
                    break;
                }
            }
            
            // Show the notification
            showPlayerJoinNotification(playerIndex);
            console.log(`Player ${playerIndex + 1} (${newPlayerId}) has joined the game`);
        }, 500);
    };
    
    // Also update the handleRoomInfo method to show notifications for existing players
    const originalHandleRoomInfo = MultiplayerManager.prototype.handleRoomInfo;
    
    MultiplayerManager.prototype.handleRoomInfo = function(message) {
        // Get existing players before we process the room info
        const existingPlayers = [...message.players];
        
        // Call the original method
        originalHandleRoomInfo.call(this, message);
        
        // Log that we joined a room
        console.log(`Joined room with ${existingPlayers.length} existing players`);
        
        // Show join notification for local player
        setTimeout(() => {
            showPlayerJoinNotification(this.game.player.playerIndex);
            console.log(`You (Player ${this.game.player.playerIndex + 1}) have joined the game`);
        }, 500);
        
        // Show notifications for other players (staggered)
        existingPlayers.forEach((playerId, i) => {
            setTimeout(() => {
                // Find the player's index
                for (const pid in this.players) {
                    if (pid === playerId && this.players[pid]) {
                        const playerIndex = this.players[pid].playerIndex;
                        showPlayerJoinNotification(playerIndex);
                        console.log(`Player ${playerIndex + 1} (${playerId}) is already in the game`);
                        break;
                    }
                }
            }, 1000 + (i * 500)); // Stagger notifications
        });
    };
}

// Initialize the notification system
document.addEventListener("DOMContentLoaded", function() {
    // Apply the notification system modifications
    updateMultiplayerManagerWithNotifications();
    console.log("Player notification system initialized");
});