import * as THREE from 'three';

export class AudioManager {
    constructor() {
        // Create audio listener
        this.listener = new THREE.AudioListener();
        
        // Sound collections
        this.backgroundMusic = {};
        this.soundEffects = {};
        
        // Current playing background music
        this.currentMusic = null;
        
        // Audio state
        this.muted = false;
        this.volume = 0.5;
        
        // Weather-specific sounds
        this.weatherSounds = {
            clear: null,
            rain: null,
            snow: null,
            fog: null
        };
        
        // Time-of-day ambient sounds
        this.timeOfDaySounds = {
            morning: null,   // Dawn chorus, birds chirping
            day: null,       // Light ambient sounds
            evening: null,   // Evening ambience, crickets starting
            night: null      // Night sounds, crickets, owls
        };
        
        // Animal sounds
        this.animalSounds = {
            birds: {},       // Various bird calls
            insects: {},     // Crickets, cicadas, etc.
            mammals: {},     // Wolves, coyotes, etc.
            misc: {}         // Other animal sounds
        };
        
        // Currently playing ambient sounds
        this.currentAmbientSounds = [];
        
        // Ambient sound timers
        this.ambientSoundTimers = {};
        
        // Create global audio context
        this.context = this.listener.context;
    }
    
    // Add the listener to the camera
    setCamera(camera) {
        camera.add(this.listener);
    }
    
    // Load background music with fallback (MP3 format)
    loadBackgroundMusic(name, url, loadingManager, fallbackBuffer = null) {
        // Ensure URL ends with .mp3
        if (!url.endsWith('.mp3')) {
            url = url + '.mp3';
        }
        
        return new Promise((resolve) => {
            try {
                loadingManager.audioLoader.load(url, (buffer) => {
                    const sound = new THREE.Audio(this.listener);
                    sound.setBuffer(buffer);
                    sound.setLoop(true);
                    sound.setVolume(0.3);
                    this.backgroundMusic[name] = sound;
                    resolve(sound);
                }, 
                undefined, // onProgress callback
                (error) => {
                    console.warn(`Error loading background music "${name}": ${error}`);
                    if (fallbackBuffer) {
                        console.log(`Using fallback for "${name}"`);
                        const sound = new THREE.Audio(this.listener);
                        sound.setBuffer(fallbackBuffer);
                        sound.setLoop(true);
                        sound.setVolume(0.3);
                        this.backgroundMusic[name] = sound;
                        resolve(sound);
                    } else {
                        resolve(null);
                    }
                });
            } catch (error) {
                console.warn(`Error loading background music "${name}": ${error}`);
                if (fallbackBuffer) {
                    console.log(`Using fallback for "${name}"`);
                    const sound = new THREE.Audio(this.listener);
                    sound.setBuffer(fallbackBuffer);
                    sound.setLoop(true);
                    sound.setVolume(0.3);
                    this.backgroundMusic[name] = sound;
                }
                resolve(null);
            }
        });
    }
    
    // Load sound effect with fallback (MP3 format)
    loadSoundEffect(name, url, loadingManager, fallbackBuffer = null) {
        // Ensure URL ends with .mp3
        if (!url.endsWith('.mp3')) {
            url = url + '.mp3';
        }
        
        return new Promise((resolve) => {
            try {
                loadingManager.audioLoader.load(url, (buffer) => {
                    const sound = new THREE.Audio(this.listener);
                    sound.setBuffer(buffer);
                    sound.setLoop(false);
                    sound.setVolume(0.5);
                    this.soundEffects[name] = sound;
                    resolve(sound);
                },
                undefined, // onProgress callback
                (error) => {
                    console.warn(`Error loading sound effect "${name}": ${error}`);
                    if (fallbackBuffer) {
                        console.log(`Using fallback for "${name}"`);
                        const sound = new THREE.Audio(this.listener);
                        sound.setBuffer(fallbackBuffer);
                        sound.setLoop(false);
                        sound.setVolume(0.5);
                        this.soundEffects[name] = sound;
                        resolve(sound);
                    } else {
                        resolve(null);
                    }
                });
            } catch (error) {
                console.warn(`Error loading sound effect "${name}": ${error}`);
                if (fallbackBuffer) {
                    console.log(`Using fallback for "${name}"`);
                    const sound = new THREE.Audio(this.listener);
                    sound.setBuffer(fallbackBuffer);
                    sound.setLoop(false);
                    sound.setVolume(0.5);
                    this.soundEffects[name] = sound;
                }
                resolve(null);
            }
        });
    }
    
