import * as THREE from 'three';
import { Noise } from '../utils/Noise.js';
import { LOD } from 'three';
import { InstancedMesh } from 'three';

// Fallback LOD implementation in case the import fails
let LODClass = LOD;
try {
    // Test if LOD is available
    new LOD();
} catch (error) {
    console.warn("THREE.LOD not available, using fallback implementation");
    // Simple fallback LOD implementation
    LODClass = class FallbackLOD extends THREE.Object3D {
        constructor() {
            super();
            this.levels = [];
            this.autoUpdate = true;
        }
        
        addLevel(object, distance) {
            this.levels.push({ object, distance });
            this.add(object);
            return this;
        }
        
        update(camera) {
            if (this.levels.length > 0) {
                // Always show the first level in fallback mode
                this.levels.forEach((level, index) => {
                    level.object.visible = (index === 0);
                });
            }
        }
    };
}

export class Vegetation {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.terrain = options.terrain;
        this.worldSize = options.worldSize || 2000;
        this.seed = options.seed || Math.random() * 10000;
        
        // Precomputed data from worker (if available)
        this.precomputedData = options.precomputedData || null;
        
        // Vegetation settings
        this.treeDensity = options.treeDensity || 0.00005; // Trees per square unit
        this.bushDensity = options.bushDensity || 0.0001; // Bushes per square unit
        this.grassDensity = options.grassDensity || 0.001; // Grass patches per square unit
        
        // Maximum number of instances
        this.maxTrees = options.maxTrees || 1000;
        this.maxBushes = options.maxBushes || 2000;
        this.maxGrass = options.maxGrass || 5000;
        
        // Noise for vegetation distribution (only created if needed)
        if (!this.precomputedData) {
            this.vegetationNoise = new Noise(this.seed + 3000);
        }
        
        // Vegetation models
        this.treeModels = [];
        this.bushModels = [];
        this.grassModels = [];
        
        // Instanced meshes
        this.treeInstances = [];
        this.bushInstances = [];
        this.grassInstances = [];
        
