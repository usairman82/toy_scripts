// MultiplayerManager class to handle WebRTC connections and player management
class MultiplayerManager {
    constructor(options) {
        this.game = options;
        this.peers = {}; // Store peer connections
        this.players = {}; // Store remote player data
        this.localPlayerId = null;
        this.signalServer = "wss://ovjcbwvkmi.execute-api.us-west-2.amazonaws.com/production/";
        this.connectionEstablished = false;
        this.playerColors = [
            "#FF0000", // Red (Player 1)
            "#00FF00", // Green (Player 2)
            "#0000FF", // Blue (Player 3)
            "#FFFF00", // Yellow (Player 4)
            "#FF00FF"  // Magenta (Player 5)
        ];
        this.maxPlayers = 5;
        this.pendingIceCandidates = {};
        this.connectionAttempts = 0;
        
        this.setupConnection();
    }
    
	setupConnection() {
        try {
            console.log("Connecting to signaling server:", this.signalServer);
            this.socket = new WebSocket(this.signalServer);
            
            this.socket.onopen = () => {
                console.log("Connected to signaling server");
                // Generate a unique ID for this player
                this.localPlayerId = this.generateUniqueId();
                
                // Send a simple join message - the server will handle room assignment
                this.socket.send(JSON.stringify({
                    type: "join",
                    playerId: this.localPlayerId
                }));
                
                // Update tracking
                trackEvent("multiplayer_connected");
            };
			
			this.socket.onmessage = (event) => {
				console.log("Received message from server:", event.data);
				try {
					const message = JSON.parse(event.data);
					
					switch (message.type) {
						case "room_info":
							console.log("Handling room info:", message);
							this.handleRoomInfo(message);
							break;
						case "new_player":
							console.log("Handling new player:", message);
							this.handleNewPlayer(message);
							break;
						case "player_left":
							console.log("Handling player left:", message);
							this.handlePlayerLeft(message);
							break;
						case "offer":
							console.log("Handling offer from:", message.from);
							this.handleOffer(message);
							break;
						case "answer":
							console.log("Handling answer from:", message.from);
							this.handleAnswer(message);
							break;
						case "ice_candidate":
							console.log("Handling ICE candidate from:", message.from);
							this.handleIceCandidate(message);
							break;
						default:
							console.warn("Unknown message type:", message.type);
					}
				} catch (parseError) {
					console.error("Error parsing message:", parseError, "Raw message:", event.data);
				}
			};
			
			this.socket.onclose = (event) => {
				console.log("Disconnected from signaling server", 
							"Code:", event.code, 
							"Reason:", event.reason || "No reason provided", 
							"Clean:", event.wasClean);
				
				// Check if we should try to reconnect
				if (this.connectionAttempts < 5) {
					// Exponential backoff for reconnection attempts
					const delay = Math.min(30000, Math.pow(2, this.connectionAttempts) * 1000);
					this.connectionAttempts = (this.connectionAttempts || 0) + 1;
					console.log(`Attempting reconnection in ${delay/1000} seconds (attempt ${this.connectionAttempts})`);
					setTimeout(() => this.setupConnection(), delay);
				} else {
					console.log("Max reconnection attempts reached. Please refresh the page to try again.");
					alert("Could not connect to multiplayer server. Please try again later.");
				}
			};
			
			this.socket.onerror = (error) => {
				console.error("WebSocket error:", error);
				console.log("Browser:", navigator.userAgent);
				console.log("Current location:", window.location.href);
				
				// Check for common issues
				if (window.location.protocol === "http:" && this.signalServer.startsWith("wss:")) {
					console.warn("Potential mixed content issue: Trying to connect to secure WebSocket from non-secure page");
				}
			};
		} catch (e) {
			console.error("Error setting up WebSocket connection:", e);
			// Initialize reconnection counter if not already set
			this.connectionAttempts = (this.connectionAttempts || 0) + 1;
			
			if (this.connectionAttempts < 5) {
				const delay = Math.min(30000, Math.pow(2, this.connectionAttempts) * 1000);
				console.log(`Will retry connection in ${delay/1000} seconds (attempt ${this.connectionAttempts})`);
				setTimeout(() => this.setupConnection(), delay);
			} else {
				console.log("Max connection attempts reached");
				alert("Failed to connect to multiplayer server. Please try again later.");
			}
		}
	}
    generateUniqueId() {
        return Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
	
// Add these methods to the MultiplayerManager class
    
handleRoomInfo(message) {
    const existingPlayers = message.players;
    const playerIndex = existingPlayers.length;
    
    // Set local player's index and color
    this.game.player.playerIndex = playerIndex;
    this.game.player.color = this.playerColors[playerIndex];
    
    // Create peer connections for each existing player
    existingPlayers.forEach(playerId => {
        this.createPeerConnection(playerId, true);
    });
    
    // Update the number of AI enemies (remove one for each human player)
    this.updateAIEnemies(existingPlayers.length + 1);
}

handleNewPlayer(message) {
    const newPlayerId = message.playerId;
    
    // Create a new peer connection for the new player
    this.createPeerConnection(newPlayerId, false);
    
    // Update the number of AI enemies
    const humanPlayers = Object.keys(this.peers).length + 1;
    this.updateAIEnemies(humanPlayers);
}

handlePlayerLeft(message) {
    const playerId = message.playerId;
    
    // Remove the peer connection
    if (this.peers[playerId]) {
        this.peers[playerId].close();
        delete this.peers[playerId];
    }
    
    // Remove the player
    if (this.players[playerId]) {
        delete this.players[playerId];
    }
    
    // Update the number of AI enemies
    const humanPlayers = Object.keys(this.peers).length + 1;
    this.updateAIEnemies(humanPlayers);
}

updateAIEnemies(humanPlayerCount) {
    // Calculate how many AI enemies should be active
    const aiEnemiesNeeded = Math.max(0, 5 - humanPlayerCount);
    
    // If we need to add AI enemies
    while (enemies.filter(e => e.isAI).length < aiEnemiesNeeded) {
        createAIEnemy();
    }
    
    // If we need to remove AI enemies
    if (enemies.filter(e => e.isAI).length > aiEnemiesNeeded) {
        // Find AI enemies and mark the excess ones for removal
        const aiEnemies = enemies.filter(e => e.isAI);
        const toRemove = aiEnemies.slice(0, aiEnemies.length - aiEnemiesNeeded);
        
        // Remove the marked enemies
        toRemove.forEach(enemy => {
            const index = enemies.indexOf(enemy);
            if (index !== -1) {
                enemies.splice(index, 1);
            }
        });
    }
}

// Add these methods to the MultiplayerManager class
    
handleRoomInfo(message) {
    const existingPlayers = message.players;
    const playerIndex = existingPlayers.length;
    
    // Set local player's index and color
    this.game.player.playerIndex = playerIndex;
    this.game.player.color = this.playerColors[playerIndex];
    
    // Create peer connections for each existing player
    existingPlayers.forEach(playerId => {
        this.createPeerConnection(playerId, true);
    });
    
    // Update the number of AI enemies (remove one for each human player)
    this.updateAIEnemies(existingPlayers.length + 1);
}

handleNewPlayer(message) {
    const newPlayerId = message.playerId;
    
    // Create a new peer connection for the new player
    this.createPeerConnection(newPlayerId, false);
    
    // Update the number of AI enemies
    const humanPlayers = Object.keys(this.peers).length + 1;
    this.updateAIEnemies(humanPlayers);
}

handlePlayerLeft(message) {
    const playerId = message.playerId;
    
    // Remove the peer connection
    if (this.peers[playerId]) {
        this.peers[playerId].close();
        delete this.peers[playerId];
    }
    
    // Remove the player
    if (this.players[playerId]) {
        delete this.players[playerId];
    }
    
    // Update the number of AI enemies
    const humanPlayers = Object.keys(this.peers).length + 1;
    this.updateAIEnemies(humanPlayers);
}

updateAIEnemies(humanPlayerCount) {
    // Calculate how many AI enemies should be active
    const aiEnemiesNeeded = Math.max(0, 5 - humanPlayerCount);
    
    // If we need to add AI enemies
    while (enemies.filter(e => e.isAI).length < aiEnemiesNeeded) {
        createAIEnemy();
    }
    
    // If we need to remove AI enemies
    if (enemies.filter(e => e.isAI).length > aiEnemiesNeeded) {
        // Find AI enemies and mark the excess ones for removal
        const aiEnemies = enemies.filter(e => e.isAI);
        const toRemove = aiEnemies.slice(0, aiEnemies.length - aiEnemiesNeeded);
        
        // Remove the marked enemies
        toRemove.forEach(enemy => {
            const index = enemies.indexOf(enemy);
            if (index !== -1) {
                enemies.splice(index, 1);
            }
        });
    }
}

// Add these methods to the MultiplayerManager class

createPeerConnection(remotePlayerId, isInitiator) {
    try {
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
        
        // Store the peer connection
        this.peers[remotePlayerId] = peerConnection;
        this.pendingIceCandidates[remotePlayerId] = [];
        
        // Setup data channel
        if (isInitiator) {
            const dataChannel = peerConnection.createDataChannel("game");
            this.setupDataChannel(dataChannel, remotePlayerId);
            
            // Create and send offer
            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    this.socket.send(JSON.stringify({
                        type: "offer",
                        offer: peerConnection.localDescription,
                        to: remotePlayerId,
                        from: this.localPlayerId
                    }));
                })
                .catch(error => console.error("Error creating offer:", error));
        } else {
            // Handle data channel for non-initiator
            peerConnection.ondatachannel = (event) => {
                this.setupDataChannel(event.channel, remotePlayerId);
            };
        }
        
        // ICE candidate handling
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.send(JSON.stringify({
                    type: "ice_candidate",
                    candidate: event.candidate,
                    to: remotePlayerId,
                    from: this.localPlayerId
                }));
            }
        };
        
        // Connection state change
        peerConnection.onconnectionstatechange = () => {
            if (peerConnection.connectionState === 'connected') {
                console.log(`Connected to player ${remotePlayerId}`);
            }
        };
        
        return peerConnection;
    } catch (e) {
        console.error("Error creating peer connection:", e);
        return null;
    }
}

