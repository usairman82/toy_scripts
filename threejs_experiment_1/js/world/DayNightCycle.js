import * as THREE from 'three';

export class DayNightCycle {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.sky = options.sky;
        this.water = options.water;
        this.renderer = options.renderer;
        this.audioManager = options.audioManager;
        
        // Day/night cycle settings
        this.dayDuration = options.dayDuration || 300; // seconds for a full day/night cycle
        this.timeOfDay = options.startTime || 0.3; // 0-1 range, 0.25 = sunrise, 0.75 = sunset
        this.daySpeed = 1 / this.dayDuration;
        
        // Time of day periods
        this.timeOfDayPeriods = {
            MORNING: 'morning',   // 0.2 - 0.3 (dawn)
            DAY: 'day',           // 0.3 - 0.7 (day)
            EVENING: 'evening',   // 0.7 - 0.8 (dusk)
            NIGHT: 'night'        // 0.8 - 0.2 (night)
        };
        
        // Current time of day period
        this.currentPeriod = this.timeOfDayPeriods.DAY;
        
        // Sun and moon
        this.sunLight = null;
        this.moonLight = null;
        this.ambientLight = null;
        
        // Sun and moon positions
        this.sunPosition = new THREE.Vector3();
        this.moonPosition = new THREE.Vector3();
        
        // Sky parameters
        this.skyParams = {
            turbidity: 10,
            rayleigh: 2,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            elevation: 2,
            azimuth: 180
        };
        
