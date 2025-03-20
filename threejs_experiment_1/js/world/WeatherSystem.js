import * as THREE from 'three';

export class WeatherSystem {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.audioManager = options.audioManager;
        
        // Precomputed data from worker (if available)
        this.precomputedData = options.precomputedData || null;
        
        // Particle count settings for performance tuning
        this.rainParticleCount = options.particleCount || 10000;
        this.snowParticleCount = Math.floor((options.particleCount || 5000) / 2);
        
        // Weather types
        this.weatherTypes = {
            CLEAR: 'clear',
            RAIN: 'rain',
            SNOW: 'snow',
            FOG: 'fog'
        };
        
        // Current weather (use precomputed data if available)
        this.currentWeather = this.precomputedData?.type || this.weatherTypes.CLEAR;
        
        // Weather transition
        this.transitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 10; // seconds
        this.targetWeather = null;
        
        // Weather change settings
        this.minWeatherDuration = 60; // seconds
        this.maxWeatherDuration = 300; // seconds
        this.weatherTimer = 0;
        this.nextWeatherChange = this.getRandomWeatherDuration();
        
        // Weather particles
        this.rainParticles = null;
        this.snowParticles = null;
        
        // Fog settings
        this.defaultFogDensity = 0.001;
        this.fogDensity = this.defaultFogDensity;
        this.fogColor = new THREE.Color(0xaaaaaa);
        
        // Weather info element
        this.weatherInfoElement = document.getElementById('weather-info');
        