setupDataChannel(dataChannel, remotePlayerId) {
    dataChannel.onopen = () => {
        console.log(`Data channel to ${remotePlayerId} opened`);
        this.connectionEstablished = true;
    };
    
    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            // Handle different message types
            switch (data.type) {
                case "player_update":
                    this.updateRemotePlayer(remotePlayerId, data.playerData);
                    break;
                case "projectile_fired":
                    this.handleRemoteProjectile(data.projectile);
                    break;
                case "player_hit":
                    this.handleRemoteHit(data.hitData);
                    break;
            }
        } catch (e) {
            console.error("Error processing message:", e);
        }
    };
    
    dataChannel.onclose = () => {
        console.log(`Data channel to ${remotePlayerId} closed`);
    };
    
    dataChannel.onerror = (error) => {
        console.error(`Data channel error for ${remotePlayerId}:`, error);
    };
    
    // Store the data channel
    if (!this.players[remotePlayerId]) {
        // Get next available index
        const playerIndices = Object.values(this.players)
            .map(player => player.playerIndex)
            .concat(this.game.player.playerIndex);
        let nextIndex = 0;
        while (playerIndices.includes(nextIndex) && nextIndex < this.maxPlayers) {
            nextIndex++;
        }
        
        this.players[remotePlayerId] = {
            playerId: remotePlayerId,
            dataChannel: dataChannel,
            playerIndex: nextIndex,
            color: this.playerColors[nextIndex],
            x: 0,
            y: 0,
            rotation: 0,
            health: 1000,
            currentWeapon: "Cannon"
        };
    } else {
        this.players[remotePlayerId].dataChannel = dataChannel;
    }
}

