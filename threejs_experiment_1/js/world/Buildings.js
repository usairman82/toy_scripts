import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';

export class Buildings {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.terrain = options.terrain;
        this.worldSize = options.worldSize || 2000;
        this.seed = options.seed || Math.random() * 10000;
        
        // Precomputed data from worker (if available)
        this.precomputedData = options.precomputedData || null;
        
        // Building settings
        this.buildingDensity = options.buildingDensity || 0.000005; // Buildings per square unit
        this.maxBuildings = options.maxBuildings || 200;
        
        // Noise for building distribution (only created if needed)
        if (!this.precomputedData) {
            this.buildingNoise = new Noise(this.seed + 4000);
        }
        
        // Building models
        this.buildingModels = [];
        
        // Instanced meshes
        this.buildingInstances = [];
    }
    
    async generate(loadingManager) {
        // Create building models
        this.createBuildingModels();
        
        // Place buildings
        this.placeBuildings();
        
        return true;
    }
    
    // New method to apply precomputed data from worker
    applyData() {
        if (!this.precomputedData) {
            console.warn('No precomputed buildings data to apply');
            return;
        }
        
        console.log('Applying precomputed buildings data');
        
        // Create building models
        this.createBuildingModels();
        
        // Place buildings using precomputed data
        this.placeBuildingsFromPrecomputedData();
        
        return true;
    }
    
    // Place buildings using precomputed data
    placeBuildingsFromPrecomputedData() {
        console.log('Placing buildings from precomputed data');
        
        // Create building models if they don't exist yet
        if (this.buildingModels.length === 0) {
            this.createBuildingModels();
        }
        
        // Place buildings using precomputed positions
        if (this.precomputedData.positions) {
            this.placeBuildings();
        } else {
            console.warn('No precomputed building positions found');
        }
    }
    
    createBuildingModels() {
        // Create different building types
        
        // Small house
        const smallHouse = this.createSmallHouse();
        this.buildingModels.push({
            model: smallHouse,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST
            ],
            minHeight: 0,
            maxHeight: 80,
            maxSlope: 0.2,
            scale: { min: 0.8, max: 1.2 }
        });
        
        // Cabin
        const cabin = this.createCabin();
        this.buildingModels.push({
            model: cabin,
            biomes: [
                this.terrain.biomeTypes.FOREST,
                this.terrain.biomeTypes.MOUNTAIN
            ],
            minHeight: 20,
            maxHeight: 120,
            maxSlope: 0.3,
            scale: { min: 0.7, max: 1.0 }
        });
        
        // Desert hut
        const desertHut = this.createDesertHut();
        this.buildingModels.push({
            model: desertHut,
            biomes: [
                this.terrain.biomeTypes.DESERT
            ],
            minHeight: -10,
            maxHeight: 40,
            maxSlope: 0.15,
            scale: { min: 0.9, max: 1.1 }
        });
        
        // Ruins
        const ruins = this.createRuins();
        this.buildingModels.push({
            model: ruins,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST,
                this.terrain.biomeTypes.MOUNTAIN,
                this.terrain.biomeTypes.DESERT
            ],
            minHeight: -20,
            maxHeight: 150,
            maxSlope: 0.4,
            scale: { min: 0.6, max: 1.4 }
        });
    }
    
    // Create a simple small house
    createSmallHouse() {
        const group = new THREE.Group();
        
        // House base
        const baseGeometry = new THREE.BoxGeometry(8, 4, 6);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xd3b88c, roughness: 0.7 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 2;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Roof
        const roofGeometry = new THREE.ConeGeometry(6, 3, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 5.5;
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        roof.receiveShadow = true;
        group.add(roof);
        
        // Door
        const doorGeometry = new THREE.PlaneGeometry(1.5, 2.5);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1.25, 3.01);
        door.castShadow = true;
        door.receiveShadow = true;
        group.add(door);
        
        // Windows
        const windowGeometry = new THREE.PlaneGeometry(1.2, 1.2);
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xadd8e6, roughness: 0.3, side: THREE.DoubleSide });
        
        // Front windows
        const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow1.position.set(-2, 2, 3.01);
        frontWindow1.castShadow = false;
        frontWindow1.receiveShadow = true;
        group.add(frontWindow1);
        
        const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow2.position.set(2, 2, 3.01);
        frontWindow2.castShadow = false;
        frontWindow2.receiveShadow = true;
        group.add(frontWindow2);
        
        // Side windows
        const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow1.position.set(4.01, 2, 1);
        sideWindow1.rotation.y = Math.PI / 2;
        sideWindow1.castShadow = false;
        sideWindow1.receiveShadow = true;
        group.add(sideWindow1);
        
        const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow2.position.set(4.01, 2, -1);
        sideWindow2.rotation.y = Math.PI / 2;
        sideWindow2.castShadow = false;
        sideWindow2.receiveShadow = true;
        group.add(sideWindow2);
        
        const sideWindow3 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow3.position.set(-4.01, 2, 1);
        sideWindow3.rotation.y = Math.PI / 2;
        sideWindow3.castShadow = false;
        sideWindow3.receiveShadow = true;
        group.add(sideWindow3);
        
        const sideWindow4 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow4.position.set(-4.01, 2, -1);
        sideWindow4.rotation.y = Math.PI / 2;
        sideWindow4.castShadow = false;
        sideWindow4.receiveShadow = true;
        group.add(sideWindow4);
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 2, 1);
        const chimneyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(2, 6, 0);
        chimney.castShadow = true;
        chimney.receiveShadow = true;
        group.add(chimney);
        
        return group;
    }
    
    // Create a simple cabin
    createCabin() {
        const group = new THREE.Group();
        
        // Cabin base
        const baseGeometry = new THREE.BoxGeometry(7, 3, 5);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.5;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Roof
        const roofGeometry = new THREE.BoxGeometry(8, 1, 6);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.8 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 3.5;
        roof.castShadow = true;
        roof.receiveShadow = true;
        group.add(roof);
        
        // Roof top
        const roofTopGeometry = new THREE.BoxGeometry(8, 2, 1);
        const roofTop = new THREE.Mesh(roofTopGeometry, roofMaterial);
        roofTop.position.y = 5;
        roofTop.castShadow = true;
        roofTop.receiveShadow = true;
        group.add(roofTop);
        
        // Door
        const doorGeometry = new THREE.PlaneGeometry(1.2, 2);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1, 2.51);
        door.castShadow = true;
        door.receiveShadow = true;
        group.add(door);
        
        // Windows
        const windowGeometry = new THREE.PlaneGeometry(1, 1);
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xadd8e6, roughness: 0.3, side: THREE.DoubleSide });
        
        // Front windows
        const frontWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow1.position.set(-2, 1.5, 2.51);
        frontWindow1.castShadow = false;
        frontWindow1.receiveShadow = true;
        group.add(frontWindow1);
        
        const frontWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        frontWindow2.position.set(2, 1.5, 2.51);
        frontWindow2.castShadow = false;
        frontWindow2.receiveShadow = true;
        group.add(frontWindow2);
        
        // Side windows
        const sideWindow1 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow1.position.set(3.51, 1.5, 0);
        sideWindow1.rotation.y = Math.PI / 2;
        sideWindow1.castShadow = false;
        sideWindow1.receiveShadow = true;
        group.add(sideWindow1);
        
        const sideWindow2 = new THREE.Mesh(windowGeometry, windowMaterial);
        sideWindow2.position.set(-3.51, 1.5, 0);
        sideWindow2.rotation.y = Math.PI / 2;
        sideWindow2.castShadow = false;
        sideWindow2.receiveShadow = true;
        group.add(sideWindow2);
        
        // Chimney
        const chimneyGeometry = new THREE.BoxGeometry(1, 3, 1);
        const chimneyMaterial = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });
        const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
        chimney.position.set(2, 5.5, 0);
        chimney.castShadow = true;
        chimney.receiveShadow = true;
        group.add(chimney);
        
        return group;
    }
    
    // Create a simple desert hut
    createDesertHut() {
        const group = new THREE.Group();
        
        // Hut base (circular)
        const baseGeometry = new THREE.CylinderGeometry(3, 3, 3, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 1.5;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Roof (cone)
        const roofGeometry = new THREE.ConeGeometry(3.5, 2, 16);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.8 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 4;
        roof.castShadow = true;
        roof.receiveShadow = true;
        group.add(roof);
        
        // Door
        const doorGeometry = new THREE.PlaneGeometry(1.2, 2);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9, side: THREE.DoubleSide });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 1, 3.01);
        door.castShadow = true;
        door.receiveShadow = true;
        group.add(door);
        
        // Windows (small circular)
        const windowGeometry = new THREE.CircleGeometry(0.5, 16);
        const windowMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, side: THREE.DoubleSide });
        
        // Place windows around the hut
        const windowCount = 4;
        for (let i = 0; i < windowCount; i++) {
            const angle = (i / windowCount) * Math.PI * 2;
            const window = new THREE.Mesh(windowGeometry, windowMaterial);
            window.position.set(
                Math.cos(angle) * 3,
                2,
                Math.sin(angle) * 3
            );
            window.rotation.y = angle + Math.PI / 2;
            window.castShadow = false;
            window.receiveShadow = true;
            group.add(window);
        }
        
        return group;
    }
    
    // Create ruins
    createRuins() {
        const group = new THREE.Group();
        
        // Base platform
        const baseGeometry = new THREE.BoxGeometry(10, 1, 10);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.5;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Create broken walls
        const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xa9a9a9, roughness: 0.9 });
        
        // Wall 1 (intact)
        const wall1Geometry = new THREE.BoxGeometry(10, 4, 1);
        const wall1 = new THREE.Mesh(wall1Geometry, wallMaterial);
        wall1.position.set(0, 2.5, -4.5);
        wall1.castShadow = true;
        wall1.receiveShadow = true;
        group.add(wall1);
        
        // Wall 2 (partially broken)
        const wall2Geometry = new THREE.BoxGeometry(1, 4, 8);
        const wall2 = new THREE.Mesh(wall2Geometry, wallMaterial);
        wall2.position.set(-4.5, 2.5, 0);
        wall2.castShadow = true;
        wall2.receiveShadow = true;
        group.add(wall2);
        
        // Wall 3 (very broken - just parts)
        const wall3Part1Geometry = new THREE.BoxGeometry(4, 3, 1);
        const wall3Part1 = new THREE.Mesh(wall3Part1Geometry, wallMaterial);
        wall3Part1.position.set(-2, 2, 4.5);
        wall3Part1.castShadow = true;
        wall3Part1.receiveShadow = true;
        group.add(wall3Part1);
        
        const wall3Part2Geometry = new THREE.BoxGeometry(3, 2, 1);
        const wall3Part2 = new THREE.Mesh(wall3Part2Geometry, wallMaterial);
        wall3Part2.position.set(3, 1.5, 4.5);
        wall3Part2.castShadow = true;
        wall3Part2.receiveShadow = true;
        group.add(wall3Part2);
        
        // Wall 4 (just a corner piece)
        const wall4Geometry = new THREE.BoxGeometry(1, 3, 3);
        const wall4 = new THREE.Mesh(wall4Geometry, wallMaterial);
        wall4.position.set(4.5, 2, -3);
        wall4.castShadow = true;
        wall4.receiveShadow = true;
        group.add(wall4);
        
        // Add some rubble
        const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 });
        
        for (let i = 0; i < 10; i++) {
            const size = 0.5 + Math.random() * 1.5;
            const rubbleGeometry = new THREE.BoxGeometry(size, size * 0.5, size);
            const rubble = new THREE.Mesh(rubbleGeometry, rubbleMaterial);
            
            // Random position within the ruins
            rubble.position.set(
                (Math.random() * 8) - 4,
                size * 0.25,
                (Math.random() * 8) - 4
            );
            
            // Random rotation
            rubble.rotation.y = Math.random() * Math.PI * 2;
            
            rubble.castShadow = true;
            rubble.receiveShadow = true;
            group.add(rubble);
        }
        
        // Add a broken column
        const columnBaseGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
        const columnBase = new THREE.Mesh(columnBaseGeometry, wallMaterial);
        columnBase.position.set(2, 1, -2);
        columnBase.castShadow = true;
        columnBase.receiveShadow = true;
        group.add(columnBase);
        
        const columnShaftGeometry = new THREE.CylinderGeometry(0.7, 0.7, 3, 16);
        const columnShaft = new THREE.Mesh(columnShaftGeometry, wallMaterial);
        columnShaft.position.set(2, 3, -2);
        columnShaft.castShadow = true;
        columnShaft.receiveShadow = true;
        group.add(columnShaft);
        
        return group;
    }
    
    placeBuildings() {
        // If we have precomputed data, use it
        if (this.precomputedData && this.precomputedData.positions) {
            const buildingPositions = this.precomputedData.positions;
            console.log(`Placing ${buildingPositions.length} buildings from precomputed data`);
            
            // Create instanced meshes for each building model
            this.buildingModels.forEach((buildingModel, index) => {
                // Create dummy for instanced mesh
                const dummy = new THREE.Object3D();
                
                // Create instanced mesh for this building type
                const instancedMesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                    new THREE.MeshBasicMaterial({ visible: false }),
                    buildingPositions.length
                );
                
                instancedMesh.count = 0; // Will be incremented as we place buildings
                instancedMesh.name = `building-${index}`;
                this.scene.add(instancedMesh);
                
                this.buildingInstances.push({
                    mesh: instancedMesh,
                    dummy: dummy,
                    model: buildingModel
                });
            });
            
            // Place buildings at precomputed positions
            buildingPositions.forEach((pos, i) => {
                const x = pos.x;
                const z = pos.z;
                const height = this.terrain.getHeightAt(x, z);
                const biome = this.terrain.getBiomeAt(x, z);
                const type = this.precomputedData.types ? this.precomputedData.types[i] : 0;
                
                // Use the building type from precomputed data if available
                const buildingInstance = this.buildingInstances[type % this.buildingInstances.length];
                
                // Random scale within model's range
                const scale = buildingInstance.model.scale.min + Math.random() * (buildingInstance.model.scale.max - buildingInstance.model.scale.min);
                
                // Position and scale the dummy
                buildingInstance.dummy.position.set(x, height, z);
                buildingInstance.dummy.scale.set(scale, scale, scale);
                
                // Random rotation around Y axis
                buildingInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                
                // Update matrix
                buildingInstance.dummy.updateMatrix();
                
                // Add instance
                buildingInstance.mesh.setMatrixAt(buildingInstance.mesh.count, buildingInstance.dummy.matrix);
                buildingInstance.mesh.count++;
                
                // Create actual building model at this position
                const building = buildingInstance.model.model.clone();
                building.position.set(x, height, z);
                building.scale.set(scale, scale, scale);
                building.rotation.y = buildingInstance.dummy.rotation.y;
                this.scene.add(building);
            });
            
            // Update instance matrices
            this.buildingInstances.forEach(instance => {
                instance.mesh.instanceMatrix.needsUpdate = true;
            });
            
            return;
        }
        
        // Otherwise generate from scratch
        // Calculate number of buildings based on world size and density
        const buildingCount = Math.min(this.maxBuildings, Math.floor(this.worldSize * this.worldSize * this.buildingDensity));
        console.log(`Placing ${buildingCount} buildings from scratch`);
        
        // Create instanced meshes for each building model
        this.buildingModels.forEach((buildingModel, index) => {
            // Create dummy for instanced mesh
            const dummy = new THREE.Object3D();
            
            // Create instanced mesh for this building type
            const instancedMesh = new THREE.InstancedMesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                new THREE.MeshBasicMaterial({ visible: false }),
                buildingCount
            );
            
            instancedMesh.count = 0; // Will be incremented as we place buildings
            instancedMesh.name = `building-${index}`;
            this.scene.add(instancedMesh);
            
            this.buildingInstances.push({
                mesh: instancedMesh,
                dummy: dummy,
                model: buildingModel
            });
        });
        
        // Place buildings randomly
        for (let i = 0; i < buildingCount; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 5); // Check slope over a larger area for buildings
            
            // Find suitable building models for this location
            const suitableModels = this.buildingInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this building can be placed in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const buildingInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Building distribution noise for natural clustering
                const noiseValue = this.buildingNoise.perlin2(x * 0.005, z * 0.005);
                
                // Only place building if noise value is above threshold (creates villages/settlements)
                if (noiseValue > 0.3) {
                    // Check for nearby buildings to avoid overlapping
                    let tooClose = false;
                    
                    // Check distance to other buildings
                    for (const instance of this.buildingInstances) {
                        for (let j = 0; j < instance.mesh.count; j++) {
                            const matrix = new THREE.Matrix4();
                            instance.mesh.getMatrixAt(j, matrix);
                            const position = new THREE.Vector3();
                            position.setFromMatrixPosition(matrix);
                            
                            const distance = Math.sqrt(
                                Math.pow(position.x - x, 2) +
                                Math.pow(position.z - z, 2)
                            );
                            
                            if (distance < 20) { // Minimum distance between buildings
                                tooClose = true;
                                break;
                            }
                        }
                        
                        if (tooClose) break;
                    }
                    
                    if (!tooClose) {
                        // Random scale within model's range
                        const scale = buildingInstance.model.scale.min + Math.random() * (buildingInstance.model.scale.max - buildingInstance.model.scale.min);
                        
                        // Position and scale the dummy
                        buildingInstance.dummy.position.set(x, height, z);
                        buildingInstance.dummy.scale.set(scale, scale, scale);
                        
                        // Random rotation around Y axis
                        buildingInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                        
                        // Update matrix
                        buildingInstance.dummy.updateMatrix();
                        
                        // Add instance
                        buildingInstance.mesh.setMatrixAt(buildingInstance.mesh.count, buildingInstance.dummy.matrix);
                        buildingInstance.mesh.count++;
                        
                        // Create actual building model at this position
                        const building = buildingInstance.model.model.clone();
                        building.position.set(x, height, z);
                        building.scale.set(scale, scale, scale);
                        building.rotation.y = buildingInstance.dummy.rotation.y;
                        this.scene.add(building);
                    }
                }
            }
        }
        
        // Update instance matrices
        this.buildingInstances.forEach(instance => {
            instance.mesh.instanceMatrix.needsUpdate = true;
        });
    }
}