        console.log(`Weather system initialized with ${this.rainParticleCount} rain particles and ${this.snowParticleCount} snow particles`);
    }
    
    async initialize(loadingManager) {
        // Create particle systems
        this.createRainParticles();
        this.createSnowParticles();
        
        // Set initial weather (use precomputed data if available)
        const initialWeather = this.precomputedData?.type || this.weatherTypes.CLEAR;
        this.setWeather(initialWeather);
        
        return true;
    }
    
    // New method to apply precomputed data from worker
    applyData() {
        if (!this.precomputedData) {
            console.warn('No precomputed weather data to apply');
            return;
        }
        
        console.log('Applying precomputed weather data');
        
        // Create particle systems if they don't exist yet
        if (!this.rainParticles) this.createRainParticles();
        if (!this.snowParticles) this.createSnowParticles();
        
        // Set weather based on precomputed data
        if (this.precomputedData.type) {
            this.setWeather(this.precomputedData.type);
        }
        
        // Set weather intensity if available
        if (this.precomputedData.intensity !== undefined) {
            // Adjust particle opacity or fog density based on intensity
            const intensity = this.precomputedData.intensity;
            
            if (this.rainParticles) {
                this.rainParticles.material.opacity = 0.6 * intensity;
            }
            
            if (this.snowParticles) {
                this.snowParticles.material.opacity = 0.8 * intensity;
            }
            
            if (this.scene.fog) {
                // Adjust fog density based on weather type and intensity
                switch (this.currentWeather) {
                    case this.weatherTypes.CLEAR:
                        this.scene.fog.density = this.defaultFogDensity;
                        break;
                    case this.weatherTypes.RAIN:
                        this.scene.fog.density = this.defaultFogDensity * (1 + intensity);
                        break;
                    case this.weatherTypes.SNOW:
                        this.scene.fog.density = this.defaultFogDensity * (2 + intensity);
                        break;
                    case this.weatherTypes.FOG:
                        this.scene.fog.density = this.defaultFogDensity * (3 + 2 * intensity);
                        break;
                }
            }
        }
        
        return true;
    }
    
    createRainParticles() {
        // Rain particle geometry
        const rainGeometry = new THREE.BufferGeometry();
        const rainVertices = [];
        
        // Create rain drops with optimized count
        const rainSpread = 1000; // How far the rain spreads
        const rainHeight = 500; // How high the rain starts
        
        for (let i = 0; i < this.rainParticleCount; i++) {
            // Random position within a cube
            const x = (Math.random() - 0.5) * rainSpread;
            const y = Math.random() * rainHeight;
            const z = (Math.random() - 0.5) * rainSpread;
            
            rainVertices.push(x, y, z);
        }
        
        rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
        
        // Rain material - optimized for performance
        const rainMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false // Improve performance by disabling depth writes
        });
        
        // Create rain particle system
        this.rainParticles = new THREE.Points(rainGeometry, rainMaterial);
        this.rainParticles.visible = false;
        this.rainParticles.frustumCulled = true; // Enable frustum culling for better performance
        this.scene.add(this.rainParticles);
        
        console.log(`Created rain particle system with ${this.rainParticleCount} particles`);
    }
    
    createSnowParticles() {
        // Snow particle geometry
        const snowGeometry = new THREE.BufferGeometry();
        const snowVertices = [];
        
        // Create snowflakes with optimized count
        const snowSpread = 1000; // How far the snow spreads
        const snowHeight = 500; // How high the snow starts
        
        for (let i = 0; i < this.snowParticleCount; i++) {
            // Random position within a cube
            const x = (Math.random() - 0.5) * snowSpread;
            const y = Math.random() * snowHeight;
            const z = (Math.random() - 0.5) * snowSpread;
            
            snowVertices.push(x, y, z);
        }
        
        snowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(snowVertices, 3));
        
        // Snow material - optimized for performance
        const snowMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.0,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            depthWrite: false // Improve performance by disabling depth writes
        });
        
        // Create snow particle system
        this.snowParticles = new THREE.Points(snowGeometry, snowMaterial);
        this.snowParticles.visible = false;
        this.snowParticles.frustumCulled = true; // Enable frustum culling for better performance
        this.scene.add(this.snowParticles);
        
        console.log(`Created snow particle system with ${this.snowParticleCount} particles`);
    }
    
    setWeather(weatherType) {
        // Set current weather
        this.currentWeather = weatherType;
        
        // Update weather info display
        this.updateWeatherInfo();
        
        // Apply weather effects
        switch (weatherType) {
            case this.weatherTypes.CLEAR:
                this.setClearWeather();
                break;
            case this.weatherTypes.RAIN:
                this.setRainWeather();
                break;
            case this.weatherTypes.SNOW:
                this.setSnowWeather();
                break;
            case this.weatherTypes.FOG:
                this.setFogWeather();
                break;
        }
        
        // Play weather sound
        if (this.audioManager) {
            this.audioManager.changeWeatherSound(weatherType);
        }
    }
    
    setClearWeather() {
        // Hide particles
        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = false;
        
        // Reset fog
        if (this.scene.fog) {
            this.scene.fog.density = this.defaultFogDensity;
        }
    }
    
    setRainWeather() {
        // Show rain particles
        if (this.rainParticles) this.rainParticles.visible = true;
        if (this.snowParticles) this.snowParticles.visible = false;
        
        // Slightly increase fog
        if (this.scene.fog) {
            this.scene.fog.density = this.defaultFogDensity * 2;
        }
    }
    
    setSnowWeather() {
        // Show snow particles
        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = true;
        
        // Increase fog
        if (this.scene.fog) {
            this.scene.fog.density = this.defaultFogDensity * 3;
        }
    }
    
    setFogWeather() {
        // Hide particles
        if (this.rainParticles) this.rainParticles.visible = false;
        if (this.snowParticles) this.snowParticles.visible = false;
        
        // Heavy fog
        if (this.scene.fog) {
            this.scene.fog.density = this.defaultFogDensity * 5;
        }
    }
    
    updateWeatherInfo() {
        // Update weather info display
        if (this.weatherInfoElement) {
            this.weatherInfoElement.textContent = `Weather: ${this.currentWeather.charAt(0).toUpperCase() + this.currentWeather.slice(1)}`;
        }
    }
    
    transitionToWeather(weatherType) {
        if (this.currentWeather === weatherType) return;
        
        this.transitioning = true;
        this.transitionProgress = 0;
        this.targetWeather = weatherType;
        
        console.log(`Transitioning to ${weatherType} weather`);
    }
    
    getRandomWeatherType() {
        const weatherTypes = Object.values(this.weatherTypes);
        let newWeather;
        
        do {
            newWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
        } while (newWeather === this.currentWeather);
        
        return newWeather;
    }
    
    getRandomWeatherDuration() {
        return this.minWeatherDuration + Math.random() * (this.maxWeatherDuration - this.minWeatherDuration);
    }
    
    update(delta) {
        // Update weather timer
        this.weatherTimer += delta;
        
        // Check if it's time to change weather
        if (this.weatherTimer >= this.nextWeatherChange && !this.transitioning) {
            const newWeather = this.getRandomWeatherType();
            this.transitionToWeather(newWeather);
            this.weatherTimer = 0;
            this.nextWeatherChange = this.getRandomWeatherDuration();
        }
        
        // Handle weather transition
        if (this.transitioning) {
            this.transitionProgress += delta / this.transitionDuration;
            
            if (this.transitionProgress >= 1) {
                this.transitioning = false;
                this.setWeather(this.targetWeather);
            }
        }
        
        // Update rain particles - optimized to update fewer particles per frame
        if (this.rainParticles && this.rainParticles.visible) {
            const positions = this.rainParticles.geometry.attributes.position.array;
            
            // Only update a subset of particles each frame for better performance
            const updateCount = Math.min(positions.length / 3, 2000);
            const startIndex = Math.floor(Math.random() * (positions.length / 3 - updateCount)) * 3;
            
            for (let i = startIndex; i < startIndex + updateCount * 3; i += 3) {
                // Move rain down
                positions[i + 1] -= 200 * delta; // Rain speed
                
                // Reset rain drop if it's below ground
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 500; // Reset to top
                }
            }
            
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Update snow particles - optimized to update fewer particles per frame
        if (this.snowParticles && this.snowParticles.visible) {
            const positions = this.snowParticles.geometry.attributes.position.array;
            
            // Only update a subset of particles each frame for better performance
            const updateCount = Math.min(positions.length / 3, 1000);
            const startIndex = Math.floor(Math.random() * (positions.length / 3 - updateCount)) * 3;
            
            for (let i = startIndex; i < startIndex + updateCount * 3; i += 3) {
                // Move snow down with some horizontal drift
                positions[i] += Math.sin(Date.now() * 0.001 + i) * 0.2 * delta;
                positions[i + 1] -= 20 * delta; // Snow speed
                positions[i + 2] += Math.cos(Date.now() * 0.0015 + i) * 0.2 * delta;
                
                // Reset snowflake if it's below ground
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 500; // Reset to top
                }
            }
            
            this.snowParticles.geometry.attributes.position.needsUpdate = true;
        }
    }
}
