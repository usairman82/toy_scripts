// This worker handles the heavy computation tasks for world generation
// to keep the main thread free for UI updates

// Import necessary modules
// Note: Workers can't directly import ES modules, so we'll use importScripts for external dependencies
// and pass necessary data from the main thread

// Handle messages from the main thread
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'generate':
            generateWorldData(data);
            break;
        default:
            console.error('Unknown message type:', type);
    }
};

// Main function to generate world data
async function generateWorldData(params) {
    const { worldSize, worldSeed } = params;
    
    try {
        // Report starting
        self.postMessage({ type: 'progress', data: { stage: 'starting', progress: 0.05 } });
        
        // Generate terrain data
        const terrainData = generateTerrainData(worldSize, worldSeed);
        self.postMessage({ type: 'progress', data: { stage: 'terrain', progress: 0.3 } });
        
        // Generate vegetation data
        const vegetationData = generateVegetationData(worldSize, worldSeed, terrainData);
        self.postMessage({ type: 'progress', data: { stage: 'vegetation', progress: 0.5 } });
        
        // Generate buildings data
        const buildingsData = generateBuildingsData(worldSize, worldSeed, terrainData);
        self.postMessage({ type: 'progress', data: { stage: 'buildings', progress: 0.7 } });
        
        // Generate weather data
        const weatherData = generateWeatherData(worldSize, worldSeed);
        self.postMessage({ type: 'progress', data: { stage: 'weather', progress: 0.8 } });
        
        // Generate character data
        const characterData = generateCharacterData(worldSize, worldSeed, terrainData);
        self.postMessage({ type: 'progress', data: { stage: 'character', progress: 0.9 } });
        
        // Send completed data back to main thread
        self.postMessage({
            type: 'complete',
            data: {
                terrain: terrainData,
                vegetation: vegetationData,
                buildings: buildingsData,
                weather: weatherData,
                character: characterData
            }
        });
    } catch (error) {
        self.postMessage({ type: 'error', data: error.toString() });
    }
}

// Terrain generation function
function generateTerrainData(worldSize, seed) {
    // Simulate computation time - reduced for better performance
    simulateHeavyComputation(0.1);
    
    // Return terrain data
    return {
        heightMap: generateImprovedHeightMap(worldSize, seed),
        size: worldSize,
        seed: seed
    };
}

// Vegetation generation function
function generateVegetationData(worldSize, seed, terrainData) {
    // Simulate computation time - reduced for better performance
    simulateHeavyComputation(0.1);
    
    // Return vegetation data
    return {
        positions: generateRandomPositions(worldSize, seed, 500), // 500 vegetation items
        types: generateRandomTypes(500, 5), // 5 different types
        size: worldSize,
        seed: seed
    };
}

// Buildings generation function
function generateBuildingsData(worldSize, seed, terrainData) {
    // Simulate computation time - reduced for better performance
    simulateHeavyComputation(0.1);
    
    // Return buildings data
    return {
        positions: generateRandomPositions(worldSize, seed, 50), // 50 buildings
        types: generateRandomTypes(50, 10), // 10 different types
        size: worldSize,
        seed: seed
    };
}

// Weather generation function
function generateWeatherData(worldSize, seed) {
    // Simulate computation time - reduced for better performance
    simulateHeavyComputation(0.05);
    
    // Return weather data
    return {
        type: getRandomWeatherType(),
        intensity: Math.random(),
        seed: seed
    };
}

// Character generation function
function generateCharacterData(worldSize, seed, terrainData) {
    // Simulate computation time - reduced for better performance
    simulateHeavyComputation(0.05);
    
    // Find a suitable starting position
    const startX = 0;
    const startZ = 0;
    const height = sampleHeightMap(terrainData.heightMap, startX, startZ, worldSize);
    
    // Return character data
    return {
        position: { x: startX, y: height + 5, z: startZ }, // Increased height to ensure character is above terrain
        seed: seed
    };
}

// Helper functions

// Simulate heavy computation - REDUCED for better performance
function simulateHeavyComputation(factor = 1) {
    // This simulates the time it would take to do complex calculations
    // In a real implementation, this would be replaced with actual computation
    const iterations = 100000 * factor; // Reduced by 100x from original
    let dummy = 0;
    for (let i = 0; i < iterations; i++) {
        dummy += Math.sin(i * 0.01) * Math.cos(i * 0.01);
    }
}

