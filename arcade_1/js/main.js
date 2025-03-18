// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        MenuScene,
        GameScene,
        GameOverScene
    ],
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.RESIZE, // Changed from FIT to RESIZE for better responsive behavior
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

// Global variables
const GAME = {
    score: 0,
    highScore: 0,
    level: 1,  // Explicitly start at level 1
    lives: 3,
    isMuted: false,
    killScreenCode: ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'enter'],
    currentCodeIndex: 0,
    isMobile: false,
    scoreValues: {
        basicEnemy: 100,
        fastEnemy: 200,
        bossEnemy: 500,
        powerUp: 50
    }
};

// Reset game state to ensure we start at level 1
function resetGameState() {
    GAME.level = 1;
    GAME.lives = 3;
    GAME.score = 0;
    GAME.currentCodeIndex = 0;
    console.log("Game state reset: GAME.level =", GAME.level);
}

// Call reset before initializing the game
resetGameState();

// Check if we're on a mobile device
GAME.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Initialize the game
const game = new Phaser.Game(config);

// Load high score from local storage if available
window.addEventListener('load', function() {
    const savedHighScore = localStorage.getItem('galagaHighScore');
    if (savedHighScore) {
        GAME.highScore = parseInt(savedHighScore);
    }
    // Make sure level is reset when loading the page
    GAME.level = 1;
});

// Save high score when window is closed
window.addEventListener('beforeunload', function() {
    localStorage.setItem('galagaHighScore', GAME.highScore.toString());
});

// Handle fullscreen toggle on mobile
document.addEventListener('touchstart', function(e) {
    if (e.touches.length === 4) { // 4-finger touch to toggle fullscreen
        toggleFullScreen();
    }
}, false);

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}
