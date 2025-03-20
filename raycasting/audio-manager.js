/**
 * Audio Manager for Dungeon Adventure Game
 * Handles loading, playing, and managing audio assets
 */

console.log("AudioManager.js loaded - Script execution started");

class AudioManager {
    constructor() {
        console.log("AudioManager constructor called");
        
        // Audio context
        this.audioContext = null;
        
        // Audio elements
        this.sounds = {};
        this.music = {};
        
        // Current background music
        this.currentMusic = null;
        
        // Volume settings
        this.settings = {
            masterVolume: 0.7,
            musicVolume: 0.5,
            sfxVolume: 0.8,
            muted: false
        };
        
        // Atmospheric sound settings
        this.atmosphericSounds = [
            'door-creaking',
            'dripping',
            'droplets-in-cave-1',
            'monster-growl',
            'rattling-keys',
            'steps'
        ];
        
        this.atmosphericTimer = null;
        
        // Initialize audio context
        this.initAudioContext();
    }
    
    /**
     * Initialize the audio context
     */
    initAudioContext() {
        try {
            // Create audio context
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            console.log("AudioContext initialized successfully");
            
            // Create master gain node
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.settings.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
            
            // Create separate gain nodes for music and sound effects
            this.musicGain = this.audioContext.createGain();
            this.musicGain.gain.value = this.settings.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            this.sfxGain = this.audioContext.createGain();
            this.sfxGain.gain.value = this.settings.sfxVolume;
            this.sfxGain.connect(this.masterGain);
        } catch (error) {
            console.error("Failed to initialize AudioContext:", error);
        }
    }
    
