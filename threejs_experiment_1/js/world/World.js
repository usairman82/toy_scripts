import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { Water } from 'three/addons/objects/Water.js';

import { Terrain } from './Terrain.js';
import { Character } from '../character/Character.js';
import { DayNightCycle } from './DayNightCycle.js';
import { Vegetation } from './Vegetation.js';
import { Buildings } from './Buildings.js';
import { WeatherSystem } from './WeatherSystem.js';

export class World {
    constructor(options = {}) {
        this.options = options;
        this.audioManager = options.audioManager;
        this.onProgress = options.onProgress || (() => {});
        
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.FogExp2(0xaaaaaa, 0.001);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
        this.camera.position.set(0, 100, 200);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        // Initialize world components
        this.initializeSky();
        this.initializeWater();
        
        // Create orbit controls for camera
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1000;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.enabled = true; // Ensure controls are enabled
        
        // Debug: Log controls initialization
        console.log('OrbitControls initialized:', this.controls);
        
        // World components
        this.terrain = null;
        this.vegetation = null;
        this.buildings = null;
        this.weatherSystem = null;
        this.character = null;
        this.dayNightCycle = null;
        
        // World settings
        this.worldSize = 2000; // Size of the world in units
        this.worldSeed = Math.random() * 10000; // Random seed for procedural generation
        
        // Clock for animations
        this.clock = new THREE.Clock();
        
        // Raycaster for terrain height sampling
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(1); // Set to terrain layer
    }
    
    async preload(loadingManager) {
        // Initialize day/night cycle early since it doesn't require generated data
        this.dayNightCycle = new DayNightCycle({
            scene: this.scene,
            sky: this.sky,
            water: this.water,
            renderer: this.renderer,
            audioManager: this.audioManager
        });
        this.dayNightCycle.initialize();
        
        // Add audio listener to camera
        this.audioManager.setCamera(this.camera);
        
        // Generate world using worker thread
        await this.generateWorldWithWorker(loadingManager);
    }
    
    async generateWorldWithWorker(loadingManager) {
        return new Promise((resolve, reject) => {
            try {
                console.log('Starting world generation with worker thread');
                
                // Create worker
                const worker = new Worker('js/core/WorldGenerationWorker.js');
                
                // Handle messages from worker
                worker.onmessage = (e) => {
                    const { type, data } = e.data;
                    
                    switch(type) {
                        case 'progress':
                            console.log(`Worker progress: ${data.stage} - ${Math.floor(data.progress * 100)}%`);
                            this.onProgress(data.progress);
                            break;
                            
                        case 'complete':
                            console.log('Worker completed world generation');
                            this.applyWorldData(data);
                            worker.terminate();
                            resolve();
                            break;
                            
                        case 'error':
                            console.error('Worker error:', data);
                            worker.terminate();
                            reject(new Error(data));
                            break;
                    }
                };
                
                // Handle worker errors
                worker.onerror = (error) => {
                    console.error('Worker error:', error);
                    worker.terminate();
                    reject(error);
                };
                
                // Start the worker
                worker.postMessage({
                    type: 'generate',
                    data: {
                        worldSize: this.worldSize,
                        worldSeed: this.worldSeed
                    }
                });
                
            } catch (error) {
                console.error('Error creating worker:', error);
                reject(error);
            }
        });
    }
    
    applyWorldData(worldData) {
        // Initialize world components with the data from the worker
        console.log('Applying world data from worker');
        
        // Store the world data for later use
        this.worldData = worldData;
        
        // Apply data in optimized chunks
        this.applyDataInOptimizedChunks();
    }
    
