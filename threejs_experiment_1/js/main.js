import { World } from './world/World.js';
import { LoadingManager } from './core/LoadingManager.js';
import { LoadingScreen } from './core/LoadingScreen.js';
import { AudioManager } from './audio/AudioManager.js';
import { Stats } from './utils/Stats.js';

class Application {
    constructor() {
        // Initialize loading manager
        this.loadingManager = new LoadingManager();
        
        // Initialize loading screen with spinning globe
        this.loadingScreen = new LoadingScreen();
        
        // Initialize stats for performance monitoring
        this.stats = new Stats();
        document.getElementById('fps-counter').appendChild(this.stats.dom);
        
        // Initialize audio manager
        this.audioManager = new AudioManager();
        
        // Initialize world
        this.world = new World({
            audioManager: this.audioManager,
            onProgress: this.updateLoadingProgress.bind(this)
        });
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start loading
        this.loadingManager.onProgress = this.updateLoadingProgress.bind(this);
        this.loadingManager.onComplete = this.onLoadingComplete.bind(this);
        
        // Start the application
        this.init();
    }
    
    init() {
        console.log('Application init started');
        
        // Ensure initial progress is shown
        this.updateLoadingProgress(0.01);
        
        // Start loading assets
        this.world.preload(this.loadingManager).then(() => {
            console.log('World preloaded');
            this.loadingManager.complete();
        }).catch(error => {
            console.error('Error during world preload:', error);
        });
    }
    
    updateLoadingProgress(progress) {
        // Ensure progress is at least 1% to make the bar visible
        const safeProgress = Math.max(0.01, progress);
        
        console.log(`Updating loading progress: ${Math.floor(safeProgress * 100)}%`);
        
        // Update the spinning globe and progress bar
        if (this.loadingScreen) {
            console.log('Updating loading screen with progress:', safeProgress);
            this.loadingScreen.updateProgress(safeProgress);
        } else {
            // Fallback if loadingScreen is not available
            console.warn('Loading screen not available, using fallback');
            const progressBar = document.querySelector('.progress');
            const loadingText = document.querySelector('.loading-text');
            
            if (progressBar) {
                const widthPercentage = `${Math.floor(safeProgress * 100)}%`;
                console.log('Setting progress bar width to:', widthPercentage);
                progressBar.style.width = widthPercentage;
            } else {
                console.error('Progress bar element not found in fallback!');
            }
            
            if (loadingText) {
                loadingText.textContent = `Loading world... ${Math.floor(safeProgress * 100)}%`;
            } else {
                console.error('Loading text element not found in fallback!');
            }
        }
    }
    
    onLoadingComplete() {
        console.log('Loading complete!');
        
        // Hide loading screen with fade out
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            
            // Remove loading screen after fade and clean up resources
            setTimeout(() => {
                loadingScreen.style.display = 'none';
                
                // Dispose of the loading screen resources
                if (this.loadingScreen) {
                    this.loadingScreen.dispose();
                    this.loadingScreen = null;
                }
                
                // Ensure OrbitControls are enabled after loading screen is removed
                if (this.world && this.world.controls) {
                    this.world.controls.enabled = true;
                }
            }, 1000);
        }
        
        // Start the animation loop
        this.animate();
        
        // Start background music
        if (this.audioManager) {
            this.audioManager.playBackgroundMusic('ambient');
        }
    }
    
    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.world.onWindowResize();
        });
        
        // Toggle music with M key
        window.addEventListener('keydown', (event) => {
            if (event.key === 'm' || event.key === 'M') {
                this.audioManager.toggleMute();
            }
        });
        
        // Debug: Log mouse movement to verify controls
        document.addEventListener('mousemove', () => {
            if (Math.random() < 0.001) { // Very occasionally log
                console.log('Mouse movement detected');
            }
        });
        
        // Debug: Log mouse clicks
        document.addEventListener('mousedown', (event) => {
            console.log('Mouse clicked:', event.button);
        });
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Update stats
        this.stats.begin();
        
        // Update world
        this.world.update();
        
        // End stats
        this.stats.end();
    }
}

// Wait for DOM to load before starting the application
window.addEventListener('DOMContentLoaded', () => {
    // Create application and expose it globally for developer access
    window.app = new Application();
    
    // Expose audio functions for developer console
    window.reloadAudio = () => {
        if (window.app && window.app.audioManager) {
            return window.app.audioManager.reloadAudioAssets(window.app.loadingManager);
        } else {
            console.error('Audio manager not available');
            return 'Error: Audio manager not available';
        }
    };
    
    window.debugAudio = () => {
        if (window.app && window.app.audioManager) {
            return window.app.audioManager.debugAudio();
        } else {
            console.error('Audio manager not available');
            return 'Error: Audio manager not available';
        }
    };
    
    // Try to resume audio context if it's suspended (needed for some browsers)
    window.resumeAudio = () => {
        if (window.app && window.app.audioManager && window.app.audioManager.context) {
            if (window.app.audioManager.context.state === 'suspended') {
                window.app.audioManager.context.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                    return 'AudioContext resumed successfully';
                }).catch(error => {
                    console.error('Failed to resume AudioContext:', error);
                    return 'Error: Failed to resume AudioContext';
                });
            } else {
                console.log('AudioContext is already running:', window.app.audioManager.context.state);
                return `AudioContext is already in state: ${window.app.audioManager.context.state}`;
            }
        } else {
            console.error('Audio context not available');
            return 'Error: Audio context not available';
        }
    };
    
    console.log('Developer console functions available:');
    console.log('- reloadAudio(): Reload all audio assets');
    console.log('- debugAudio(): Show detailed audio debug information');
    console.log('- resumeAudio(): Resume audio context if suspended');
});