// Add these methods to the MultiplayerManager class

handleOffer(message) {
    const remotePlayerId = message.from;
    const peerConnection = this.peers[remotePlayerId] || 
                           this.createPeerConnection(remotePlayerId, false);
    
    if (!peerConnection) return;
    
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer))
        .then(() => peerConnection.createAnswer())
        .then(answer => peerConnection.setLocalDescription(answer))
        .then(() => {
            this.socket.send(JSON.stringify({
                type: "answer",
                answer: peerConnection.localDescription,
                to: remotePlayerId,
                from: this.localPlayerId
            }));
            
            // Process any pending ICE candidates
            this.pendingIceCandidates[remotePlayerId].forEach(candidate => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(error => console.error("Error adding pending ICE candidate:", error));
            });
            this.pendingIceCandidates[remotePlayerId] = [];
        })
        .catch(error => console.error("Error handling offer:", error));
}

handleAnswer(message) {
    const remotePlayerId = message.from;
    const peerConnection = this.peers[remotePlayerId];
    
    if (peerConnection) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer))
            .then(() => {
                // Process any pending ICE candidates
                this.pendingIceCandidates[remotePlayerId].forEach(candidate => {
                    peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
                        .catch(error => console.error("Error adding pending ICE candidate:", error));
                });
                this.pendingIceCandidates[remotePlayerId] = [];
            })
            .catch(error => console.error("Error handling answer:", error));
    }
}

handleIceCandidate(message) {
    const remotePlayerId = message.from;
    const peerConnection = this.peers[remotePlayerId];
    
    if (peerConnection && peerConnection.remoteDescription) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate))
            .catch(error => console.error("Error adding ICE candidate:", error));
    } else if (peerConnection) {
        // Store the ICE candidate to be added later
        this.pendingIceCandidates[remotePlayerId].push(message.candidate);
    }
}

updateRemotePlayer(playerId, playerData) {
    if (this.players[playerId]) {
        Object.assign(this.players[playerId], playerData);
    }
}