    // Load positional sound (3D sound) with fallback (MP3 format)
    loadPositionalSound(name, url, loadingManager, fallbackBuffer = null) {
        // Ensure URL ends with .mp3
        if (!url.endsWith('.mp3')) {
            url = url + '.mp3';
        }
        
        return new Promise((resolve) => {
            try {
                loadingManager.audioLoader.load(url, (buffer) => {
                    const sound = new THREE.PositionalAudio(this.listener);
                    sound.setBuffer(buffer);
                    sound.setRefDistance(20);
                    sound.setLoop(false);
                    sound.setVolume(0.5);
                    this.soundEffects[name] = sound;
                    resolve(sound);
                },
                undefined, // onProgress callback
                (error) => {
                    console.warn(`Error loading positional sound "${name}": ${error}`);
                    if (fallbackBuffer) {
                        console.log(`Using fallback for "${name}"`);
                        const sound = new THREE.PositionalAudio(this.listener);
                        sound.setBuffer(fallbackBuffer);
                        sound.setRefDistance(20);
                        sound.setLoop(false);
                        sound.setVolume(0.5);
                        this.soundEffects[name] = sound;
                        resolve(sound);
                    } else {
                        resolve(null);
                    }
                });
            } catch (error) {
                console.warn(`Error loading positional sound "${name}": ${error}`);
                if (fallbackBuffer) {
                    console.log(`Using fallback for "${name}"`);
                    const sound = new THREE.PositionalAudio(this.listener);
                    sound.setBuffer(fallbackBuffer);
                    sound.setRefDistance(20);
                    sound.setLoop(false);
                    sound.setVolume(0.5);
                    this.soundEffects[name] = sound;
                }
                resolve(null);
            }
        });
    }
    