        // LOD groups
        this.treeLODs = [];
    }
    
    async generate(loadingManager) {
        // Create vegetation models
        this.createVegetationModels();
        
        // Place vegetation
        this.placeVegetation();
        
        return true;
    }
    
    // New method to apply precomputed data from worker
    applyData() {
        if (!this.precomputedData) {
            console.warn('No precomputed vegetation data to apply');
            return;
        }
        
        console.log('Applying precomputed vegetation data');
        
        // Create vegetation models
        this.createVegetationModels();
        
        // Place vegetation using precomputed data
        this.placeVegetationFromPrecomputedData();
        
        return true;
    }
    
    // Place vegetation using precomputed data
    placeVegetationFromPrecomputedData() {
        console.log('Placing vegetation from precomputed data');
        
        // Create vegetation models
        if (this.treeModels.length === 0) {
            this.createVegetationModels();
        }
        
        // Place trees using precomputed positions
        if (this.precomputedData.positions) {
            this.placeTrees();
        } else {
            console.warn('No precomputed vegetation positions found');
        }
    }
    
    createVegetationModels() {
        // Create tree models
        this.createTreeModels();
        
        // Create bush models
        this.createBushModels();
        
        // Create grass models
        this.createGrassModels();
    }
    
    createTreeModels() {
        // Create different tree types
        
        // Pine tree (coniferous)
        const pineTree = this.createPineTree();
        this.treeModels.push({
            model: pineTree,
            biomes: [
                this.terrain.biomeTypes.FOREST,
                this.terrain.biomeTypes.MOUNTAIN,
                this.terrain.biomeTypes.SNOW
            ],
            minHeight: 20,
            maxHeight: 150,
            maxSlope: 0.4,
            scale: { min: 0.8, max: 1.5 }
        });
        
        // Oak tree (deciduous)
        const oakTree = this.createOakTree();
        this.treeModels.push({
            model: oakTree,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST
            ],
            minHeight: 0,
            maxHeight: 100,
            maxSlope: 0.3,
            scale: { min: 0.7, max: 1.3 }
        });
        
        // Palm tree (desert)
        const palmTree = this.createPalmTree();
        this.treeModels.push({
            model: palmTree,
            biomes: [
                this.terrain.biomeTypes.DESERT
            ],
            minHeight: -10,
            maxHeight: 40,
            maxSlope: 0.2,
            scale: { min: 0.9, max: 1.2 }
        });
    }
    
    createBushModels() {
        // Create different bush types
        
        // Generic bush
        const bush = this.createBush();
        this.bushModels.push({
            model: bush,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST,
                this.terrain.biomeTypes.MOUNTAIN
            ],
            minHeight: 0,
            maxHeight: 120,
            maxSlope: 0.6,
            scale: { min: 0.5, max: 1.2 }
        });
        
        // Desert bush
        const desertBush = this.createDesertBush();
        this.bushModels.push({
            model: desertBush,
            biomes: [
                this.terrain.biomeTypes.DESERT
            ],
            minHeight: -10,
            maxHeight: 60,
            maxSlope: 0.5,
            scale: { min: 0.4, max: 1.0 }
        });
    }
    
    createGrassModels() {
        // Create different grass types
        
        // Tall grass
        const tallGrass = this.createGrass();
        this.grassModels.push({
            model: tallGrass,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST
            ],
            minHeight: 0,
            maxHeight: 100,
            maxSlope: 0.7,
            scale: { min: 0.8, max: 1.5 }
        });
        
        // Short grass
        const shortGrass = this.createShortGrass();
        this.grassModels.push({
            model: shortGrass,
            biomes: [
                this.terrain.biomeTypes.GRASSLAND,
                this.terrain.biomeTypes.FOREST,
                this.terrain.biomeTypes.MOUNTAIN
            ],
            minHeight: 0,
            maxHeight: 130,
            maxSlope: 0.8,
            scale: { min: 0.6, max: 1.2 }
        });
    }
    
    // Create a simple pine tree model
    createPineTree() {
        const group = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 8, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 4;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Tree foliage (multiple cones)
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d4c1e, roughness: 0.8 });
        
        // Bottom cone (largest)
        const bottomConeGeometry = new THREE.ConeGeometry(4, 6, 8);
        const bottomCone = new THREE.Mesh(bottomConeGeometry, foliageMaterial);
        bottomCone.position.y = 5;
        bottomCone.castShadow = true;
        bottomCone.receiveShadow = true;
        group.add(bottomCone);
        
        // Middle cone
        const middleConeGeometry = new THREE.ConeGeometry(3, 5, 8);
        const middleCone = new THREE.Mesh(middleConeGeometry, foliageMaterial);
        middleCone.position.y = 9;
        middleCone.castShadow = true;
        middleCone.receiveShadow = true;
        group.add(middleCone);
        
        // Top cone (smallest)
        const topConeGeometry = new THREE.ConeGeometry(2, 4, 8);
        const topCone = new THREE.Mesh(topConeGeometry, foliageMaterial);
        topCone.position.y = 12.5;
        topCone.castShadow = true;
        topCone.receiveShadow = true;
        group.add(topCone);
        
        return group;
    }
    
    // Create a simple oak tree model
    createOakTree() {
        const group = new THREE.Group();
        
        // Tree trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.6, 0.8, 6, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 3;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Tree foliage (sphere)
        const foliageGeometry = new THREE.SphereGeometry(4, 8, 8);
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x3a5f0b, roughness: 0.8 });
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = 8;
        foliage.castShadow = true;
        foliage.receiveShadow = true;
        group.add(foliage);
        
        return group;
    }
    
    // Create a simple palm tree model
    createPalmTree() {
        const group = new THREE.Group();
        
        // Tree trunk (curved)
        const trunkCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.5, 3, 0.5),
            new THREE.Vector3(1, 6, 1),
            new THREE.Vector3(0.5, 9, 0.5)
        ]);
        
        const trunkGeometry = new THREE.TubeGeometry(trunkCurve, 8, 0.5, 8, false);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D, roughness: 0.9 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);
        
        // Palm leaves
        const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.8, side: THREE.DoubleSide });
        
        // Create several leaves around the top
        const leafCount = 7;
        for (let i = 0; i < leafCount; i++) {
            const angle = (i / leafCount) * Math.PI * 2;
            const leafGroup = new THREE.Group();
            
            // Leaf stem
            const stemCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle) * 2, 0.5, Math.sin(angle) * 2),
                new THREE.Vector3(Math.cos(angle) * 4, 0, Math.sin(angle) * 4)
            ]);
            
            const stemGeometry = new THREE.TubeGeometry(stemCurve, 8, 0.2, 8, false);
            const stem = new THREE.Mesh(stemGeometry, leafMaterial);
            leafGroup.add(stem);
            
            // Leaf blade (simple plane with shape)
            const leafShape = new THREE.Shape();
            leafShape.moveTo(0, 0);
            leafShape.lineTo(2, 0.5);
            leafShape.lineTo(4, 0);
            leafShape.lineTo(2, -0.5);
            leafShape.lineTo(0, 0);
            
            const leafGeometry = new THREE.ShapeGeometry(leafShape);
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(0, 0, 0);
            leaf.rotation.y = Math.PI / 2;
            
            leafGroup.add(leaf);
            leafGroup.position.y = 9;
            leafGroup.rotation.y = angle;
            
            group.add(leafGroup);
        }
        
        return group;
    }
    
    // Create a simple bush model
    createBush() {
        const group = new THREE.Group();
        
        // Bush foliage (multiple spheres)
        const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.8 });
        
        // Main sphere
        const mainSphereGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const mainSphere = new THREE.Mesh(mainSphereGeometry, foliageMaterial);
        mainSphere.position.y = 1.5;
        mainSphere.castShadow = true;
        mainSphere.receiveShadow = true;
        group.add(mainSphere);
        
        // Additional spheres for irregular shape
        const spherePositions = [
            { x: 1.0, y: 1.2, z: 0.5, scale: 1.0 },
            { x: -0.8, y: 1.0, z: 0.6, scale: 0.9 },
            { x: 0.5, y: 1.8, z: -0.7, scale: 0.8 },
            { x: -0.5, y: 1.5, z: -0.8, scale: 0.7 }
        ];
        
        spherePositions.forEach(pos => {
            const sphereGeometry = new THREE.SphereGeometry(1 * pos.scale, 8, 8);
            const sphere = new THREE.Mesh(sphereGeometry, foliageMaterial);
            sphere.position.set(pos.x, pos.y, pos.z);
            sphere.castShadow = true;
            sphere.receiveShadow = true;
            group.add(sphere);
        });
        
        return group;
    }
    
    // Create a simple desert bush model
    createDesertBush() {
        const group = new THREE.Group();
        
        // Bush base
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.5, 0.5, 8);
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Bush branches
        const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B7355, roughness: 0.9 });
        
        // Create several branches
        const branchCount = 8;
        for (let i = 0; i < branchCount; i++) {
            const angle = (i / branchCount) * Math.PI * 2;
            const height = 0.8 + Math.random() * 0.6;
            
            const branchCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(Math.cos(angle) * 0.5, height * 0.5, Math.sin(angle) * 0.5),
                new THREE.Vector3(Math.cos(angle) * 1.0, height, Math.sin(angle) * 1.0)
            ]);
            
            const branchGeometry = new THREE.TubeGeometry(branchCurve, 8, 0.1 - (i % 3) * 0.02, 8, false);
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);
            branch.position.y = 0.5;
            branch.castShadow = true;
            branch.receiveShadow = true;
            group.add(branch);
        }
        
        // Add some small leaves
        const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x9c9f84, roughness: 0.8, side: THREE.DoubleSide });
        
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 0.5 + Math.random() * 0.5;
            const height = 0.5 + Math.random() * 1.0;
            
            const leafGeometry = new THREE.PlaneGeometry(0.3, 0.3);
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            leaf.rotation.set(
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2,
                Math.random() * Math.PI * 2
            );
            leaf.castShadow = true;
            leaf.receiveShadow = true;
            group.add(leaf);
        }
        
        return group;
    }
    
    // Create a simple grass model
    createGrass() {
        const group = new THREE.Group();
        
        // Grass material
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7cfc00, 
            roughness: 0.8, 
            side: THREE.DoubleSide 
        });
        
        // Create several grass blades
        const bladeCount = 7;
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const radius = 0.1 + Math.random() * 0.2;
            const height = 0.5 + Math.random() * 0.5;
            
            // Create a simple blade as a plane
            const bladeGeometry = new THREE.PlaneGeometry(0.1, height);
            const blade = new THREE.Mesh(bladeGeometry, grassMaterial);
            
            // Position and rotate the blade
            blade.position.set(
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
            );
            blade.rotation.y = angle;
            
            // Add some random tilt
            blade.rotation.x = Math.random() * 0.2 - 0.1;
            blade.rotation.z = Math.random() * 0.2 - 0.1;
            
            blade.castShadow = true;
            blade.receiveShadow = true;
            group.add(blade);
        }
        
        return group;
    }
    
    // Create a simple short grass model
    createShortGrass() {
        const group = new THREE.Group();
        
        // Grass material
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x7cfc00, 
            roughness: 0.8, 
            side: THREE.DoubleSide 
        });
        
        // Create several grass blades
        const bladeCount = 5;
        for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * Math.PI * 2;
            const radius = 0.1 + Math.random() * 0.1;
            const height = 0.2 + Math.random() * 0.2;
            
            // Create a simple blade as a plane
            const bladeGeometry = new THREE.PlaneGeometry(0.05, height);
            const blade = new THREE.Mesh(bladeGeometry, grassMaterial);
            
            // Position and rotate the blade
            blade.position.set(
                Math.cos(angle) * radius,
                height / 2,
                Math.sin(angle) * radius
            );
            blade.rotation.y = angle;
            
            // Add some random tilt
            blade.rotation.x = Math.random() * 0.2 - 0.1;
            blade.rotation.z = Math.random() * 0.2 - 0.1;
            
            blade.castShadow = true;
            blade.receiveShadow = true;
            group.add(blade);
        }
        
        return group;
    }
    
    placeVegetation(callback) {
        // If a callback is provided, use chunked approach
        if (callback) {
            this.placeVegetationInChunks(callback);
            return;
        }
        
        // Otherwise use the original approach
        this.placeTrees();
        this.placeBushes();
        this.placeGrass();
    }
    
    placeVegetationInChunks(callback, step = 0) {
        requestAnimationFrame(() => {
            try {
                switch(step) {
                    case 0:
                        console.log('Placing trees in chunks...');
                        this.placeTreesInChunks(() => {
                            this.placeVegetationInChunks(callback, 1);
                        });
                        break;
                    case 1:
                        console.log('Placing bushes in chunks...');
                        this.placeBushesInChunks(() => {
                            this.placeVegetationInChunks(callback, 2);
                        });
                        break;
                    case 2:
                        console.log('Placing grass in chunks...');
                        this.placeGrassInChunks(() => {
                            console.log('Vegetation placement complete');
                            if (callback) callback();
                        });
                        break;
                }
            } catch (error) {
                console.error('Error placing vegetation in chunks:', error);
                if (callback) callback(error);
            }
        });
    }
    
    placeTreesInChunks(callback, index = 0, batchSize = 10) {
        // Calculate number of trees based on world size and density
        const treeCount = Math.min(this.maxTrees, Math.floor(this.worldSize * this.worldSize * this.treeDensity));
        
        if (index === 0) {
            console.log(`Placing ${treeCount} trees in batches of ${batchSize} (optimized)`);
            
            // Create instanced meshes for each tree model
            this.treeModels.forEach((treeModel, modelIndex) => {
                // Create LOD for this tree type
                const lod = new LODClass();
                
                // Create high detail model
                const highDetailModel = treeModel.model.clone();
                
                // Create medium detail model (simplified)
                const mediumDetailModel = this.simplifyTreeModel(treeModel.model, 0.7);
                
                // Create low detail model (very simplified)
                const lowDetailModel = this.simplifyTreeModel(treeModel.model, 0.4);
                
                // Add LOD levels
                lod.addLevel(highDetailModel, 0);
                lod.addLevel(mediumDetailModel, 100);
                lod.addLevel(lowDetailModel, 300);
                
                this.treeLODs.push(lod);
                
                // Create dummy for instanced mesh
                const dummy = new THREE.Object3D();
                
                // Create instanced mesh for this tree type
                const instancedMesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                    new THREE.MeshBasicMaterial({ visible: false }),
                    treeCount
                );
                
                instancedMesh.count = 0; // Will be incremented as we place trees
                instancedMesh.name = `tree-${modelIndex}`;
                this.scene.add(instancedMesh);
                
                this.treeInstances.push({
                    mesh: instancedMesh,
                    dummy: dummy,
                    model: treeModel
                });
            });
        }
        
        // If we've processed all trees, update instance matrices and call callback
        if (index >= treeCount) {
            // Update instance matrices
            this.treeInstances.forEach(instance => {
                instance.mesh.instanceMatrix.needsUpdate = true;
            });
            
            if (callback) callback();
            return;
        }
        
        // Process a batch of trees
        const endIndex = Math.min(index + batchSize, treeCount);
        
        for (let i = index; i < endIndex; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 2);
            
            // Find suitable tree models for this location
            const suitableModels = this.treeInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this tree can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const treeInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise ? 
                    this.vegetationNoise.perlin2(x * 0.01, z * 0.01) : 
                    Math.random() * 2 - 1;
                
                // Only place tree if noise value is above threshold (creates natural clearings)
                if (noiseValue > -0.3) {
                    // Random scale within model's range
                    const scale = treeInstance.model.scale.min + Math.random() * (treeInstance.model.scale.max - treeInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    treeInstance.dummy.position.set(x, height, z);
                    treeInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    treeInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    treeInstance.dummy.updateMatrix();
                    
                    // Add instance
                    treeInstance.mesh.setMatrixAt(treeInstance.mesh.count, treeInstance.dummy.matrix);
                    treeInstance.mesh.count++;
                    
                    // Create actual tree model at this position
                    const treeLOD = this.treeLODs[this.treeInstances.indexOf(treeInstance)]?.clone() || treeInstance.model.model.clone();
                    treeLOD.position.set(x, height, z);
                    treeLOD.scale.set(scale, scale, scale);
                    treeLOD.rotation.y = treeInstance.dummy.rotation.y;
                    this.scene.add(treeLOD);
                }
            }
        }
        
        // Process next batch in next frame
        requestAnimationFrame(() => {
            this.placeTreesInChunks(callback, endIndex, batchSize);
        });
    }
    
    placeBushesInChunks(callback, index = 0, batchSize = 10) {
        // Calculate number of bushes based on world size and density
        const bushCount = Math.min(this.maxBushes, Math.floor(this.worldSize * this.worldSize * this.bushDensity));
        
        if (index === 0) {
            console.log(`Placing ${bushCount} bushes in batches of ${batchSize}`);
            
            // Create instanced meshes for each bush model
            this.bushModels.forEach((bushModel, modelIndex) => {
                // Create dummy for instanced mesh
                const dummy = new THREE.Object3D();
                
                // Create instanced mesh for this bush type
                const instancedMesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                    new THREE.MeshBasicMaterial({ visible: false }),
                    bushCount
                );
                
                instancedMesh.count = 0; // Will be incremented as we place bushes
                instancedMesh.name = `bush-${modelIndex}`;
                this.scene.add(instancedMesh);
                
                this.bushInstances.push({
                    mesh: instancedMesh,
                    dummy: dummy,
                    model: bushModel
                });
            });
        }
        
        // If we've processed all bushes, update instance matrices and call callback
        if (index >= bushCount) {
            // Update instance matrices
            this.bushInstances.forEach(instance => {
                instance.mesh.instanceMatrix.needsUpdate = true;
            });
            
            if (callback) callback();
            return;
        }
        
        // Process a batch of bushes
        const endIndex = Math.min(index + batchSize, bushCount);
        
        for (let i = index; i < endIndex; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 1);
            
            // Find suitable bush models for this location
            const suitableModels = this.bushInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this bush can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const bushInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise ? 
                    this.vegetationNoise.perlin2(x * 0.02, z * 0.02) : 
                    Math.random() * 2 - 1;
                
                // Only place bush if noise value is above threshold (creates natural patterns)
                if (noiseValue > -0.2) {
                    // Random scale within model's range
                    const scale = bushInstance.model.scale.min + Math.random() * (bushInstance.model.scale.max - bushInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    bushInstance.dummy.position.set(x, height, z);
                    bushInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    bushInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    bushInstance.dummy.updateMatrix();
                    
                    // Add instance
                    bushInstance.mesh.setMatrixAt(bushInstance.mesh.count, bushInstance.dummy.matrix);
                    bushInstance.mesh.count++;
                    
                    // Create actual bush model at this position
                    const bush = bushInstance.model.model.clone();
                    bush.position.set(x, height, z);
                    bush.scale.set(scale, scale, scale);
                    bush.rotation.y = bushInstance.dummy.rotation.y;
                    this.scene.add(bush);
                }
            }
        }
        
        // Process next batch in next frame
        requestAnimationFrame(() => {
            this.placeBushesInChunks(callback, endIndex, batchSize);
        });
    }
    
    placeGrassInChunks(callback, index = 0, batchSize = 20) {
        // Calculate number of grass patches based on world size and density
        const grassCount = Math.min(this.maxGrass, Math.floor(this.worldSize * this.worldSize * this.grassDensity));
        
        if (index === 0) {
            console.log(`Placing ${grassCount} grass patches in batches of ${batchSize}`);
            
            // Create instanced meshes for each grass model
            this.grassModels.forEach((grassModel, modelIndex) => {
                // Create dummy for instanced mesh
                const dummy = new THREE.Object3D();
                
                // Create instanced mesh for this grass type
                const instancedMesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                    new THREE.MeshBasicMaterial({ visible: false }),
                    grassCount
                );
                
                instancedMesh.count = 0; // Will be incremented as we place grass
                instancedMesh.name = `grass-${modelIndex}`;
                this.scene.add(instancedMesh);
                
                this.grassInstances.push({
                    mesh: instancedMesh,
                    dummy: dummy,
                    model: grassModel
                });
            });
        }
        
        // If we've processed all grass, update instance matrices and call callback
        if (index >= grassCount) {
            // Update instance matrices
            this.grassInstances.forEach(instance => {
                instance.mesh.instanceMatrix.needsUpdate = true;
            });
            
            if (callback) callback();
            return;
        }
        
        // Process a batch of grass
        const endIndex = Math.min(index + batchSize, grassCount);
        
        for (let i = index; i < endIndex; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 0.5);
            
            // Find suitable grass models for this location
            const suitableModels = this.grassInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this grass can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const grassInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise ? 
                    this.vegetationNoise.perlin2(x * 0.05, z * 0.05) : 
                    Math.random() * 2 - 1;
                
                // Only place grass if noise value is above threshold (creates natural patterns)
                if (noiseValue > -0.1) {
                    // Random scale within model's range
                    const scale = grassInstance.model.scale.min + Math.random() * (grassInstance.model.scale.max - grassInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    grassInstance.dummy.position.set(x, height, z);
                    grassInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    grassInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    grassInstance.dummy.updateMatrix();
                    
                    // Add instance
                    grassInstance.mesh.setMatrixAt(grassInstance.mesh.count, grassInstance.dummy.matrix);
                    grassInstance.mesh.count++;
                    
                    // Create actual grass model at this position (only for nearby grass)
                    if (Math.abs(x) < 100 && Math.abs(z) < 100) {
                        const grass = grassInstance.model.model.clone();
                        grass.position.set(x, height, z);
                        grass.scale.set(scale, scale, scale);
                        grass.rotation.y = grassInstance.dummy.rotation.y;
                        this.scene.add(grass);
                    }
                }
            }
        }
        
        // Process next batch in next frame
        requestAnimationFrame(() => {
            this.placeGrassInChunks(callback, endIndex, batchSize);
        });
    }
    
    placeTrees() {
        // If we have precomputed data, use it
        if (this.precomputedData && this.precomputedData.positions) {
            const treePositions = this.precomputedData.positions;
            console.log(`Placing ${treePositions.length} trees from precomputed data`);
            
            // Create instanced meshes for each tree model
            this.treeModels.forEach((treeModel, index) => {
                // Create LOD for this tree type
                const lod = new LODClass();
                
                // Create high detail model
                const highDetailModel = treeModel.model.clone();
                
                // Create medium detail model (simplified)
                const mediumDetailModel = this.simplifyTreeModel(treeModel.model, 0.7);
                
                // Create low detail model (very simplified)
                const lowDetailModel = this.simplifyTreeModel(treeModel.model, 0.4);
                
                // Add LOD levels
                lod.addLevel(highDetailModel, 0);
                lod.addLevel(mediumDetailModel, 100);
                lod.addLevel(lowDetailModel, 300);
                
                this.treeLODs.push(lod);
                
                // Create dummy for instanced mesh
                const dummy = new THREE.Object3D();
                
                // Create instanced mesh for this tree type
                const instancedMesh = new THREE.InstancedMesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                    new THREE.MeshBasicMaterial({ visible: false }),
                    treePositions.length
                );
                
                instancedMesh.count = 0; // Will be incremented as we place trees
                instancedMesh.name = `tree-${index}`;
                this.scene.add(instancedMesh);
                
                this.treeInstances.push({
                    mesh: instancedMesh,
                    dummy: dummy,
                    model: treeModel
                });
            });
            
            // Place trees at precomputed positions
            treePositions.forEach((pos, i) => {
                const x = pos.x;
                const z = pos.z;
                const height = this.terrain.getHeightAt(x, z);
                const biome = this.terrain.getBiomeAt(x, z);
                const type = this.precomputedData.types ? this.precomputedData.types[i] : 0;
                
                // Use the tree type from precomputed data if available
                const treeInstance = this.treeInstances[type % this.treeInstances.length];
                
                // Random scale within model's range
                const scale = treeInstance.model.scale.min + Math.random() * (treeInstance.model.scale.max - treeInstance.model.scale.min);
                
                // Position and scale the dummy
                treeInstance.dummy.position.set(x, height, z);
                treeInstance.dummy.scale.set(scale, scale, scale);
                
                // Random rotation around Y axis
                treeInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                
                // Update matrix
                treeInstance.dummy.updateMatrix();
                
                // Add instance
                treeInstance.mesh.setMatrixAt(treeInstance.mesh.count, treeInstance.dummy.matrix);
                treeInstance.mesh.count++;
                
                // Create actual tree model at this position
                const treeLOD = this.treeLODs[this.treeInstances.indexOf(treeInstance)]?.clone() || treeInstance.model.model.clone();
                treeLOD.position.set(x, height, z);
                treeLOD.scale.set(scale, scale, scale);
                treeLOD.rotation.y = treeInstance.dummy.rotation.y;
                this.scene.add(treeLOD);
            });
            
            // Update instance matrices
            this.treeInstances.forEach(instance => {
                instance.mesh.instanceMatrix.needsUpdate = true;
            });
            
            return;
        }
        
        // Otherwise generate from scratch
        // Calculate number of trees based on world size and density
        const treeCount = Math.min(this.maxTrees, Math.floor(this.worldSize * this.worldSize * this.treeDensity));
        console.log(`Placing ${treeCount} trees from scratch`);
        
        // Create instanced meshes for each tree model
        this.treeModels.forEach((treeModel, index) => {
            // Create LOD for this tree type
            const lod = new LODClass();
            
            // Create high detail model
            const highDetailModel = treeModel.model.clone();
            
            // Create medium detail model (simplified)
            const mediumDetailModel = this.simplifyTreeModel(treeModel.model, 0.7);
            
            // Create low detail model (very simplified)
            const lowDetailModel = this.simplifyTreeModel(treeModel.model, 0.4);
            
            // Add LOD levels
            lod.addLevel(highDetailModel, 0);
            lod.addLevel(mediumDetailModel, 100);
            lod.addLevel(lowDetailModel, 300);
            
            this.treeLODs.push(lod);
            
            // Create dummy for instanced mesh
            const dummy = new THREE.Object3D();
            
            // Create instanced mesh for this tree type
            const instancedMesh = new THREE.InstancedMesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                new THREE.MeshBasicMaterial({ visible: false }),
                treeCount
            );
            
            instancedMesh.count = 0; // Will be incremented as we place trees
            instancedMesh.name = `tree-${index}`;
            this.scene.add(instancedMesh);
            
            this.treeInstances.push({
                mesh: instancedMesh,
                dummy: dummy,
                model: treeModel
            });
        });
        
        // Place trees randomly
        for (let i = 0; i < treeCount; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 2);
            
            // Find suitable tree models for this location
            const suitableModels = this.treeInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this tree can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const treeInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise.perlin2(x * 0.01, z * 0.01);
                
                // Only place tree if noise value is above threshold (creates natural clearings)
                if (noiseValue > -0.3) {
                    // Random scale within model's range
                    const scale = treeInstance.model.scale.min + Math.random() * (treeInstance.model.scale.max - treeInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    treeInstance.dummy.position.set(x, height, z);
                    treeInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    treeInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    treeInstance.dummy.updateMatrix();
                    
                    // Add instance
                    treeInstance.mesh.setMatrixAt(treeInstance.mesh.count, treeInstance.dummy.matrix);
                    treeInstance.mesh.count++;
                    
                    // Create actual tree model at this position
                    const treeLOD = this.treeLODs[this.treeInstances.indexOf(treeInstance)]?.clone() || treeInstance.model.model.clone();
                    treeLOD.position.set(x, height, z);
                    treeLOD.scale.set(scale, scale, scale);
                    treeLOD.rotation.y = treeInstance.dummy.rotation.y;
                    this.scene.add(treeLOD);
                }
            }
        }
        
        // Update instance matrices
        this.treeInstances.forEach(instance => {
            instance.mesh.instanceMatrix.needsUpdate = true;
        });
    }
    
    placeBushes() {
        // Calculate number of bushes based on world size and density
        const bushCount = Math.min(this.maxBushes, Math.floor(this.worldSize * this.worldSize * this.bushDensity));
        console.log(`Placing ${bushCount} bushes`);
        
        // Create instanced meshes for each bush model
        this.bushModels.forEach((bushModel, index) => {
            // Create dummy for instanced mesh
            const dummy = new THREE.Object3D();
            
            // Create instanced mesh for this bush type
            const instancedMesh = new THREE.InstancedMesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                new THREE.MeshBasicMaterial({ visible: false }),
                bushCount
            );
            
            instancedMesh.count = 0; // Will be incremented as we place bushes
            instancedMesh.name = `bush-${index}`;
            this.scene.add(instancedMesh);
            
            this.bushInstances.push({
                mesh: instancedMesh,
                dummy: dummy,
                model: bushModel
            });
        });
        
        // Place bushes randomly
        for (let i = 0; i < bushCount; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 1);
            
            // Find suitable bush models for this location
            const suitableModels = this.bushInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this bush can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const bushInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise.perlin2(x * 0.02, z * 0.02);
                
                // Only place bush if noise value is above threshold (creates natural patterns)
                if (noiseValue > -0.2) {
                    // Random scale within model's range
                    const scale = bushInstance.model.scale.min + Math.random() * (bushInstance.model.scale.max - bushInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    bushInstance.dummy.position.set(x, height, z);
                    bushInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    bushInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    bushInstance.dummy.updateMatrix();
                    
                    // Add instance
                    bushInstance.mesh.setMatrixAt(bushInstance.mesh.count, bushInstance.dummy.matrix);
                    bushInstance.mesh.count++;
                    
                    // Create actual bush model at this position
                    const bush = bushInstance.model.model.clone();
                    bush.position.set(x, height, z);
                    bush.scale.set(scale, scale, scale);
                    bush.rotation.y = bushInstance.dummy.rotation.y;
                    this.scene.add(bush);
                }
            }
        }
        
        // Update instance matrices
        this.bushInstances.forEach(instance => {
            instance.mesh.instanceMatrix.needsUpdate = true;
        });
    }
    
    placeGrass() {
        // Calculate number of grass patches based on world size and density
        const grassCount = Math.min(this.maxGrass, Math.floor(this.worldSize * this.worldSize * this.grassDensity));
        console.log(`Placing ${grassCount} grass patches`);
        
        // Create instanced meshes for each grass model
        this.grassModels.forEach((grassModel, index) => {
            // Create dummy for instanced mesh
            const dummy = new THREE.Object3D();
            
            // Create instanced mesh for this grass type
            const instancedMesh = new THREE.InstancedMesh(
                new THREE.BoxGeometry(0.1, 0.1, 0.1), // Placeholder geometry
                new THREE.MeshBasicMaterial({ visible: false }),
                grassCount
            );
            
            instancedMesh.count = 0; // Will be incremented as we place grass
            instancedMesh.name = `grass-${index}`;
            this.scene.add(instancedMesh);
            
            this.grassInstances.push({
                mesh: instancedMesh,
                dummy: dummy,
                model: grassModel
            });
        });
        
        // Place grass randomly
        for (let i = 0; i < grassCount; i++) {
            // Random position within world bounds
            const x = Math.random() * this.worldSize - this.worldSize / 2;
            const z = Math.random() * this.worldSize - this.worldSize / 2;
            
            // Get terrain height and biome at this position
            const height = this.terrain.getHeightAt(x, z);
            const biome = this.terrain.getBiomeAt(x, z);
            const slope = this.terrain.getSlopeAt(x, z, 0.5);
            
            // Find suitable grass models for this location
            const suitableModels = this.grassInstances.filter(instance => {
                const model = instance.model;
                
                // Check if this grass can grow in this biome
                const biomeMatch = model.biomes.includes(biome);
                
                // Check height constraints
                const heightMatch = height >= model.minHeight && height <= model.maxHeight;
                
                // Check slope constraints
                const slopeMatch = slope <= model.maxSlope;
                
                return biomeMatch && heightMatch && slopeMatch;
            });
            
            if (suitableModels.length > 0) {
                // Choose a random suitable model
                const grassInstance = suitableModels[Math.floor(Math.random() * suitableModels.length)];
                
                // Vegetation distribution noise for natural clustering
                const noiseValue = this.vegetationNoise.perlin2(x * 0.05, z * 0.05);
                
                // Only place grass if noise value is above threshold (creates natural patterns)
                if (noiseValue > -0.1) {
                    // Random scale within model's range
                    const scale = grassInstance.model.scale.min + Math.random() * (grassInstance.model.scale.max - grassInstance.model.scale.min);
                    
                    // Position and scale the dummy
                    grassInstance.dummy.position.set(x, height, z);
                    grassInstance.dummy.scale.set(scale, scale, scale);
                    
                    // Random rotation around Y axis
                    grassInstance.dummy.rotation.y = Math.random() * Math.PI * 2;
                    
                    // Update matrix
                    grassInstance.dummy.updateMatrix();
                    
                    // Add instance
                    grassInstance.mesh.setMatrixAt(grassInstance.mesh.count, grassInstance.dummy.matrix);
                    grassInstance.mesh.count++;
                    
                    // Create actual grass model at this position (only for nearby grass)
                    if (Math.abs(x) < 100 && Math.abs(z) < 100) {
                        const grass = grassInstance.model.model.clone();
                        grass.position.set(x, height, z);
                        grass.scale.set(scale, scale, scale);
                        grass.rotation.y = grassInstance.dummy.rotation.y;
                        this.scene.add(grass);
                    }
                }
            }
        }
        
        // Update instance matrices
        this.grassInstances.forEach(instance => {
            instance.mesh.instanceMatrix.needsUpdate = true;
        });
    }
    
    // Simplify a tree model for LOD
    simplifyTreeModel(model, detailLevel) {
        // Create a simplified version of the tree model for LOD
        const simplifiedModel = model.clone();
        
        // Reduce geometry complexity based on detail level
        simplifiedModel.traverse(child => {
            if (child.isMesh) {
                // Reduce geometry complexity
                if (child.geometry.type === 'CylinderGeometry' || 
                    child.geometry.type === 'ConeGeometry' || 
                    child.geometry.type === 'SphereGeometry') {
                    
                    // Get original parameters
                    const params = child.geometry.parameters;
                    
                    // Create simplified geometry with fewer segments
                    let newGeometry;
                    
                    if (child.geometry.type === 'CylinderGeometry') {
                        const radialSegments = Math.max(3, Math.floor(params.radialSegments * detailLevel));
                        newGeometry = new THREE.CylinderGeometry(
                            params.radiusTop,
                            params.radiusBottom,
                            params.height,
                            radialSegments,
                            1
                        );
                    } else if (child.geometry.type === 'ConeGeometry') {
                        const radialSegments = Math.max(3, Math.floor(params.radialSegments * detailLevel));
                        newGeometry = new THREE.ConeGeometry(
                            params.radius,
                            params.height,
                            radialSegments,
                            1
                        );
                    } else if (child.geometry.type === 'SphereGeometry') {
                        const widthSegments = Math.max(3, Math.floor(params.widthSegments * detailLevel));
                        const heightSegments = Math.max(2, Math.floor(params.heightSegments * detailLevel));
                        newGeometry = new THREE.SphereGeometry(
                            params.radius,
                            widthSegments,
                            heightSegments
                        );
                    }
                    
                    if (newGeometry) {
                        child.geometry.dispose();
                        child.geometry = newGeometry;
                    }
                }
            }
        });
        
        return simplifiedModel;
    }
}