    /**
     * Resume audio context (needed for browsers that suspend it until user interaction)
     */
    resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed successfully");
            }).catch(error => {
                console.error("Failed to resume AudioContext:", error);
            });
        }
    }
    
    /**
     * Load a sound effect
     * @param {string} name - Sound identifier
     * @param {string} url - Sound URL
     * @returns {Promise} - Promise that resolves when the sound is loaded
     */
    loadSound(name, url) {
        console.log(`Loading sound: ${name} from ${url}`);
        return new Promise((resolve, reject) => {
            // Create audio element
            const audio = new Audio();
            
            // Set a timeout to detect stalled loads
            const loadTimeout = setTimeout(() => {
                console.warn(`Sound load timeout for ${name} (${url})`);
                reject(new Error(`Sound load timeout: ${url}`));
            }, 10000); // 10 second timeout
            
            audio.oncanplaythrough = () => {
                clearTimeout(loadTimeout);
                console.log(`Sound loaded successfully: ${name}`);
                this.sounds[name] = audio;
                resolve(audio);
            };
            
            audio.onerror = (error) => {
                clearTimeout(loadTimeout);
                console.warn(`Failed to load sound: ${url}`, error);
                reject(new Error(`Failed to load sound: ${url}`));
            };
            
            // Start loading the audio
            audio.src = url;
            audio.load();
        });
    }
    
    /**
     * Load background music
     * @param {string} name - Music identifier
     * @param {string} url - Music URL
     * @returns {Promise} - Promise that resolves when the music is loaded
     */
    loadMusic(name, url) {
        console.log(`Loading music: ${name} from ${url}`);
        return new Promise((resolve, reject) => {
            // Create audio element
            const audio = new Audio();
            
            // Set music properties
            audio.loop = true;
            
            // Set a timeout to detect stalled loads
            const loadTimeout = setTimeout(() => {
                console.warn(`Music load timeout for ${name} (${url})`);
                reject(new Error(`Music load timeout: ${url}`));
            }, 15000); // 15 second timeout for larger music files
            
            audio.oncanplaythrough = () => {
                clearTimeout(loadTimeout);
                console.log(`Music loaded successfully: ${name}`);
                this.music[name] = audio;
                resolve(audio);
            };
            
            audio.onerror = (error) => {
                clearTimeout(loadTimeout);
                console.warn(`Failed to load music: ${url}`, error);
                reject(new Error(`Failed to load music: ${url}`));
            };
            
            // Start loading the audio
            audio.src = url;
            audio.load();
        });
    }
    
    /**
     * Play a sound effect
     * @param {string} name - Sound identifier
     * @param {number} volume - Volume (0-1)
     */
    playSound(name, volume = 1.0) {
        if (this.settings.muted) return;
        
        // Resume audio context if needed
        this.resumeAudioContext();
        
        const sound = this.sounds[name];
        if (sound) {
            try {
                // Create a clone of the audio to allow overlapping sounds
                const soundClone = sound.cloneNode();
                
                // Set volume
                soundClone.volume = Math.min(1.0, Math.max(0, volume * this.settings.sfxVolume * this.settings.masterVolume));
                
                // Play the sound
                soundClone.play().catch(error => {
                    console.warn(`Failed to play sound ${name}:`, error);
                });
            } catch (error) {
                console.error(`Error playing sound ${name}:`, error);
            }
        } else {
            console.warn(`Sound not found: ${name}`);
        }
    }
    
    /**
     * Play background music
     * @param {string} name - Music identifier
     * @param {boolean} fadeIn - Whether to fade in the music
     * @param {number} fadeTime - Fade time in milliseconds
     */
    playMusic(name, fadeIn = true, fadeTime = 2000) {
        if (!this.music[name]) {
            console.warn(`Music not found: ${name}`);
            return;
        }
        
        // Resume audio context if needed
        this.resumeAudioContext();
        
        // Stop current music if playing
        if (this.currentMusic) {
            this.stopMusic(true, fadeTime / 2);
        }
        
        // Set current music
        this.currentMusic = this.music[name];
        
        // Set initial volume
        this.currentMusic.volume = fadeIn ? 0 : this.settings.musicVolume * this.settings.masterVolume;
        
        // Play the music
        if (!this.settings.muted) {
            this.currentMusic.play().catch(error => {
                console.warn(`Failed to play music ${name}:`, error);
            });
        }
        
        // Fade in if needed
        if (fadeIn && !this.settings.muted) {
            const startTime = performance.now();
            const startVolume = 0;
            const targetVolume = this.settings.musicVolume * this.settings.masterVolume;
            
            const fadeInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(1, elapsed / fadeTime);
                
                this.currentMusic.volume = startVolume + (targetVolume - startVolume) * progress;
                
                if (progress >= 1) {
                    clearInterval(fadeInterval);
                }
            }, 50);
        }
    }
    
    /**
     * Stop background music
     * @param {boolean} fadeOut - Whether to fade out the music
     * @param {number} fadeTime - Fade time in milliseconds
     */
    stopMusic(fadeOut = true, fadeTime = 2000) {
        if (!this.currentMusic) return;
        
        if (fadeOut) {
            const startTime = performance.now();
            const startVolume = this.currentMusic.volume;
            const targetVolume = 0;
            
            const fadeInterval = setInterval(() => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(1, elapsed / fadeTime);
                
                this.currentMusic.volume = startVolume + (targetVolume - startVolume) * progress;
                
                if (progress >= 1) {
                    clearInterval(fadeInterval);
                    this.currentMusic.pause();
                    this.currentMusic.currentTime = 0;
                    this.currentMusic = null;
                }
            }, 50);
        } else {
            this.currentMusic.pause();
            this.currentMusic.currentTime = 0;
            this.currentMusic = null;
        }
    }
    
    /**
     * Pause all audio
     */
    pauseAll() {
        // Pause current music
        if (this.currentMusic) {
            this.currentMusic.pause();
        }
        
        // Pause all sound effects
        Object.values(this.sounds).forEach(sound => {
            if (!sound.paused) {
                sound.pause();
            }
        });
    }
    
    /**
     * Resume all audio
     */
    resumeAll() {
        // Resume audio context
        this.resumeAudioContext();
        
        // Resume current music
        if (this.currentMusic && !this.settings.muted) {
            this.currentMusic.play().catch(error => {
                console.warn("Failed to resume music:", error);
            });
        }
        
        // Restart atmospheric sounds timer if it was running
        this.startAtmosphericSoundsTimer();
    }
    
    /**
     * Set master volume
     * @param {number} volume - Volume (0-1)
     */
    setMasterVolume(volume) {
        this.settings.masterVolume = Math.min(1.0, Math.max(0, volume));
        
        // Update master gain
        if (this.masterGain) {
            this.masterGain.gain.value = this.settings.masterVolume;
        }
        
        // Update current music volume
        if (this.currentMusic && !this.settings.muted) {
            this.currentMusic.volume = this.settings.musicVolume * this.settings.masterVolume;
        }
    }
    
    /**
     * Set music volume
     * @param {number} volume - Volume (0-1)
     */
    setMusicVolume(volume) {
        this.settings.musicVolume = Math.min(1.0, Math.max(0, volume));
        
        // Update music gain
        if (this.musicGain) {
            this.musicGain.gain.value = this.settings.musicVolume;
        }
        
        // Update current music volume
        if (this.currentMusic && !this.settings.muted) {
            this.currentMusic.volume = this.settings.musicVolume * this.settings.masterVolume;
        }
    }
    
    /**
     * Set sound effects volume
     * @param {number} volume - Volume (0-1)
     */
    setSfxVolume(volume) {
        this.settings.sfxVolume = Math.min(1.0, Math.max(0, volume));
        
        // Update sfx gain
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.settings.sfxVolume;
        }
    }
    
    /**
     * Toggle mute
     * @returns {boolean} - New mute state
     */
    toggleMute() {
        this.settings.muted = !this.settings.muted;
        
        if (this.settings.muted) {
            // Mute all audio
            if (this.masterGain) {
                this.masterGain.gain.value = 0;
            }
            
            // Pause current music
            if (this.currentMusic) {
                this.currentMusic.pause();
            }
            
            // Stop atmospheric sounds timer
            this.stopAtmosphericSoundsTimer();
        } else {
            // Unmute all audio
            if (this.masterGain) {
                this.masterGain.gain.value = this.settings.masterVolume;
            }
            
            // Resume current music
            if (this.currentMusic) {
                this.currentMusic.play().catch(error => {
                    console.warn("Failed to resume music after unmute:", error);
                });
            }
            
            // Restart atmospheric sounds timer
            this.startAtmosphericSoundsTimer();
        }
        
        return this.settings.muted;
    }
    
    /**
     * Set mute state
     * @param {boolean} muted - Mute state
     */
    setMuted(muted) {
        if (this.settings.muted !== muted) {
            this.toggleMute();
        }
    }
    /**
     * Start the atmospheric sounds timer
     */
    startAtmosphericSoundsTimer() {
        // Clear any existing timer
        this.stopAtmosphericSoundsTimer();
        
        // Don't start if muted
        if (this.settings.muted) return;
        
        // Set a random interval between 10-30 seconds
        const randomInterval = Math.floor(Math.random() * 20000) + 10000; // 10-30 seconds
        
        console.log(`Starting atmospheric sound timer: ${randomInterval}ms`);
        
        this.atmosphericTimer = setTimeout(() => {
            this.playRandomAtmosphericSound();
            // Restart the timer after playing a sound
            this.startAtmosphericSoundsTimer();
        }, randomInterval);
    }
    
    /**
     * Stop the atmospheric sounds timer
     */
    stopAtmosphericSoundsTimer() {
        if (this.atmosphericTimer) {
            clearTimeout(this.atmosphericTimer);
            this.atmosphericTimer = null;
        }
    }
    
    /**
     * Play a random atmospheric sound at a lower volume
     */
    playRandomAtmosphericSound() {
        // Don't play if muted
        if (this.settings.muted) return;
        
        // Get a random sound from the atmospheric sounds list
        const randomIndex = Math.floor(Math.random() * this.atmosphericSounds.length);
        const soundName = this.atmosphericSounds[randomIndex];
        
        console.log(`Playing random atmospheric sound: ${soundName}`);
        
        // Play at a lower volume (40% of normal volume)
        this.playSound(soundName, 0.4);
    }
}

// Export the audio manager
window.AudioManager = AudioManager;