        // Colors
        this.dayAmbientColor = new THREE.Color(0x90a0b0);
        this.nightAmbientColor = new THREE.Color(0x0c1a2c);
        this.sunColor = new THREE.Color(0xffffff);
        this.moonColor = new THREE.Color(0x8090a0);
    }
    
    initialize() {
        // Create sun directional light
        this.sunLight = new THREE.DirectionalLight(this.sunColor, 1.0);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -200;
        this.sunLight.shadow.camera.right = 200;
        this.sunLight.shadow.camera.top = 200;
        this.sunLight.shadow.camera.bottom = -200;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);
        
        // Create moon directional light (dimmer)
        this.moonLight = new THREE.DirectionalLight(this.moonColor, 0.2);
        this.moonLight.castShadow = true;
        this.moonLight.shadow.mapSize.width = 1024;
        this.moonLight.shadow.mapSize.height = 1024;
        this.moonLight.shadow.camera.near = 0.5;
        this.moonLight.shadow.camera.far = 500;
        this.moonLight.shadow.camera.left = -200;
        this.moonLight.shadow.camera.right = 200;
        this.moonLight.shadow.camera.top = 200;
        this.moonLight.shadow.camera.bottom = -200;
        this.moonLight.shadow.bias = -0.0005;
        this.scene.add(this.moonLight);
        
        // Create ambient light
        this.ambientLight = new THREE.AmbientLight(this.dayAmbientColor, 0.5);
        this.scene.add(this.ambientLight);
        
        // Update sky and lights for initial time
        this.updateCycle(0);
    }
    
    update(delta) {
        // Previous time of day for period change detection
        const previousTimeOfDay = this.timeOfDay;
        
        // Update time of day
        this.timeOfDay += this.daySpeed * delta;
        if (this.timeOfDay >= 1) {
            this.timeOfDay -= 1;
        }
        
        // Check for time of day period changes
        this.checkTimeOfDayPeriodChange(previousTimeOfDay);
        
        // Update sky and lights
        this.updateCycle(delta);
    }
    
    // Check if we've entered a new time of day period
    checkTimeOfDayPeriodChange(previousTimeOfDay) {
        // Determine current period
        let newPeriod;
        
        if (this.timeOfDay >= 0.2 && this.timeOfDay < 0.3) {
            newPeriod = this.timeOfDayPeriods.MORNING;
        } else if (this.timeOfDay >= 0.3 && this.timeOfDay < 0.7) {
            newPeriod = this.timeOfDayPeriods.DAY;
        } else if (this.timeOfDay >= 0.7 && this.timeOfDay < 0.8) {
            newPeriod = this.timeOfDayPeriods.EVENING;
        } else {
            newPeriod = this.timeOfDayPeriods.NIGHT;
        }
        
        // Check if period has changed
        if (newPeriod !== this.currentPeriod) {
            this.currentPeriod = newPeriod;
            this.onPeriodChange(newPeriod);
        }
        
        // Check for day cycle wrap-around (night to morning)
        if (previousTimeOfDay > 0.9 && this.timeOfDay < 0.1) {
            // We've wrapped around to a new day
            console.log('A new day begins');
        }
    }
    
    // Handle period change
    onPeriodChange(newPeriod) {
        console.log(`Time of day changed to: ${newPeriod}`);
        
        // Update ambient sounds if audio manager is available
        if (this.audioManager) {
            this.audioManager.changeTimeOfDaySound(newPeriod);
        }
    }
    
    updateCycle(delta) {
        // Calculate sun and moon positions
        this.updateSunPosition();
        this.updateMoonPosition();
        
        // Update sky
        this.updateSky();
        
        // Update lights
        this.updateLights();
        
        // Update water if available
        if (this.water) {
            this.updateWater();
        }
    }
    
    updateSunPosition() {
        // Calculate sun position based on time of day
        // Sun moves in a semicircle from east to west
        const sunAngle = Math.PI * (this.timeOfDay * 2 + 1.5); // offset to start at sunrise
        const sunHeight = Math.sin(Math.PI * this.timeOfDay);
        const sunRadius = 1000;
        
        this.sunPosition.x = Math.cos(sunAngle) * sunRadius;
        this.sunPosition.y = Math.max(0, sunHeight) * sunRadius; // Keep sun above horizon
        this.sunPosition.z = Math.sin(sunAngle) * sunRadius;
        
        // Update sun light position
        this.sunLight.position.copy(this.sunPosition);
        this.sunLight.lookAt(0, 0, 0);
    }
    
    updateMoonPosition() {
        // Moon is opposite to the sun
        this.moonPosition.copy(this.sunPosition).multiplyScalar(-1);
        
        // Update moon light position
        this.moonLight.position.copy(this.moonPosition);
        this.moonLight.lookAt(0, 0, 0);
    }
    
    updateSky() {
        if (!this.sky) return;
        
        // Get sky uniforms
        const uniforms = this.sky.material.uniforms;
        
        // Calculate sun elevation and azimuth
        const sunElevation = Math.max(0, Math.sin(Math.PI * this.timeOfDay) * 90); // 0-90 degrees
        const sunAzimuth = (this.timeOfDay * 360 + 270) % 360; // 0-360 degrees
        
        // Update sky parameters
        this.skyParams.elevation = sunElevation;
        this.skyParams.azimuth = sunAzimuth;
        
        // Adjust sky colors based on time of day
        if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
            // Daytime
            this.skyParams.turbidity = 10;
            this.skyParams.rayleigh = 2;
            this.skyParams.mieCoefficient = 0.005;
            this.skyParams.mieDirectionalG = 0.8;
        } else {
            // Night time
            this.skyParams.turbidity = 5;
            this.skyParams.rayleigh = 3;
            this.skyParams.mieCoefficient = 0.002;
            this.skyParams.mieDirectionalG = 0.6;
        }
        
        // Convert elevation and azimuth to radians
        const phi = THREE.MathUtils.degToRad(90 - this.skyParams.elevation);
        const theta = THREE.MathUtils.degToRad(this.skyParams.azimuth);
        
        // Calculate sun position
        const sunPosition = new THREE.Vector3();
        sunPosition.setFromSphericalCoords(1, phi, theta);
        
        // Update sky uniforms
        uniforms['turbidity'].value = this.skyParams.turbidity;
        uniforms['rayleigh'].value = this.skyParams.rayleigh;
        uniforms['mieCoefficient'].value = this.skyParams.mieCoefficient;
        uniforms['mieDirectionalG'].value = this.skyParams.mieDirectionalG;
        uniforms['sunPosition'].value.copy(sunPosition);
    }
    
    updateLights() {
        // Calculate light intensities based on time of day
        let sunIntensity, moonIntensity, ambientIntensity;
        
        if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
            // Daytime
            const dayProgress = (this.timeOfDay - 0.25) / 0.5; // 0 at sunrise, 1 at sunset
            const dayFactor = Math.sin(dayProgress * Math.PI); // Peaks at noon
            
            sunIntensity = 1.0 * (0.8 + 0.2 * dayFactor);
            moonIntensity = 0;
            ambientIntensity = 0.5 * (0.8 + 0.2 * dayFactor);
            
            // Transition ambient color
            this.ambientLight.color.copy(this.dayAmbientColor);
        } else {
            // Night time
            const nightProgress = (this.timeOfDay < 0.25) ? 
                (0.25 - this.timeOfDay) / 0.25 : // Before sunrise
                (this.timeOfDay - 0.75) / 0.25;  // After sunset
            
            sunIntensity = 0;
            moonIntensity = 0.2 * nightProgress;
            ambientIntensity = 0.1 + 0.1 * (1 - nightProgress);
            
            // Transition ambient color
            this.ambientLight.color.copy(this.nightAmbientColor);
        }
        
        // Apply intensities
        this.sunLight.intensity = sunIntensity;
        this.moonLight.intensity = moonIntensity;
        this.ambientLight.intensity = ambientIntensity;
        
        // Handle sunrise/sunset transitions
        if (this.timeOfDay > 0.2 && this.timeOfDay < 0.3) {
            // Sunrise
            const t = (this.timeOfDay - 0.2) / 0.1;
            this.sunLight.color.copy(this.sunColor).lerp(new THREE.Color(0xff8040), 1 - t);
        } else if (this.timeOfDay > 0.7 && this.timeOfDay < 0.8) {
            // Sunset
            const t = (this.timeOfDay - 0.7) / 0.1;
            this.sunLight.color.copy(this.sunColor).lerp(new THREE.Color(0xff8040), t);
        } else if (this.timeOfDay > 0.3 && this.timeOfDay < 0.7) {
            // Full day
            this.sunLight.color.copy(this.sunColor);
        }
    }
    
    updateWater() {
        // Update water sun direction
        if (this.water.material.uniforms['sunDirection']) {
            const sunDirection = new THREE.Vector3();
            sunDirection.copy(this.sunPosition).normalize();
            this.water.material.uniforms['sunDirection'].value.copy(sunDirection);
        }
        
        // Update water color based on time of day
        if (this.water.material.uniforms['waterColor']) {
            let waterColor;
            
            if (this.timeOfDay > 0.25 && this.timeOfDay < 0.75) {
                // Daytime - blue water
                waterColor = new THREE.Color(0x001e0f);
            } else {
                // Nighttime - darker water
                waterColor = new THREE.Color(0x000a14);
            }
            
            this.water.material.uniforms['waterColor'].value.copy(waterColor);
        }
    }
    
    // Set time of day directly (0-1)
    setTimeOfDay(time) {
        this.timeOfDay = time;
        this.updateCycle(0);
    }
}