// Generate an improved height map with more land above water
function generateImprovedHeightMap(size, seed) {
    // Match resolution with terrain resolution (256 in Terrain.js)
    const resolution = 256;
    const heightMap = new Float32Array((resolution + 1) * (resolution + 1));
    
    // Ensure seed is a valid number
    const safeSeed = isNaN(seed) ? Math.random() * 10000 : seed;
    
    // Improved noise-based height map with more variation and higher elevation
    for (let z = 0; z <= resolution; z++) {
        for (let x = 0; x <= resolution; x++) {
            const nx = x / resolution - 0.5;
            const nz = z / resolution - 0.5;
            
            // Base continental shape (large features)
            let height = Math.sin(nx * 3 + safeSeed) * Math.cos(nz * 3 + safeSeed) * 50;
            
            // Medium features
            height += Math.sin(nx * 10 + safeSeed * 1.5) * Math.cos(nz * 10 + safeSeed * 1.5) * 25;
            
            // Small features
            height += Math.sin(nx * 30 + safeSeed * 2) * Math.cos(nz * 30 + safeSeed * 2) * 10;
            
            // Add distance-based elevation to create islands/continents
            const distanceFromCenter = Math.sqrt(nx * nx + nz * nz) * 2.5;
            const continentalShape = Math.max(0, 1 - distanceFromCenter);
            height += continentalShape * 40; // Boost center height
            
            // Ensure most terrain is above water level (water is at -5)
            height += 20;
            
            // Check for NaN and replace with a safe value
            if (isNaN(height)) {
                height = 0;
            }
            
            heightMap[z * (resolution + 1) + x] = height;
        }
    }
    
    return heightMap;
}

// Keep the original simple height map function for reference
function generateSimpleHeightMap(size, seed) {
    // Match resolution with terrain resolution (256 in Terrain.js)
    const resolution = 256;
    const heightMap = new Float32Array(resolution * resolution);
    
    // Ensure seed is a valid number
    const safeSeed = isNaN(seed) ? Math.random() * 10000 : seed;
    
    // Simple noise-based height map
    for (let z = 0; z < resolution; z++) {
        for (let x = 0; x < resolution; x++) {
            const nx = x / resolution - 0.5;
            const nz = z / resolution - 0.5;
            
            // Simple noise function
            let height = Math.sin(nx * 5 + safeSeed) * Math.cos(nz * 5 + safeSeed) * 10;
            height += Math.sin(nx * 20 + safeSeed) * Math.cos(nz * 20 + safeSeed) * 5;
            height += Math.sin(nx * 50 + safeSeed) * Math.cos(nz * 50 + safeSeed) * 2;
            
            // Check for NaN and replace with a safe value
            if (isNaN(height)) {
                height = 0;
            }
            
            heightMap[z * resolution + x] = height;
        }
    }
    
    return heightMap;
}

// Sample height from height map
function sampleHeightMap(heightMap, x, z, worldSize) {
    const resolution = Math.sqrt(heightMap.length) - 1;
    
    // Convert world coordinates to height map indices
    const halfSize = worldSize / 2;
    const nx = ((x + halfSize) / worldSize) * resolution;
    const nz = ((z + halfSize) / worldSize) * resolution;
    
    // Get indices
    const ix = Math.floor(nx);
    const iz = Math.floor(nz);
    
    // Clamp to valid range
    const clampedIx = Math.max(0, Math.min(resolution, ix));
    const clampedIz = Math.max(0, Math.min(resolution, iz));
    
    // Get height
    return heightMap[clampedIz * (resolution + 1) + clampedIx];
}

// Generate random positions
function generateRandomPositions(worldSize, seed, count) {
    const positions = [];
    const halfSize = worldSize / 2;
    
    for (let i = 0; i < count; i++) {
        positions.push({
            x: (Math.random() * worldSize) - halfSize,
            z: (Math.random() * worldSize) - halfSize
        });
    }
    
    return positions;
}

// Generate random types
function generateRandomTypes(count, typeCount) {
    const types = [];
    
    for (let i = 0; i < count; i++) {
        types.push(Math.floor(Math.random() * typeCount));
    }
    
    return types;
}

// Get random weather type
function getRandomWeatherType() {
    const types = ['clear', 'cloudy', 'rain', 'storm', 'fog'];
    return types[Math.floor(Math.random() * types.length)];
}
