import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';
import { MeshBVH, MeshBVHHelper } from 'three-mesh-bvh';

export class Terrain {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.worldSize = options.worldSize || 2000;
        this.seed = options.seed || Math.random() * 10000;
        
        // Terrain settings
        this.resolution = options.resolution || 256; // Grid resolution
        this.maxHeight = options.maxHeight || 200;
        this.minHeight = options.minHeight || -50;
        this.smoothing = options.smoothing || 0.5;
        
        // Biome settings
        this.biomeScale = options.biomeScale || 0.001;
        this.biomeBlendingFactor = options.biomeBlendingFactor || 0.2;
        
        // Precomputed data from worker (if available)
        this.precomputedData = options.precomputedData || null;
        
        // Noise generators (only created if needed)
        if (!this.precomputedData) {
            this.heightNoise = new Noise(this.seed);
            this.biomeNoise = new Noise(this.seed + 1000);
            this.detailNoise = new Noise(this.seed + 2000);
        }
        
        // Terrain mesh
        this.mesh = null;
        this.geometry = null;
        this.heightData = null;
        this.biomeData = null;
        
        // Textures
        this.textures = {
            grass: null,
            rock: null,
            sand: null,
            snow: null,
            dirt: null
        };
        
        // Biome types
        this.biomeTypes = {
            GRASSLAND: 0,
            FOREST: 1,
            DESERT: 2,
            MOUNTAIN: 3,
            SNOW: 4
        };
    }
    
    async generate(loadingManager) {
        // Load textures
        await this.loadTextures(loadingManager);
        
        // Generate terrain data
        this.generateTerrainData();
        
        // Create terrain mesh
        this.createTerrainMesh();
        
        // Add terrain to scene
        this.scene.add(this.mesh);
        
        // Set terrain layer for raycasting
        this.mesh.layers.enable(1);
        
        return this.mesh;
    }
    
    // New method to apply precomputed data from worker
    applyData() {
        if (!this.precomputedData) {
            console.warn('No precomputed terrain data to apply');
            return;
        }
        
        console.log('Applying precomputed terrain data');
        
        // If we have precomputed height data, use it
        if (this.precomputedData.heightMap) {
            this.heightData = this.precomputedData.heightMap;
        }
        
        // Create terrain mesh with the precomputed data
        this.createTerrainMesh();
        
        // Add terrain to scene
        this.scene.add(this.mesh);
        
        // Set terrain layer for raycasting
        this.mesh.layers.enable(1);
        
        return this.mesh;
    }
    
    async loadTextures(loadingManager) {
        // In a real implementation, we would load actual textures
        // For now, we'll create basic materials
        
        // Create basic materials for each terrain type
        this.materials = {
            grass: new THREE.MeshStandardMaterial({ color: 0x3b7d4f, roughness: 0.8 }),
            rock: new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.9 }),
            sand: new THREE.MeshStandardMaterial({ color: 0xd9c2a0, roughness: 0.7 }),
            snow: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
            dirt: new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
        };
    }
    
    generateTerrainData() {
        // If we have precomputed data, use it
        if (this.precomputedData && this.precomputedData.heightMap) {
            console.log('Using precomputed terrain data');
            this.heightData = this.precomputedData.heightMap;
            
            // Create biome data if not provided
            const size = this.resolution + 1;
            this.biomeData = this.precomputedData.biomeData || new Uint8Array(size * size);
            
            // Log height data stats to debug
            let min = Infinity;
            let max = -Infinity;
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < this.heightData.length; i++) {
                const height = this.heightData[i];
                if (!isNaN(height)) {
                    min = Math.min(min, height);
                    max = Math.max(max, height);
                    sum += height;
                    count++;
                }
            }
            
            console.log(`Height data stats: min=${min.toFixed(2)}, max=${max.toFixed(2)}, avg=${(sum/count).toFixed(2)}, count=${count}`);
            
            return;
        }
        
        // Otherwise generate from scratch
        console.log('Generating terrain data from scratch');
        
        // Create height and biome data arrays
        const size = this.resolution + 1;
        this.heightData = new Float32Array(size * size);
        this.biomeData = new Uint8Array(size * size);
        
        // Terrain generation options
        const options = {
            scale: 0.002,
            elevation: this.maxHeight,
            octaves: 8,
            persistence: 0.5,
            lacunarity: 2.0,
            ridgeWeight: 0.8,
            fbmWeight: 1.0
        };
        
        // Generate height and biome data
        for (let z = 0; z < size; z++) {
            for (let x = 0; x < size; x++) {
                const index = z * size + x;
                
                // Convert grid coordinates to world coordinates
                const worldX = (x / this.resolution) * this.worldSize - this.worldSize / 2;
                const worldZ = (z / this.resolution) * this.worldSize - this.worldSize / 2;
                
                // Generate biome value
                const biomeValue = this.biomeNoise.fbm(
                    worldX * this.biomeScale,
                    worldZ * this.biomeScale,
                    3, // Fewer octaves for smoother biome transitions
                    2.0,
                    0.5
                );
                
                // Determine biome type based on noise value
                let biomeType;
                if (biomeValue < -0.3) {
                    biomeType = this.biomeTypes.DESERT;
                } else if (biomeValue < 0.0) {
                    biomeType = this.biomeTypes.GRASSLAND;
                } else if (biomeValue < 0.3) {
                    biomeType = this.biomeTypes.FOREST;
                } else if (biomeValue < 0.6) {
                    biomeType = this.biomeTypes.MOUNTAIN;
                } else {
                    biomeType = this.biomeTypes.SNOW;
                }
                
                // Store biome type
                this.biomeData[index] = biomeType;
                
                // Adjust terrain options based on biome
                let biomeOptions = { ...options };
                
                switch (biomeType) {
                    case this.biomeTypes.DESERT:
                        biomeOptions.elevation = this.maxHeight * 0.3;
                        biomeOptions.ridgeWeight = 0.2;
                        biomeOptions.fbmWeight = 1.0;
                        break;
                    case this.biomeTypes.GRASSLAND:
                        biomeOptions.elevation = this.maxHeight * 0.5;
                        biomeOptions.ridgeWeight = 0.4;
                        biomeOptions.fbmWeight = 1.0;
                        break;
                    case this.biomeTypes.FOREST:
                        biomeOptions.elevation = this.maxHeight * 0.7;
                        biomeOptions.ridgeWeight = 0.6;
                        biomeOptions.fbmWeight = 1.0;
                        break;
                    case this.biomeTypes.MOUNTAIN:
                        biomeOptions.elevation = this.maxHeight * 0.9;
                        biomeOptions.ridgeWeight = 1.0;
                        biomeOptions.fbmWeight = 0.6;
                        break;
                    case this.biomeTypes.SNOW:
                        biomeOptions.elevation = this.maxHeight;
                        biomeOptions.ridgeWeight = 1.0;
                        biomeOptions.fbmWeight = 0.4;
                        break;
                }
                
                // Generate height value
                let height = this.heightNoise.terrain(worldX, worldZ, biomeOptions);
                
                // Add detail noise
                const detail = this.detailNoise.fbm(
                    worldX * 0.05,
                    worldZ * 0.05,
                    4,
                    2.0,
                    0.5
                ) * 10;
                
                height += detail;
                
                // Clamp height to min/max values
                height = Math.max(this.minHeight, Math.min(this.maxHeight, height));
                
                // Store height value
                this.heightData[index] = height;
            }
        }
    }
    
    createTerrainMesh() {
        // Create geometry
        const size = this.resolution + 1;
        this.geometry = new THREE.PlaneGeometry(
            this.worldSize,
            this.worldSize,
            this.resolution,
            this.resolution
        );
        
        // Rotate to horizontal plane
        this.geometry.rotateX(-Math.PI / 2);
        
        // Apply height data to vertices
        const vertices = this.geometry.attributes.position.array;
        for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
            // Check for NaN values in height data
            const height = this.heightData[j];
            vertices[i + 1] = isNaN(height) ? 0 : height;
        }
        
        // Update geometry
        this.geometry.computeVertexNormals();
        this.geometry.attributes.position.needsUpdate = true;
        
        // Create material
        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0.1,
            side: THREE.DoubleSide
        });
        
        // Apply vertex colors based on biome and height
        const colors = new Float32Array(vertices.length);
        const colorAttribute = new THREE.BufferAttribute(colors, 3);
        
        for (let i = 0, j = 0; i < vertices.length; i += 3, j++) {
            const height = vertices[i + 1];
            const biomeType = this.biomeData[j];
            
            // Normalize height for color calculation
            const normalizedHeight = (height - this.minHeight) / (this.maxHeight - this.minHeight);
            
            // Base color based on biome
            let color = new THREE.Color();
            
            switch (biomeType) {
                case this.biomeTypes.DESERT:
                    color.copy(this.materials.sand.color);
                    break;
                case this.biomeTypes.GRASSLAND:
                    color.copy(this.materials.grass.color);
                    break;
                case this.biomeTypes.FOREST:
                    color.copy(this.materials.grass.color).multiplyScalar(0.8);
                    break;
                case this.biomeTypes.MOUNTAIN:
                    // Blend between dirt, rock, and snow based on height
                    if (normalizedHeight < 0.6) {
                        color.copy(this.materials.dirt.color);
                    } else if (normalizedHeight < 0.8) {
                        color.copy(this.materials.rock.color);
                    } else {
                        color.copy(this.materials.snow.color);
                    }
                    break;
                case this.biomeTypes.SNOW:
                    color.copy(this.materials.snow.color);
                    break;
            }
            
            // Apply height-based coloring for all biomes
            if (biomeType !== this.biomeTypes.SNOW && normalizedHeight > 0.8) {
                // Blend with snow at high elevations
                const snowBlend = (normalizedHeight - 0.8) / 0.2;
                color.lerp(this.materials.snow.color, snowBlend);
            } else if (biomeType !== this.biomeTypes.DESERT && normalizedHeight < 0.2) {
                // Blend with sand at low elevations
                const sandBlend = (0.2 - normalizedHeight) / 0.2;
                color.lerp(this.materials.sand.color, sandBlend);
            }
            
            // Apply color to vertex
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        
        this.geometry.setAttribute('color', colorAttribute);
        
        // Create mesh
        this.mesh = new THREE.Mesh(this.geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.name = 'terrain';
        
        // Create BVH for efficient raycasting
        this.mesh.geometry.boundsTree = new MeshBVH(this.mesh.geometry);
    }
    
    getHeightAt(x, z) {
        if (!this.mesh) return 0;
        
        try {
            // Create ray starting high above the terrain
            const rayOrigin = new THREE.Vector3(x, this.maxHeight * 2, z);
            const rayDirection = new THREE.Vector3(0, -1, 0);
            
            // Create raycaster
            const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);
            raycaster.layers.set(1); // Set to terrain layer
            
            // Cast ray
            const intersects = raycaster.intersectObject(this.mesh);
            
            if (intersects.length > 0) {
                const height = intersects[0].point.y;
                // Check for NaN values
                if (isNaN(height)) {
                    throw new Error("Raycasting returned NaN height");
                }
                return height;
            }
            
            // Fallback: sample height data directly
            // Convert world coordinates to grid coordinates
            const gridX = Math.floor((x + this.worldSize / 2) / this.worldSize * this.resolution);
            const gridZ = Math.floor((z + this.worldSize / 2) / this.worldSize * this.resolution);
            
            // Clamp to grid bounds
            const clampedGridX = Math.max(0, Math.min(this.resolution, gridX));
            const clampedGridZ = Math.max(0, Math.min(this.resolution, gridZ));
            
            // Get height from height data
            const index = clampedGridZ * (this.resolution + 1) + clampedGridX;
            const height = this.heightData[index] || 0;
            
            // Check for NaN values
            if (isNaN(height)) {
                console.warn(`Height data at (${x}, ${z}) is NaN, returning 0`);
                return 0;
            }
            
            return height;
        } catch (error) {
            console.warn(`Error getting height at (${x}, ${z}): ${error.message}`);
            return 0; // Return a safe default value
        }
    }
    
    getBiomeAt(x, z) {
        if (!this.biomeData) return this.biomeTypes.GRASSLAND;
        
        // Convert world coordinates to grid coordinates
        const gridX = Math.floor((x + this.worldSize / 2) / this.worldSize * this.resolution);
        const gridZ = Math.floor((z + this.worldSize / 2) / this.worldSize * this.resolution);
        
        // Clamp to grid bounds
        const clampedGridX = Math.max(0, Math.min(this.resolution, gridX));
        const clampedGridZ = Math.max(0, Math.min(this.resolution, gridZ));
        
        // Get biome from biome data
        const index = clampedGridZ * (this.resolution + 1) + clampedGridX;
        return this.biomeData[index] || this.biomeTypes.GRASSLAND;
    }
    
    // Get slope at a specific point (for vegetation and building placement)
    getSlopeAt(x, z, radius = 1) {
        if (!this.mesh) return 1;
        
        try {
            // Sample heights in a small radius
            const heights = [];
            const samples = 4;
            
            for (let i = 0; i < samples; i++) {
                const angle = (i / samples) * Math.PI * 2;
                const sampleX = x + Math.cos(angle) * radius;
                const sampleZ = z + Math.sin(angle) * radius;
                heights.push(this.getHeightAt(sampleX, sampleZ));
            }
            
            // Calculate max height difference
            const centerHeight = this.getHeightAt(x, z);
            
            // Check for NaN values
            if (isNaN(centerHeight)) {
                console.warn(`Center height at (${x}, ${z}) is NaN, returning default slope`);
                return 0.5; // Return a moderate default slope
            }
            
            let maxDiff = 0;
            let validHeightCount = 0;
            
            for (const height of heights) {
                if (!isNaN(height)) {
                    const diff = Math.abs(height - centerHeight);
                    maxDiff = Math.max(maxDiff, diff);
                    validHeightCount++;
                }
            }
            
            // If no valid heights were found, return a default value
            if (validHeightCount === 0) {
                console.warn(`No valid heights found around (${x}, ${z}), returning default slope`);
                return 0.5; // Return a moderate default slope
            }
            
            // Normalize slope (0 = flat, 1 = steep)
            return Math.min(1, maxDiff / radius);
        } catch (error) {
            console.warn(`Error calculating slope at (${x}, ${z}): ${error.message}`);
            return 0.5; // Return a moderate default slope
        }
    }
}