    // Play background music
    playBackgroundMusic(name) {
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        
        if (this.backgroundMusic[name]) {
            this.backgroundMusic[name].play();
            this.currentMusic = this.backgroundMusic[name];
        } else {
            console.warn(`Background music "${name}" not found, creating fallback`);
            
            // Create a fallback sound if the requested music is not found
            const duration = 2;
            const sampleRate = 44100;
            const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
            
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.3);
            
            // Store the fallback sound
            this.backgroundMusic[name] = sound;
            sound.play();
            this.currentMusic = sound;
        }
    }
    
    // Play sound effect
    playSoundEffect(name) {
        if (this.soundEffects[name]) {
            if (this.soundEffects[name].isPlaying) {
                this.soundEffects[name].stop();
            }
            this.soundEffects[name].play();
        } else {
            console.warn(`Sound effect "${name}" not found`);
        }
    }
    
    // Create a new instance of a sound effect (for overlapping sounds)
    playSoundEffectInstance(name) {
        if (this.soundEffects[name]) {
            const sound = this.soundEffects[name].clone();
            sound.play();
            return sound;
        } else {
            console.warn(`Sound effect "${name}" not found`);
            return null;
        }
    }
    
    // Change weather sounds
    changeWeatherSound(weatherType) {
        // Stop all weather sounds
        Object.values(this.weatherSounds).forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        });
        
        // Play the new weather sound
        if (this.weatherSounds[weatherType]) {
            this.weatherSounds[weatherType].play();
        }
    }
    
    // Change time-of-day ambient sounds
    changeTimeOfDaySound(timeOfDay) {
        // Stop all time-of-day sounds
        Object.values(this.timeOfDaySounds).forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        });
        
        // Play the new time-of-day sound
        if (this.timeOfDaySounds[timeOfDay]) {
            this.timeOfDaySounds[timeOfDay].play();
        }
        
        // Schedule appropriate animal sounds based on time of day
        this.scheduleAnimalSounds(timeOfDay);
    }
    
    // Schedule animal sounds based on time of day
    scheduleAnimalSounds(timeOfDay) {
        // Clear existing timers
        Object.values(this.ambientSoundTimers).forEach(timer => {
            clearTimeout(timer);
        });
        this.ambientSoundTimers = {};
        
        // Schedule different animal sounds based on time of day
        switch (timeOfDay) {
            case 'morning':
                // Birds are active in the morning
                this.scheduleRandomSound('birds_morning', 5000, 15000);
                break;
                
            case 'day':
                // Birds are less active during the day
                this.scheduleRandomSound('birds_day', 10000, 30000);
                // Occasional cicadas during hot days
                this.scheduleRandomSound('cicadas', 20000, 60000);
                break;
                
            case 'evening':
                // Crickets start in the evening
                this.scheduleRandomSound('crickets', 8000, 20000);
                // Occasional cat sounds
                this.scheduleRandomSound('cat', 30000, 120000);
                break;
                
            case 'night':
                // Crickets are very active at night
                this.scheduleRandomSound('crickets', 5000, 15000);
                // Occasional owl hoots
                this.scheduleRandomSound('owl', 15000, 45000);
                // Rare wolf/coyote howls
                this.scheduleRandomSound('wolf', 60000, 180000);
                this.scheduleRandomSound('coyote', 90000, 240000);
                // Frogs near water
                this.scheduleRandomSound('frog', 20000, 60000);
                break;
        }
    }
    
    // Schedule a random sound to play at intervals
    scheduleRandomSound(soundName, minDelay, maxDelay) {
        const playRandomSound = () => {
            // Play the sound
            this.playSoundEffect(soundName);
            
            // Schedule the next occurrence
            const nextDelay = minDelay + Math.random() * (maxDelay - minDelay);
            this.ambientSoundTimers[soundName] = setTimeout(playRandomSound, nextDelay);
        };
        
        // Initial delay
        const initialDelay = minDelay + Math.random() * (maxDelay - minDelay);
        this.ambientSoundTimers[soundName] = setTimeout(playRandomSound, initialDelay);
    }
    
    // Toggle mute state
    toggleMute() {
        this.muted = !this.muted;
        
        // Apply mute state to all sounds
        Object.values(this.backgroundMusic).forEach(sound => {
            sound.setVolume(this.muted ? 0 : this.volume * 0.3);
        });
        
        Object.values(this.soundEffects).forEach(sound => {
            sound.setVolume(this.muted ? 0 : this.volume * 0.5);
        });
        
        Object.values(this.weatherSounds).forEach(sound => {
            if (sound) {
                sound.setVolume(this.muted ? 0 : this.volume * 0.4);
            }
        });
        
        Object.values(this.timeOfDaySounds).forEach(sound => {
            if (sound) {
                sound.setVolume(this.muted ? 0 : this.volume * 0.4);
            }
        });
        
        console.log(`Sound ${this.muted ? 'muted' : 'unmuted'}`);
    }
    
    // Set master volume
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (!this.muted) {
            // Apply volume to all sounds
            Object.values(this.backgroundMusic).forEach(sound => {
                sound.setVolume(this.volume * 0.3);
            });
            
            Object.values(this.soundEffects).forEach(sound => {
                sound.setVolume(this.volume * 0.5);
            });
            
            Object.values(this.weatherSounds).forEach(sound => {
                if (sound) {
                    sound.setVolume(this.volume * 0.4);
                }
            });
            
            Object.values(this.timeOfDaySounds).forEach(sound => {
                if (sound) {
                    sound.setVolume(this.volume * 0.4);
                }
            });
        }
    }
    
    // Preload all audio assets
    async preload(loadingManager) {
        try {
            // Create empty audio buffer for testing/fallback
            const duration = 2;
            const sampleRate = 44100;
            const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
            
            // Load background music (try multiple locations)
            console.log('Attempting to load background music from multiple locations...');
            
            try {
                // Try multiple paths for background music with Windows-friendly path separators
                console.log('Loading background music from multiple locations...');
                
                // Define multiple possible paths to try
                const musicPaths = [
                    'assets/audio/music/background/background_music.mp3',
                    './assets/audio/music/background/background_music.mp3',
                    '../assets/audio/music/background/background_music.mp3',
                    'assets\\audio\\music\\background\\background_music.mp3',
                    '.\\assets\\audio\\music\\background\\background_music.mp3',
                    // Add the correct path from the file structure
                    'assets/audio/ambient/background_music.mp3',
                    './assets/audio/ambient/background_music.mp3',
                    '../assets/audio/ambient/background_music.mp3',
                    'assets\\audio\\ambient\\background_music.mp3',
                    '.\\assets\\audio\\ambient\\background_music.mp3'
                ];
                
                // Try each path until one works
                let loaded = false;
                for (const path of musicPaths) {
                    console.log(`Attempting to load background music from: ${path}`);
                    try {
                        const ambientMusic = await this.loadBackgroundMusic(
                            'ambient', 
                            path, 
                            loadingManager, 
                            null // Don't use fallback buffer yet
                        );
                        
                        if (this.backgroundMusic['ambient']) {
                            console.log(`Successfully loaded background music from: ${path}`);
                            loaded = true;
                            break;
                        }
                    } catch (err) {
                        console.warn(`Failed to load from ${path}:`, err);
                    }
                }
                
                // If all paths failed, use fallback buffer
                if (!loaded) {
                    console.warn('Failed to load background music from any location, using fallback');
                    const sound = new THREE.Audio(this.listener);
                    sound.setBuffer(buffer);
                    sound.setLoop(true);
                    sound.setVolume(0.3);
                    this.backgroundMusic['ambient'] = sound;
                }
            } catch (error) {
                console.error('Error during background music loading:', error);
                
                // Create fallback sound
                console.warn('Using fallback sound for background music');
                const sound = new THREE.Audio(this.listener);
                sound.setBuffer(buffer);
                sound.setLoop(true);
                sound.setVolume(0.3);
                this.backgroundMusic['ambient'] = sound;
            }
            
            // Load weather sounds
            await Promise.all([
                this.loadSoundEffect('clear', 'assets/audio/weather/clear.mp3', loadingManager, buffer),
                this.loadSoundEffect('rain', 'assets/audio/weather/rain.mp3', loadingManager, buffer),
                this.loadSoundEffect('snow', 'assets/audio/weather/snow.mp3', loadingManager, buffer),
                this.loadSoundEffect('fog', 'assets/audio/weather/fog.mp3', loadingManager, buffer)
            ]);
            
            // Load time-of-day ambient sounds
            await Promise.all([
                this.loadSoundEffect('morning', 'assets/audio/ambient/morning.mp3', loadingManager, buffer),
                this.loadSoundEffect('day', 'assets/audio/ambient/day.mp3', loadingManager, buffer),
                this.loadSoundEffect('evening', 'assets/audio/ambient/evening.mp3', loadingManager, buffer),
                this.loadSoundEffect('night', 'assets/audio/ambient/night.mp3', loadingManager, buffer)
            ]);
            
            // Load animal sounds
            await Promise.all([
                // Birds
                this.loadSoundEffect('birds_morning', 'assets/audio/animals/birds_morning.mp3', loadingManager, buffer),
                this.loadSoundEffect('birds_day', 'assets/audio/animals/birds_day.mp3', loadingManager, buffer),
                this.loadSoundEffect('owl', 'assets/audio/animals/owl.mp3', loadingManager, buffer),
                
                // Insects
                this.loadSoundEffect('crickets', 'assets/audio/animals/crickets.mp3', loadingManager, buffer),
                this.loadSoundEffect('cicadas', 'assets/audio/animals/cicadas.mp3', loadingManager, buffer),
                
                // Mammals
                this.loadSoundEffect('wolf', 'assets/audio/animals/wolf.mp3', loadingManager, buffer),
                this.loadSoundEffect('coyote', 'assets/audio/animals/coyote.mp3', loadingManager, buffer),
                this.loadSoundEffect('cat', 'assets/audio/animals/cat.mp3', loadingManager, buffer),
                
                // Misc
                this.loadSoundEffect('frog', 'assets/audio/animals/frog.mp3', loadingManager, buffer)
            ]);
            
            // Assign sounds to their categories
            this.timeOfDaySounds.morning = this.soundEffects['morning'];
            this.timeOfDaySounds.day = this.soundEffects['day'];
            this.timeOfDaySounds.evening = this.soundEffects['evening'];
            this.timeOfDaySounds.night = this.soundEffects['night'];
            
            this.weatherSounds.clear = this.soundEffects['clear'];
            this.weatherSounds.rain = this.soundEffects['rain'];
            this.weatherSounds.snow = this.soundEffects['snow'];
            this.weatherSounds.fog = this.soundEffects['fog'];
            
            this.animalSounds.birds.morning = this.soundEffects['birds_morning'];
            this.animalSounds.birds.day = this.soundEffects['birds_day'];
            this.animalSounds.birds.owl = this.soundEffects['owl'];
            
            this.animalSounds.insects.crickets = this.soundEffects['crickets'];
            this.animalSounds.insects.cicadas = this.soundEffects['cicadas'];
            
            this.animalSounds.mammals.wolf = this.soundEffects['wolf'];
            this.animalSounds.mammals.coyote = this.soundEffects['coyote'];
            this.animalSounds.mammals.cat = this.soundEffects['cat'];
            
            this.animalSounds.misc.frog = this.soundEffects['frog'];
            
            console.log('Audio assets loaded successfully');
        } catch (error) {
            console.warn('Error loading audio assets:', error);
            console.log('Using placeholder audio instead');
            
            // Create placeholder sounds if loading fails
            this.createPlaceholderSounds();
        }
    }
    
    // Reload all audio assets - can be called from developer console
    reloadAudioAssets(loadingManager = null) {
        console.log('Reloading all audio assets...');
        
        // Stop all currently playing sounds
        if (this.currentMusic) {
            this.currentMusic.stop();
        }
        
        Object.values(this.soundEffects).forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        });
        
        Object.values(this.weatherSounds).forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        });
        
        Object.values(this.timeOfDaySounds).forEach(sound => {
            if (sound && sound.isPlaying) {
                sound.stop();
            }
        });
        
        // Clear existing timers
        Object.values(this.ambientSoundTimers).forEach(timer => {
            clearTimeout(timer);
        });
        this.ambientSoundTimers = {};
        
        // Reset sound collections
        this.backgroundMusic = {};
        this.soundEffects = {};
        this.weatherSounds = {
            clear: null,
            rain: null,
            snow: null,
            fog: null
        };
        this.timeOfDaySounds = {
            morning: null,
            day: null,
            evening: null,
            night: null
        };
        this.animalSounds = {
            birds: {},
            insects: {},
            mammals: {},
            misc: {}
        };
        
        // If no loading manager is provided, try to use the global one
        if (!loadingManager && window.app && window.app.loadingManager) {
            loadingManager = window.app.loadingManager;
        }
        
        // Reload assets
        if (loadingManager) {
            this.preload(loadingManager)
                .then(() => {
                    console.log('Audio assets reloaded successfully');
                })
                .catch(error => {
                    console.error('Error reloading audio assets:', error);
                });
        } else {
            console.error('No loading manager available for reloading audio assets');
        }
        
        return 'Audio reload initiated. Check console for results.';
    }
    
    // Debug function to check audio status - can be called from developer console
    debugAudio() {
        console.group('Audio Debug Information');
        
        // Check background music
        console.group('Background Music');
        if (Object.keys(this.backgroundMusic).length === 0) {
            console.warn('No background music loaded');
        } else {
            Object.entries(this.backgroundMusic).forEach(([name, sound]) => {
                console.log(`${name}: ${sound ? 'Loaded' : 'Not loaded'} ${sound && sound.isPlaying ? '(Playing)' : ''}`);
            });
        }
        console.groupEnd();
        
        // Check sound effects
        console.group('Sound Effects');
        if (Object.keys(this.soundEffects).length === 0) {
            console.warn('No sound effects loaded');
        } else {
            Object.entries(this.soundEffects).forEach(([name, sound]) => {
                console.log(`${name}: ${sound ? 'Loaded' : 'Not loaded'} ${sound && sound.isPlaying ? '(Playing)' : ''}`);
            });
        }
        console.groupEnd();
        
        // Check weather sounds
        console.group('Weather Sounds');
        Object.entries(this.weatherSounds).forEach(([name, sound]) => {
            console.log(`${name}: ${sound ? 'Loaded' : 'Not loaded'} ${sound && sound.isPlaying ? '(Playing)' : ''}`);
        });
        console.groupEnd();
        
        // Check time-of-day sounds
        console.group('Time-of-Day Sounds');
        Object.entries(this.timeOfDaySounds).forEach(([name, sound]) => {
            console.log(`${name}: ${sound ? 'Loaded' : 'Not loaded'} ${sound && sound.isPlaying ? '(Playing)' : ''}`);
        });
        console.groupEnd();
        
        // Audio context state
        console.group('Audio Context');
        console.log(`State: ${this.context.state}`);
        console.log(`Sample Rate: ${this.context.sampleRate}`);
        console.log(`Current Time: ${this.context.currentTime.toFixed(2)}s`);
        console.groupEnd();
        
        // General audio state
        console.group('Audio State');
        console.log(`Muted: ${this.muted}`);
        console.log(`Volume: ${this.volume}`);
        console.log(`Current Music: ${this.currentMusic ? 'Playing' : 'None'}`);
        console.groupEnd();
        
        console.groupEnd();
        
        return 'Audio debug information logged to console';
    }
    
    // Create placeholder sounds if audio files are missing
    createPlaceholderSounds() {
        // Create empty audio buffer for testing
        const duration = 2;
        const sampleRate = 44100;
        const buffer = this.context.createBuffer(1, duration * sampleRate, sampleRate);
        
        // Create placeholder background music
        const placeholderMusic = new THREE.Audio(this.listener);
        placeholderMusic.setBuffer(buffer);
        placeholderMusic.setLoop(true);
        placeholderMusic.setVolume(0.3);
        this.backgroundMusic['ambient'] = placeholderMusic;
        
        // Create placeholder weather sounds
        Object.keys(this.weatherSounds).forEach(weather => {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.4);
            this.weatherSounds[weather] = sound;
        });
        
        // Create placeholder time-of-day sounds
        Object.keys(this.timeOfDaySounds).forEach(timeOfDay => {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(buffer);
            sound.setLoop(true);
            sound.setVolume(0.4);
            this.timeOfDaySounds[timeOfDay] = sound;
        });
        
        // Create placeholder animal sounds
        ['birds_morning', 'birds_day', 'owl', 'crickets', 'cicadas', 'wolf', 'coyote', 'cat', 'frog'].forEach(animal => {
            const sound = new THREE.Audio(this.listener);
            sound.setBuffer(buffer);
            sound.setLoop(false);
            sound.setVolume(0.5);
            this.soundEffects[animal] = sound;
        });
    }
}