    applyDataInOptimizedChunks() {
        // Use requestAnimationFrame to allow UI updates between operations
        requestAnimationFrame(() => {
            try {
                // Step 1: Initialize terrain
                if (!this.terrain) {
                    console.log('Creating terrain...');
                    this.onProgress(0.91);
                    
                    this.terrain = new Terrain({
                        worldSize: this.worldSize,
                        seed: this.worldSeed,
                        scene: this.scene,
                        precomputedData: this.worldData.terrain
                    });
                    
                    // Load textures and continue in next frame
                    this.terrain.loadTextures(null).then(() => {
                        this.terrain.generateTerrainData();
                        this.terrain.createTerrainMesh();
                        this.scene.add(this.terrain.mesh);
                        this.terrain.mesh.layers.enable(1);
                        
                        // Continue in next frame
                        requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    });
                    return;
                }
                
                // Step 2: Initialize vegetation with reduced density
                if (!this.vegetation && this.terrain) {
                    console.log('Creating vegetation (optimized)...');
                    this.onProgress(0.93);
                    
                    this.vegetation = new Vegetation({
                        worldSize: this.worldSize,
                        seed: this.worldSeed,
                        scene: this.scene,
                        terrain: this.terrain,
                        precomputedData: this.worldData.vegetation,
                        // Reduce density for better performance
                        treeDensity: 0.00002,  // Reduced from 0.00005
                        bushDensity: 0.00005,  // Reduced from 0.0001
                        grassDensity: 0.0005,  // Reduced from 0.001
                        maxTrees: 300,         // Reduced from 1000
                        maxBushes: 500,        // Reduced from 2000
                        maxGrass: 1000         // Reduced from 5000
                    });
                    
                    // Create vegetation models
                    this.vegetation.createVegetationModels();
                    
                    // Continue in next frame
                    requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    return;
                }
                
                // Step 3: Place vegetation with optimized batch size
                if (this.vegetation && !this.vegetationPlaced) {
                    console.log('Placing vegetation in optimized batches...');
                    this.onProgress(0.94);
                    
                    // Use the chunked approach with a callback and larger batch size
                    this.vegetation.placeVegetation(() => {
                        console.log('Vegetation placement complete');
                        this.vegetationPlaced = true;
                        
                        // Continue in next frame
                        requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    });
                    return;
                }
                
                // Step 4: Initialize buildings with reduced count
                if (!this.buildings && this.vegetationPlaced) {
                    console.log('Creating buildings (optimized)...');
                    this.onProgress(0.95);
                    
                    this.buildings = new Buildings({
                        worldSize: this.worldSize,
                        seed: this.worldSeed,
                        scene: this.scene,
                        terrain: this.terrain,
                        precomputedData: this.worldData.buildings,
                        // Reduce building count for better performance
                        maxBuildings: 25 // Reduced from default
                    });
                    
                    // Create building models
                    this.buildings.createBuildingModels();
                    
                    // Continue in next frame
                    requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    return;
                }
                
                // Step 5: Place buildings
                if (this.buildings && !this.buildingsPlaced) {
                    console.log('Placing buildings...');
                    this.onProgress(0.96);
                    
                    this.buildings.placeBuildings();
                    this.buildingsPlaced = true;
                    
                    // Continue in next frame
                    requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    return;
                }
                
                // Step 6: Initialize weather system (simplified)
                if (!this.weatherSystem && this.buildingsPlaced) {
                    console.log('Creating weather system (simplified)...');
                    this.onProgress(0.97);
                    
                    this.weatherSystem = new WeatherSystem({
                        scene: this.scene,
                        audioManager: this.audioManager,
                        precomputedData: this.worldData.weather,
                        // Reduce particle count for better performance
                        particleCount: 1000 // Reduced from default
                    });
                    
                    // Set weather but don't create particles yet
                    this.weatherSystem.setWeather('clear');
                    
                    // Continue in next frame
                    requestAnimationFrame(() => this.applyDataInOptimizedChunks());
                    return;
                }
                
                // Step 7: Initialize character
                if (!this.character && this.weatherSystem) {
                    console.log('Creating character...');
                    this.onProgress(0.98);
                    
                    this.character = new Character({
                        scene: this.scene,
                        camera: this.camera,
                        terrain: this.terrain,
                        controls: this.controls,
                        precomputedData: this.worldData.character
                    });
                    
                    // Initialize character
                    this.character.initialize(null).then(() => {
                        console.log('Character initialized successfully');
                        
                        // Position character on terrain
                        this.positionCharacterOnTerrain();
                        
                        // Final progress update
                        this.onProgress(1.0);
                        
                        console.log('World data applied successfully');
                        
                        // Clean up
                        this.worldData = null;
                    }).catch(error => {
                        console.error('Error initializing character:', error);
                    });
                    
                    return;
                }
                
            } catch (error) {
                console.error('Error applying world data:', error);
            }
        });
    }
    
    positionCharacterOnTerrain() {
        // Position character at a suitable starting location
        const startX = 0;
        const startZ = 0;
        const height = this.terrain.getHeightAt(startX, startZ);
        
        if (this.character) {
            // Position character higher above terrain to ensure visibility
            this.character.setPosition(startX, height + 10, startZ);
            console.log(`Positioned character at (${startX}, ${height + 10}, ${startZ})`);
            
            // Ensure character is visible by setting camera to third-person mode
            this.character.cameraMode = 'third-person';
            this.character.updateCameraPosition();
            
            // Make sure orbit controls are disabled when character controls are active
            if (this.controls) {
                this.controls.enabled = false;
            }
        }
    }
    
    initializeSky() {
        // Create sky
        this.sky = new Sky();
        this.sky.scale.setScalar(10000);
        this.scene.add(this.sky);
        
        // Sun position parameters
        this.skyUniforms = this.sky.material.uniforms;
        this.skyUniforms['turbidity'].value = 10;
        this.skyUniforms['rayleigh'].value = 2;
        this.skyUniforms['mieCoefficient'].value = 0.005;
        this.skyUniforms['mieDirectionalG'].value = 0.8;
        
        // Initial sun position
        this.sunPosition = new THREE.Vector3();
        this.phi = THREE.MathUtils.degToRad(90 - 45); // Sun elevation
        this.theta = THREE.MathUtils.degToRad(180); // Sun azimuth
        
        this.sunPosition.setFromSphericalCoords(1, this.phi, this.theta);
        this.skyUniforms['sunPosition'].value.copy(this.sunPosition);
    }
    
    initializeWater() {
        // Create water
        const waterGeometry = new THREE.PlaneGeometry(10000, 10000);
        this.water = new Water(waterGeometry, {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function(texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }),
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: this.scene.fog !== undefined
        });
        
        this.water.rotation.x = -Math.PI / 2;
        this.water.position.y = -20; // Lowered water level to show more land
        this.scene.add(this.water);
    }
    
    onWindowResize() {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    update() {
        const delta = this.clock.getDelta();
        
        // Only update orbit controls if character controls are not active
        if (this.controls && (!this.character || !this.character.controls || !this.character.controls.isLocked)) {
            // Make sure controls are enabled
            this.controls.enabled = true;
            
            // Update the controls
            this.controls.update();
        } else if (this.controls && this.character && this.character.controls && this.character.controls.isLocked) {
            // If character controls are active, disable orbit controls
            this.controls.enabled = false;
        }
        
        // Update character
        if (this.character) {
            this.character.update(delta);
        }
        
        // Update day/night cycle
        if (this.dayNightCycle) {
            this.dayNightCycle.update(delta);
        }
        
        // Update weather system
        if (this.weatherSystem) {
            this.weatherSystem.update(delta);
        }
        
        // Update water
        if (this.water) {
            this.water.material.uniforms['time'].value += delta;
        }
        
        // Render scene
        this.renderer.render(this.scene, this.camera);
    }
}