handleRemoteProjectile(projectileData) {
    // Create a new projectile from the remote data
    const projectile = new Projectile(
        projectileData.x,
        projectileData.y,
        projectileData.rotation,
        weaponFromName(projectileData.weaponName),
        false, // Not a player projectile (from local player)
        projectileData.playerId // ID of the player who fired it
    );
    
    projectiles.push(projectile);
}

handleRemoteHit(hitData) {
    // Handle when a remote player reports they hit something
    if (hitData.targetType === "player" && hitData.targetId === this.localPlayerId) {
        player.takeDamage(hitData.damage);
    }
}

// Add these methods to the MultiplayerManager class

broadcastPlayerUpdate() {
    // Only send updates if connections are established
    if (!this.connectionEstablished) return;
    
    const playerData = {
        x: player.x,
        y: player.y,
        rotation: player.rotation,
        health: player.health,
        currentWeapon: player.currentWeapon.name
    };
    
    this.broadcast({
        type: "player_update",
        playerData: playerData
    });
}

broadcastProjectileFired(projectile) {
    if (!this.connectionEstablished) return;
    
    this.broadcast({
        type: "projectile_fired",
        projectile: {
            x: projectile.x,
            y: projectile.y,
            rotation: projectile.rotation,
            weaponName: projectile.weapon.name,
            playerId: this.localPlayerId
        }
    });
}

broadcastHit(targetType, targetId, damage) {
    if (!this.connectionEstablished) return;
    
    this.broadcast({
        type: "player_hit",
        hitData: {
            targetType: targetType,
            targetId: targetId,
            damage: damage
        }
    });
}

broadcast(data) {
    // Send data to all connected peers
    for (const playerId in this.players) {
        const player = this.players[playerId];
        if (player.dataChannel && player.dataChannel.readyState === "open") {
            try {
                player.dataChannel.send(JSON.stringify(data));
            } catch (e) {
                console.error("Error sending data:", e);
            }
        }
    }
}

// Called on game shutdown or when player leaves
disconnect() {
    // Close all peer connections
    for (const playerId in this.peers) {
        this.peers[playerId].close();
    }
    
    // Close the WebSocket connection
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
            type: "leave",
            playerId: this.localPlayerId
        }));
        this.socket.close();
    }
    
    trackEvent("multiplayer_disconnected");
}
	
}

// Function to update multiplayer UI
function updateMultiplayerUI() {
    const playerCount = 1 + (multiplayerManager ? Object.keys(multiplayerManager.players).length : 0);
    const uiElement = document.getElementById('multiplayerUI');
    if (uiElement) {
        uiElement.querySelector('span').textContent = `Players: ${playerCount}`;
    }
}

// Function to create multiplayer UI
function createMultiplayerUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'multiplayerUI';
    uiContainer.innerHTML = `
        <span>Players: 1</span>
        <button id="copyLink">Copy Invite Link</button>
    `;
    document.body.appendChild(uiContainer);
    
    // Copy link functionality with fallback
    document.getElementById('copyLink').addEventListener('click', () => {
        const inviteLink = window.location.href;
        
        // Try using the Clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(inviteLink)
                .then(() => {
                    alert('Invite link copied to clipboard!');
                    trackEvent('invite_link_copied');
                })
                .catch(err => {
                    fallbackCopy(inviteLink);
                });
        } else {
            fallbackCopy(inviteLink);
        }
    });
}

// Add the fallback copy function right after createMultiplayerUI
function fallbackCopy(text) {
    // Fallback method using a temporary input element
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    let successful = false;
    try {
        successful = document.execCommand('copy');
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(textArea);
    
    if (successful) {
        alert('Invite link copied to clipboard!');
        trackEvent('invite_link_copied');
    } else {
        // Last resort: show a manual copy dialog
        prompt('Copy this link to invite friends:', text);
    }
}

function addMultiplayerStartButton() {
    const button = document.createElement('button');
    button.id = 'multiplayer-btn';
    button.textContent = 'Join Multiplayer';
    button.style.position = 'absolute';
    button.style.top = '150px';
    button.style.right = '10px';
    button.style.padding = '10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.onclick = () => {
        // Show connecting message
        button.disabled = true;
        button.textContent = 'Connecting...';
        
        // Create multiplayer manager - the server will handle room assignment
        multiplayerManager = new MultiplayerManager({
            player: player,
            updateAIEnemies: (count) => multiplayerManager.updateAIEnemies(count)
        });
        
        // Create multiplayer UI
        createMultiplayerUI();
        
        trackEvent('multiplayer_started');
    };
    document.body.appendChild(button);
}

// Initialize multiplayer
function initMultiplayer() {
    // Create multiplayer manager
    multiplayerManager = new MultiplayerManager({
        player: player,
        updateAIEnemies: (count) => multiplayerManager.updateAIEnemies(count)
    });
    
    // Create multiplayer UI
    createMultiplayerUI();
}