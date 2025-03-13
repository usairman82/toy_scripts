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
			
			// Store reference to message handler for proper binding
			this.handleSocketMessage = (event) => {
				console.log("📨 RAW SOCKET MESSAGE RECEIVED:", event.data);
				try {
					const message = JSON.parse(event.data);
					console.log("📩 PARSED MESSAGE:", message);
					
					// Log detailed info about incoming messages
					if (message.type === "room_info") {
						console.log(`🏠 Room info received: ${message.players.length} players already in room`, message.players);
						if (typeof updateConnectionStatus === 'function') {
							updateConnectionStatus("Connected to main room", "#4CAF50");
						}
						this.handleRoomInfo(message);
					} else if (message.type === "new_player") {
						console.log(`👋 New player notification: ${message.playerId}`);
						this.handleNewPlayer(message);
					} else if (message.type === "player_left") {
						console.log("👋 Player left notification");
						this.handlePlayerLeft(message);
					} else if (message.type === "offer") {
						console.log("📞 Handling offer");
						this.handleOffer(message);
					} else if (message.type === "answer") {
						console.log("📞 Handling answer");
						this.handleAnswer(message);
					} else if (message.type === "ice_candidate") {
						console.log("❄️ Handling ICE candidate");
						this.handleIceCandidate(message);
					} else if (message.type === "pong") {
						console.log("🏓 Received pong response");
					} else {
						console.warn("⚠️ Unknown message type:", message.type);
					}
				} catch (parseError) {
					console.error("❌ Error parsing message:", parseError, "Raw message:", event.data);
				}
			};
			
			// Add our message handler - using addEventListener for better compatibility
			this.socket.addEventListener('message', this.handleSocketMessage);
			
			this.socket.onopen = () => {
				console.log("Connected to signaling server");
				// Generate a unique ID for this player
				this.localPlayerId = this.generateUniqueId();
				
				console.log("🚀 ABOUT TO SEND JOIN MESSAGE WITH PLAYER ID:", this.localPlayerId);
				// Send a simple join message - the server will handle room assignment
				this.socket.send(JSON.stringify({
					type: "join",
					playerId: this.localPlayerId
				}));
				console.log("📤 JOIN MESSAGE SENT");
				
				// Update tracking
				trackEvent("multiplayer_connected");
				
				// Update connection status UI if function exists
				if (typeof updateConnectionStatus === 'function') {
					updateConnectionStatus("Connected to server, joining main room...", "#FFC107");
				}
				
				// Send a test ping after a short delay
				setTimeout(() => {
					if (this.socket && this.socket.readyState === WebSocket.OPEN) {
						console.log("🏓 Sending test ping");
						this.socket.send(JSON.stringify({
							type: "ping",
							timestamp: Date.now()
						}));
					}
				}, 1000);
			};
			
			this.socket.onclose = (event) => {
				console.log("Disconnected from signaling server", 
							"Code:", event.code, 
							"Reason:", event.reason || "No reason provided", 
							"Clean:", event.wasClean);
				
				if (typeof updateConnectionStatus === 'function') {
					updateConnectionStatus("Disconnected - trying to reconnect...", "#F44336");
				}
				
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
				
				if (typeof updateConnectionStatus === 'function') {
					updateConnectionStatus("Connection error - check console", "#F44336");
				}
				
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
        
        // Show notification for current player if function exists
        if (typeof showPlayerJoinNotification === 'function') {
            setTimeout(() => {
                showPlayerJoinNotification(this.game.player.playerIndex);
                console.log(`You (Player ${this.game.player.playerIndex + 1}) have joined the game`);
            }, 500);
            
            // Show notifications for existing players
            existingPlayers.forEach((playerId, i) => {
                setTimeout(() => {
                    for (const pid in this.players) {
                        if (pid === playerId && this.players[pid]) {
                            const playerIndex = this.players[pid].playerIndex;
                            showPlayerJoinNotification(playerIndex);
                            console.log(`Player ${playerIndex + 1} (${playerId}) is already in the game`);
                            break;
                        }
                    }
                }, 1000 + (i * 500));
            });
        }
    }

    handleNewPlayer(message) {
        const newPlayerId = message.playerId;
        
        // Create a new peer connection for the new player
        this.createPeerConnection(newPlayerId, false);
        
        // Update the number of AI enemies
        const humanPlayers = Object.keys(this.peers).length + 1;
        this.updateAIEnemies(humanPlayers);
        
        // Show notification for new player if function exists
        if (typeof showPlayerJoinNotification === 'function') {
            setTimeout(() => {
                // Find the player's index based on their ID
                for (const pid in this.players) {
                    if (pid === newPlayerId && this.players[pid]) {
                        const playerIndex = this.players[pid].playerIndex;
                        showPlayerJoinNotification(playerIndex);
                        console.log(`Player ${playerIndex + 1} (${newPlayerId}) has joined the game`);
                        break;
                    }
                }
            }, 500);
        }
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
createPeerConnection(remotePlayerId, isInitiator) {
    try {
        console.log(`Creating peer connection with ${remotePlayerId}, initiator: ${isInitiator}`);
        
        const peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: "stun:stun.l.google.com:19302" },
                { urls: "stun:stun1.l.google.com:19302" }
            ]
        });
        
        // Store the peer connection
        this.peers[remotePlayerId] = peerConnection;
        this.pendingIceCandidates[remotePlayerId] = [];
        
        // Setup data channels
        if (isInitiator) {
            // Game data channel for game state synchronization
            const gameDataChannel = peerConnection.createDataChannel("game");
            this.setupDataChannel(gameDataChannel, remotePlayerId);
            
            // Chat data channel for player messages
            const chatDataChannel = peerConnection.createDataChannel("chat");
            this.setupChatChannel(chatDataChannel, remotePlayerId);
            
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
            // Handle data channels for non-initiator
            peerConnection.ondatachannel = (event) => {
                if (event.channel.label === "game") {
                    this.setupDataChannel(event.channel, remotePlayerId);
                } else if (event.channel.label === "chat") {
                    this.setupChatChannel(event.channel, remotePlayerId);
                }
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
            console.log(`Peer connection state with ${remotePlayerId}: ${peerConnection.connectionState}`);
            
            if (peerConnection.connectionState === 'connected') {
                console.log(`Connected to player ${remotePlayerId}`);
                if (typeof updateConnectionStatus === 'function') {
                    updateConnectionStatus("Connected to all players", "#4CAF50");
                }
            } else if (peerConnection.connectionState === 'failed') {
                console.error(`Connection to player ${remotePlayerId} failed`);
                if (typeof updateConnectionStatus === 'function') {
                    updateConnectionStatus("Some player connections failed", "#FF9800");
                }
            }
        };
        
        // ICE connection state monitoring
        peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state with ${remotePlayerId}: ${peerConnection.iceConnectionState}`);
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
	
	// In multiplayer.js, add these methods

	// Add chat data channel
	createChatDataChannel(peerConnection, remotePlayerId) {
		try {
			const chatChannel = peerConnection.createDataChannel("chat");
			this.setupChatChannel(chatChannel, remotePlayerId);
		} catch (e) {
			console.error("Error creating chat data channel:", e);
		}
	}

	setupChatChannel(channel, remotePlayerId) {
		channel.onopen = () => {
			console.log(`Chat channel to ${remotePlayerId} opened`);
		};
		
		channel.onmessage = (event) => {
			try {
				const chatData = JSON.parse(event.data);
				this.displayChatMessage(remotePlayerId, chatData.message);
			} catch (e) {
				console.error("Error processing chat message:", e);
			}
		};
		
		channel.onclose = () => {
			console.log(`Chat channel to ${remotePlayerId} closed`);
		};
		
		// Store the chat channel
		if (this.players[remotePlayerId]) {
			this.players[remotePlayerId].chatChannel = channel;
		}
	}

	// Add these methods to your MultiplayerManager class

	// Setup chat data channel
	setupChatChannel(channel, remotePlayerId) {
		channel.onopen = () => {
			console.log(`Chat channel to ${remotePlayerId} opened`);
		};
		
		channel.onmessage = (event) => {
			try {
				const chatData = JSON.parse(event.data);
				this.displayChatMessage(remotePlayerId, chatData.message);
			} catch (e) {
				console.error("Error processing chat message:", e);
			}
		};
		
		channel.onclose = () => {
			console.log(`Chat channel to ${remotePlayerId} closed`);
		};
		
		channel.onerror = (error) => {
			console.error(`Chat channel error for ${remotePlayerId}:`, error);
		};
		
		// Store the chat channel
		if (this.players[remotePlayerId]) {
			this.players[remotePlayerId].chatChannel = channel;
		} else {
			console.warn(`Player ${remotePlayerId} not found when setting up chat channel`);
		}
	}

	// Updated sendChatMessage method with censoring
	sendChatMessage(message) {
		if (!this.connectionEstablished) {
			console.warn("Cannot send chat message: Connection not established");
			return;
		}
		
		// Apply censoring before sending
		const censoredMessage = censorMessage(message);
		
		const chatData = {
			type: "chat",
			message: censoredMessage, // Send the censored version
			sender: this.localPlayerId,
			timestamp: Date.now()
		};
		
		// Broadcast to all connected players
		for (const playerId in this.players) {
			const player = this.players[playerId];
			if (player.chatChannel && player.chatChannel.readyState === "open") {
				try {
					player.chatChannel.send(JSON.stringify(chatData));
				} catch (e) {
					console.error(`Error sending chat message to ${playerId}:`, e);
				}
			}
		}
		
		// Also display your own message locally
		this.displayChatMessage("You", censoredMessage);
	}

	// Updated displayChatMessage method with additional safety for received messages
	displayChatMessage(sender, message) {
		// Apply censoring again as a safety measure for received messages
		// (in case the sender modified their client to bypass censoring)
		const censoredMessage = censorMessage(message);
		
		// Find the appropriate sender name (You or Player X)
		let senderName = "You";
		let senderClass = "chat-sender-you";
		
		if (sender !== "You") {
			const player = this.players[sender];
			if (player) {
				senderName = `Player ${player.playerIndex + 1}`;
				senderClass = "chat-sender-other";
			} else {
				senderName = "Unknown Player";
				senderClass = "chat-sender-other";
			}
		}
		
		// Add to chat UI with sanitized content
		const chatLog = document.getElementById('chatLog');
		if (chatLog) {
			const messageElement = document.createElement('div');
			messageElement.className = 'chat-message';
			
			// Create span for sender name
			const senderSpan = document.createElement('span');
			senderSpan.className = `chat-sender ${senderClass}`;
			senderSpan.textContent = `${senderName}:`;
			
			// Add sender span and message text
			messageElement.appendChild(senderSpan);
			messageElement.appendChild(document.createTextNode(' ' + censoredMessage));
			
			chatLog.appendChild(messageElement);
			chatLog.scrollTop = chatLog.scrollHeight; // Auto-scroll to bottom
		}
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

// Replace the existing function in multiplayer.js
function createMultiplayerUI() {
    const uiContainer = document.createElement('div');
    uiContainer.id = 'multiplayerUI';
    uiContainer.innerHTML = `
        <span>Players: 1</span>
        <button id="copyLink">Copy Invite Link</button>
        <div id="connectionStatus">Connecting to server...</div>
    `;
    document.body.appendChild(uiContainer);
    
    // Style the connection status
    const statusElem = document.getElementById('connectionStatus');
    if (statusElem) {
        statusElem.style.fontSize = '12px';
        statusElem.style.marginTop = '5px';
        statusElem.style.color = '#FFC107'; // Yellow while connecting
    }
    
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

// Helper function to update connection status display
function updateConnectionStatus(message, color) {
    const statusElem = document.getElementById('connectionStatus');
    if (statusElem) {
        statusElem.textContent = message;
        statusElem.style.color = color;
    }
    console.log(`Connection status: ${message}`);
}

// Fallback copy function for browsers without clipboard API
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

// Player notification function
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

// Replace the existing function in multiplayer.js
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
        
        // Initialize chat UI
        initChatUI();
        
        trackEvent('multiplayer_started');
    };
    document.body.appendChild(button);
}

// Update the initMultiplayer function
function initMultiplayer() {
    // Create multiplayer manager
    multiplayerManager = new MultiplayerManager({
        player: player,
        updateAIEnemies: (count) => multiplayerManager.updateAIEnemies(count)
    });
    
    // Create multiplayer UI
    createMultiplayerUI();
    
    // Initialize chat UI
    initChatUI();
}

// Initialize error handling for WebRTC
document.addEventListener("DOMContentLoaded", function() {
    // Add a global error handler for WebRTC errors
    window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && event.reason.toString().includes('RTCPeerConnection')) {
            console.error('WebRTC error:', event.reason);
            updateConnectionStatus("WebRTC error - check console", "#F44336");
        }
    });
    
    console.log("Multiplayer system initialized");
});

// Add this function to your multiplayer.js file
function censorMessage(message) {
    // Comprehensive list of vulgar words and their variations including l33tspeak
    const vulgarWords = [
        // Common profanities and l33tspeak variations
        'fuck', 'f\\*ck', 'f\\*\\*k', 'f\\*\\*\\*', 'fuk', 'fck', 'fuq', 'phuck', 'fvck', 'f\\.ck', 'f@ck', 
        'f4ck', 'fxck', 'fu(k', 'f00k', 'ph0k', 'phuk', 'fuc', 'f|_|ck', 'f(_)ck', 'fu©k', 'ƒuck', 'ƒµ¢k',
        'f3ck', 'fu<k', '|=uck', 'f^ck', 'fu(|<', '|=(_)(|<', 'fukk',
        
        'fucking', 'f\\*cking', 'fvcking', 'fukking', 'fuking', 'fcking', 'fuqing', 'fuggin', 'f\\.\\.\\.ing',
        'fu(k1ng', 'ph0k1n', 'f|_|cking', 'f00king', '|=(_)(|<ing', 'fvck!ng', 'f4ck1ng', 'fu(k!ng',
        
        'fucker', 'fcker', 'fkr', 'f|_|ck3r', 'fu(k3r', 'fu©ker', 'f(_)cker', 'f00ker', 'fvcker',
        'motherfucker', 'mofo', 'mf', 'motherf\\*cker', 'm0th3rfuck3r', 'm0f0', 'm0th3rf|_|ck3r',
        
        // Sh-words with l33t variations
        'shit', 'sh\\*t', 's\\*\\*t', 'sh1t', 'sht', 'shyt', 'chit', 's\\.\\.\\.t', '$hit', '$h1t', '$h!t',
        '5h1t', '5hit', 'sh17', '5h17', '$h17', 'shi7', '5}-{it', '$(-)it', '5#!7', '$#!7',
        
        'bullshit', 'bullsh\\*t', 'bs', 'b\\.s\\.', 'bu11$h1t', '8u11$h17', 'bull5h1t', 'bull$hit',
        'horseshit', 'horsesh\\*t', 'h0r$3$h1t',
        
        // A-words with l33t variations
        'ass', 'a\\$\\$', 'a\\*\\*', '@ss', 'a55', 'azz', 'a$$', '@$$', '@55', '4ss', '4$$',
        
        'asshole', 'a\\*\\*hole', 'a\\.hole', 'a$$hole', '@$$hole', 'a55hole', 'ahole', '@$$h0l3',
        'a55h0l3', '@55h0l3', '4ssh0le', '4ssho13', '@ssh0l3', '@ssh01e',
        
        // B-words with l33t variations
        'bitch', 'b\\*tch', 'b1tch', 'bytch', 'b!tch', 'biatch', 'bi+ch', 'biotch', '8itch', '8i7ch',
        '8!tch', '81tch', 'b17ch', 'b!7ch', '8!7ch', 'b1+ch', '6itch', '6i7ch', 'bi7ch',
        
        'bastard', 'b@stard', 'b\\*stard', 'b@st@rd', '8astard', '8@s7@rd', 'b4st4rd', 'b@$t@rd',
        '8@$t@rd', '84$74rd', 'ba$tard', '6astard', '6@$7@rd',
        
        // C-words with l33t variations
        'cunt', 'c\\*nt', 'cu\\*t', 'kunt', 'cvnt', 'c@nt', 'c0nt', '(unt', '<unt', '(|_|nt',
        '<|_|nt', 'c(_)nt', 'k(_)nt', '©unt', 'cµnt', 'see you next tuesday',
        
        'cock', 'c\\*ck', 'c0ck', 'cok', 'c@ck', 'cawk', '(0(k', '<0<k', '(0(|<', '<0<|<',
        '©0©k', 'co©k', 'co(k', 'c(_)ck', '(ock',
        
        'crap', 'cr@p', 'cr\\*p', 'kr@p', '(r@p', '<r@p', 'cr4p', '(r4p', '<r4p',
        
        // D-words with l33t variations
        'dick', 'd\\*ck', 'd1ck', 'dik', 'd!ck', 'dck', 'deek', 'dyk', 'd|ck', 'd|k', 'd!k',
        '|)i(k', '|)!(|<', 'd1©k', '|)!©|<', 'd1|<', '|>1ck', '|>!(|<',
        
        'damn', 'd\\*mn', 'dam', 'darn', 'damm', 'd@mn', 'd@m', 'd4mn', 'd4m', '|)4mn', '|)@m',
        
        'douche', 'douchebag', 'd-bag', 'd0uche', 'd0uch3', 'd00ch', 'd-b4g', 'd8ag',
        
        // P-words with l33t variations
        'pussy', 'p\\*ssy', 'pu\\*\\*y', 'puss', 'p@ssy', 'pu$$y', 'p0ssy', 'pussies', 'pu$$ies',
        'pu$$!es', 'p|_|ssy', 'p(_)$$y', 'p(_)s$y', 'pµssy', 'p|_|$$y', 'p0$$y', 'pu55y', 'p(_)55y',
        
        'piss', 'p\\*ss', 'p1ss', 'pi$$', 'p!ss', 'p!$$', 'p!$', 'p155', 'pi55', 'p1$', 'p!5$',
        
        'prick', 'pr\\*ck', 'pr1ck', 'pr!ck', 'pr!k', 'pr1k', 'pr|(|<', 'pr!©|<', 'pr1©k',
        
        // W-words with l33t variations
        'whore', 'wh\\*re', 'h0r', 'h0re', 'hor', 'whoar', 'wh0r3', 'wh0re', 'h00r', 'w|-|0r3',
        'w|-|0re', 'wh0ar', '\/\\/h0r3', '\/\\/h0re',
        
        // T-words with l33t variations
        'twat', 'tw@t', 'tw\\*t', 'tw4t', 'tw@7', 'tw47', '7w@7', '7w47', '7\/\/@7', '7\/\/@t',
        
        // Racial and ethnic slurs with l33t variations
        'nigger', 'n\\*gger', 'n1gger', 'n1gg3r', 'nigga', 'n\\*gga', 'n1gga', 'n1gg4', 'n|gg3r',
        'n1663r', 'n166a', 'n166er', 'n|99er', 'n|994', 'n|gg4', 'n1994', 'ni99er', 'ni994',
        
        'chink', 'ch\\*nk', 'ch1nk', 'ch!nk', '(h1nk', '(h!nk', '<h1nk', '<h!nk', '©h!nk', '©h1nk',
        
        'spic', 'sp\\*c', 'sp1c', 'sp!c', '5p1c', '5p!c', '5p1©', '$p1c', '$p!c', '$p1©',
        
        'kike', 'k\\*ke', 'kyke', 'k1ke', 'k!ke', 'k1k3', 'k!k3', '|<1|<3', '|<1ke', '|<!|<3',
        
        'wetback', 'w\\*tback', 'w3tb@ck', 'w37b@ck', 'w3tb@©k', 'w37b@©k', 'wet8@ck',
        
        'fag', 'f\\*g', 'f@g', 'f4g', 'ph@g', 'ph4g', 'f@6', 'f46', 'ph@6', 'ph46',
        
        'faggot', 'f\\*ggot', 'f@ggot', 'f@g60t', 'f@9907', 'f@990t', 'f4gg0t', 'f4g60t',
        'f4g907', 'f49907', 'f4990t', 'ph@990t', 'ph@9907', 'ph4990t', 'ph49907',
        
        'dyke', 'd\\*ke', 'dyk', 'd1k3', 'd!k3', 'd1ke', 'd!ke', '|)1|<3', '|)!|<3', '|>1|<3',
        
        'tranny', 'tr\\*nny', 'tr@nny', 'tr4nny', 'tr@nn1', 'tr4nn1', 'tr@nn!', 'tr4nn!',
        '7r@nn1', '7r4nn1', '7r@nn!', '7r4nn!', '7r@nny', '7r4nny',
        
        'retard', 'ret\\*rd', 'r\\*tard', 'retarded', 'ret@rd', 'r3t@rd', 'r3t4rd', 'r374rd',
        'r37@rd', 'r3tard3d', 'r374rd3d', 'r37@rd3d', 'r3t4rd3d',
        
        // Common combinations and abbreviations with l33t variations
        'stfu', 's7fu', '$7fu', '$tfu', '$7f|_|', 'stf|_|', '57fu', '57f|_|', '$7|=|_|',
        'gtfo', '6tfo', '67fo', 'g7fo', 'g7f0', '67f0', '6tf0',
        'wtf', 'w7f', 'vv7f', 'vvtf', 'vv7|=', 'w7|=', 'wtph', 'w7ph',
        'lmfao', '1mfao', '|mf@o', '1mf@0', '1m|=@0', '|_m|=@0', '|_mf@0',
        'af', '@f', '@|=', '4f', '4|=',
        'fml', 'fm|_', 'f/\\/\\|_', 'ph/\\/\\|_', 'phm|_',
        'kys', 'ky$', 'k1$', 'k!$', '|<y$', '|<1$', '|<y5', '|<15',
        
        'fuckface', 'f|_|ckf@c3', 'f(_)©|<f@©3', 'fu(kf@(e', 'fvckf@ce', 'f|_|ckface', 'f(_)ckface',
        'fuckwit', 'f|_|ckw!7', 'f(_)©|<w!7', 'fu(kw!t', 'fvckwit', 'f|_|ckwit', 'f(_)ckwit',
        'fuckhead', 'f|_|ckh3@d', 'f(_)©|<h3@d', 'fu(kh3@d', 'fvckhead', 'f|_|ckhead', 'f(_)ckhead',
        'fucktard', 'f|_|ckt@rd', 'f(_)©|<t@rd', 'fu(kt@rd', 'fvcktard', 'f|_|cktard', 'f(_)cktard',
        
        'asswipe', '@$$w!p3', '@55w!p3', '@$$wipe', '@55wipe', 'a$$w!p3', 'a55w!p3', 'a$$wipe', 'a55wipe',
        'asslicker', '@$$l!ck3r', '@55l!ck3r', '@$$licker', '@55licker', 'a$$l!ck3r', 'a55l!ck3r',
        
        'cocksucker', 'c0ck$uck3r', '(0(|<$|_|©|<3r', '<0<|<$|_|©|<3r', 'c(_)ck$|_|ck3r',
        
        'dumbass', 'dum8@$$', 'dum8@55', 'dumb@$$', 'dumb@55', 'dum6@$$', 'dum6@55',
        'jackass', 'j@ck@$$', 'j@ck@55', 'j4ck4$$', 'j4ck455',
        'dumbfuck', 'dum8f|_|ck', 'dum8f(_)ck', 'dumbf|_|ck', 'dumbf(_)ck', 'dum6f|_|ck', 'dum6f(_)ck',
        'dipshit', 'd!p$h!7', 'd!p$h17', 'd1p$h17', 'd1p$h!7', 'd!p5h!7', 'd1p5h17',
        'dickhead', 'd!ckh3@d', 'd1ckh3@d', 'd!©|<h3@d', 'd1©|<h3@d', 'd\\*ckhead', 'd!ckhead', 'd1ckhead'
    ];
    
    // Create a regex pattern to match whole words only (with word boundaries)
    // and make it case-insensitive
    const pattern = new RegExp('\\b(' + vulgarWords.join('|') + ')\\b', 'gi');
    
    // Replace each matched word with asterisks of the same length
    return message.replace(pattern, (match) => '*'.repeat(match.length));
}