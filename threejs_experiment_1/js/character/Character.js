import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export class Character {
    constructor(options = {}) {
        this.options = options;
        this.scene = options.scene;
        this.camera = options.camera;
        this.terrain = options.terrain;
        this.orbitControls = options.controls;
        
        // Precomputed data from worker (if available)
        this.precomputedData = options.precomputedData || null;
        
        // Character settings
        this.height = 1.8; // Character height in units
        this.radius = 0.4; // Character radius for collision
        this.speed = 10; // Movement speed
        this.jumpForce = 10; // Jump force
        this.gravity = 20; // Gravity force
        
        // Character state (use precomputed data if available)
        this.position = this.precomputedData?.position ? 
            new THREE.Vector3(
                this.precomputedData.position.x, 
                this.precomputedData.position.y, 
                this.precomputedData.position.z
            ) : 
            new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.direction = new THREE.Vector3(0, 0, 0);
        this.rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.isOnGround = false;
        this.isJumping = false;
        
        // Controls state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.sprint = false;
        this.jump = false;
        
        // Camera settings
        this.cameraMode = 'third-person'; // 'first-person' or 'third-person'
        this.thirdPersonDistance = 5;
        this.thirdPersonHeight = 2;
        
        // Character model
        this.model = null;
        this.mixer = null;
        this.animations = {};
        this.currentAnimation = null;
        
        // Controls
        this.controls = null;
        
        // Raycaster for ground detection
        this.raycaster = new THREE.Raycaster();
        this.raycaster.layers.set(1); // Set to terrain layer
        
        // Collision detection
        this.collisionRays = [];
        this.collisionDistance = this.radius + 0.1;
    }
    
    async initialize(loadingManager) {
        try {
            // Try to load the FBX model first
            console.log('Attempting to load FBX character model...');
            
            // Try both possible FBX files
            const fbxPaths = [
                'assets/images/character.fbx',
                'assets/images/FBX 2013/character.fbx'
            ];
            
            let fbxLoaded = false;
            let fbxErrors = [];
            
            for (const path of fbxPaths) {
                try {
                    console.log(`Trying to load FBX from: ${path}`);
                    await this.loadFBXModel(loadingManager, path);
                    fbxLoaded = true;
                    console.log(`Successfully loaded FBX model from: ${path}`);
                    break;
                } catch (error) {
                    const errorMessage = `Failed to load FBX from ${path}: ${error.message || error}`;
                    console.warn(errorMessage);
                    fbxErrors.push(errorMessage);
                }
            }
            
            // If FBX loading failed, create simple model
            if (!fbxLoaded) {
                console.error('FBX loading failed with errors:', fbxErrors);
                console.log('Using simple character model as fallback');
                this.createCharacterModel();
            }
            
            // Setup controls
            this.setupControls();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Apply precomputed data if available
            if (this.precomputedData) {
                this.applyData();
            }
            
            // Ensure character is visible
            if (this.model) {
                console.log('Character model created successfully');
                // Make sure model is added to scene
                if (!this.model.parent) {
                    this.scene.add(this.model);
                    console.log('Added character model to scene');
                }
            } else {
                console.error('Character model creation failed');
            }
            
            return true;
        } catch (error) {
            console.error('Error initializing character:', error);
            
            // Fallback to simple model
            console.log('Falling back to simple character model');
            this.createCharacterModel();
            this.setupControls();
            this.setupEventListeners();
            
            // Ensure character is visible
            if (this.model && !this.model.parent) {
                this.scene.add(this.model);
            }
            
            return true;
        }
    }
    
    // New method to apply precomputed data from worker
    applyData() {
        if (!this.precomputedData) {
            console.warn('No precomputed character data to apply');
            return;
        }
        
        console.log('Applying precomputed character data');
        
        // Apply position if available
        if (this.precomputedData.position) {
            this.setPosition(
                this.precomputedData.position.x,
                this.precomputedData.position.y,
                this.precomputedData.position.z
            );
        }
        
        return true;
    }
    
    async loadFBXModel(loadingManager, fbxPath = 'assets/images/character.fbx') {
        return new Promise((resolve, reject) => {
            // Create FBX loader
            const fbxLoader = new FBXLoader(loadingManager ? loadingManager.manager : undefined);
            
            // Load the FBX model
            fbxLoader.load(
                fbxPath, // Path to the FBX file
                (fbx) => {
                    console.log('FBX model loaded successfully:', fbx);
                    
                    // Scale the model appropriately
                    fbx.scale.set(0.02, 0.02, 0.02); // Adjust scale as needed
                    
                    // Center the model
                    const box = new THREE.Box3().setFromObject(fbx);
                    const center = box.getCenter(new THREE.Vector3());
                    fbx.position.sub(center); // Center the model at origin
                    
                    // Adjust position to match character height
                    fbx.position.y = -this.height * 0.5;
                    
                    // Setup animations if available
                    if (fbx.animations && fbx.animations.length > 0) {
                        this.mixer = new THREE.AnimationMixer(fbx);
                        
                        // Store animations by name for easy access
                        fbx.animations.forEach((animation) => {
                            this.animations[animation.name] = animation;
                            console.log('Animation found:', animation.name);
                        });
                        
                        // Play idle animation by default if available
                        if (this.animations['idle'] || this.animations['Idle'] || this.animations['IDLE']) {
                            const idleAnim = this.animations['idle'] || this.animations['Idle'] || this.animations['IDLE'];
                            this.currentAnimation = this.mixer.clipAction(idleAnim);
                            this.currentAnimation.play();
                        } else if (fbx.animations.length > 0) {
                            // If no idle animation, play the first available animation
                            this.currentAnimation = this.mixer.clipAction(fbx.animations[0]);
                            this.currentAnimation.play();
                        }
                    }
                    
                    // Set model and add to scene
                    this.model = fbx;
                    this.scene.add(this.model);
                    
                    // Setup collision rays
                    this.setupCollisionRays();
                    
                    resolve(fbx);
                },
                (progress) => {
                    // Loading progress
                    console.log('FBX loading progress:', Math.round(progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    // Error handling
                    console.error('Error loading FBX model:', error);
                    reject(error);
                }
            );
        });
    }
    
    createCharacterModel() {
        // Create a simple character model (capsule)
        const group = new THREE.Group();
        
        // Body (cylinder)
        const bodyGeometry = new THREE.CylinderGeometry(this.radius, this.radius, this.height * 0.6, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = this.height * 0.3;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);
        
        // Head (sphere)
        const headGeometry = new THREE.SphereGeometry(this.radius * 0.8, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = this.height * 0.7;
        head.castShadow = true;
        head.receiveShadow = true;
        group.add(head);
        
        // Face (to indicate front)
        const faceGroup = new THREE.Group();
        faceGroup.position.y = this.height * 0.7;
        faceGroup.position.z = this.radius * 0.6;
        
        // Eyes
        const eyeGeometry = new THREE.SphereGeometry(this.radius * 0.1, 8, 8);
        const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
        
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-this.radius * 0.3, 0, 0);
        faceGroup.add(leftEye);
        
        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(this.radius * 0.3, 0, 0);
        faceGroup.add(rightEye);
        
        // Nose
        const noseGeometry = new THREE.ConeGeometry(this.radius * 0.1, this.radius * 0.2, 8);
        const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xff9999 });
        const nose = new THREE.Mesh(noseGeometry, noseMaterial);
        nose.rotation.x = -Math.PI / 2;
        nose.position.set(0, -this.radius * 0.2, this.radius * 0.1);
        faceGroup.add(nose);
        
        group.add(faceGroup);
        
        // Backpack (to indicate back)
        const backpackGeometry = new THREE.BoxGeometry(this.radius * 1.2, this.height * 0.3, this.radius * 0.4);
        const backpackMaterial = new THREE.MeshStandardMaterial({ color: 0x663300 });
        const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
        backpack.position.set(0, this.height * 0.3, -this.radius * 0.7);
        backpack.castShadow = true;
        backpack.receiveShadow = true;
        group.add(backpack);
        
        // Arms
        const armGeometry = new THREE.CylinderGeometry(this.radius * 0.2, this.radius * 0.2, this.height * 0.4, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x3366cc });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-this.radius * 1.2, this.height * 0.3, 0);
        leftArm.rotation.z = Math.PI / 8;
        leftArm.castShadow = true;
        leftArm.receiveShadow = true;
        group.add(leftArm);
        
        // Right arm
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(this.radius * 1.2, this.height * 0.3, 0);
        rightArm.rotation.z = -Math.PI / 8;
        rightArm.castShadow = true;
        rightArm.receiveShadow = true;
        group.add(rightArm);
        
        // Legs
        const legGeometry = new THREE.CylinderGeometry(this.radius * 0.2, this.radius * 0.2, this.height * 0.5, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        // Left leg
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-this.radius * 0.5, -this.height * 0.25, 0);
        leftLeg.castShadow = true;
        leftLeg.receiveShadow = true;
        group.add(leftLeg);
        
        // Right leg
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(this.radius * 0.5, -this.height * 0.25, 0);
        rightLeg.castShadow = true;
        rightLeg.receiveShadow = true;
        group.add(rightLeg);
        
        // Set model
        this.model = group;
        this.scene.add(this.model);
        
        // Setup collision rays
        this.setupCollisionRays();
    }
    
    setupCollisionRays() {
        // Create rays for collision detection in 8 horizontal directions
        const rayCount = 8;
        for (let i = 0; i < rayCount; i++) {
            const angle = (i / rayCount) * Math.PI * 2;
            const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
            this.collisionRays.push(direction);
        }
    }
    
    setupControls() {
        // Disable orbit controls
        if (this.orbitControls) {
            this.orbitControls.enabled = false;
        }
        
        // Create pointer lock controls for first-person mode
        this.controls = new PointerLockControls(this.camera, document.body);
        
        // Add controls to scene
        this.scene.add(this.controls.getObject());
        
        // Set initial camera position based on mode
        this.updateCameraPosition();
        
        // Add change event listener to update rotation when camera moves
        this.controls.addEventListener('change', () => {
            // Update character rotation based on camera direction
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            this.rotation.y = Math.atan2(cameraDirection.x, cameraDirection.z);
            console.log('Camera direction changed, updating character rotation');
        });
    }
    
    setupEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // Pointer lock events
        document.addEventListener('click', () => {
            this.controls.lock();
        });
        
        // Toggle camera mode
        document.addEventListener('keydown', (event) => {
            if (event.key === 'f' || event.key === 'F') {
                this.toggleCameraMode();
            }
        });
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
            case 'Space':
                this.jump = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.sprint = true;
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
            case 'Space':
                this.jump = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.sprint = false;
                break;
        }
    }
    
    toggleCameraMode() {
        this.cameraMode = this.cameraMode === 'first-person' ? 'third-person' : 'first-person';
        console.log(`Camera mode: ${this.cameraMode}`);
    }
    
    update(delta) {
        // Update character position and movement
        this.updateMovement(delta);
        
        // Update camera position
        this.updateCameraPosition();
        
        // Update model position and rotation
        this.updateModel();
        
        // Update animation mixer if available
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }
    
    updateMovement(delta) {
        // Get camera direction vectors
        const cameraDirection = new THREE.Vector3();
        this.camera.getWorldDirection(cameraDirection);
        
        // Flatten camera direction to horizontal plane and normalize
        cameraDirection.y = 0;
        cameraDirection.normalize();
        
        // Calculate camera's right vector (perpendicular to forward direction)
        const cameraRight = new THREE.Vector3(1, 0, 0)
            .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(cameraDirection.x, cameraDirection.z));
        
        // Calculate movement direction based on camera orientation
        this.direction.set(0, 0, 0);
        
        if (this.moveForward) {
            this.direction.add(cameraDirection);
        }
        if (this.moveBackward) {
            this.direction.sub(cameraDirection);
        }
        
        if (this.moveRight) {
            this.direction.add(cameraRight);
        }
        if (this.moveLeft) {
            this.direction.sub(cameraRight);
        }
        
        // Normalize direction if moving diagonally
        if (this.direction.length() > 0) {
            this.direction.normalize();
        }
        
        // Apply movement speed
        let currentSpeed = this.speed;
        if (this.sprint) {
            currentSpeed *= 1.5;
        }
        
        // Update velocity based on direction
        this.velocity.x = this.direction.x * currentSpeed;
        this.velocity.z = this.direction.z * currentSpeed;
        
        // Apply gravity
        if (!this.isOnGround) {
            this.velocity.y -= this.gravity * delta;
        } else {
            this.velocity.y = 0;
            
            // Handle jumping
            if (this.jump && !this.isJumping) {
                this.velocity.y = this.jumpForce;
                this.isJumping = true;
                this.isOnGround = false;
            }
        }
        
        // Reset jump flag
        if (this.isOnGround) {
            this.isJumping = false;
        }
        
        // Check for collisions
        this.handleCollisions();
        
        // Update position
        this.position.x += this.velocity.x * delta;
        this.position.y += this.velocity.y * delta;
        this.position.z += this.velocity.z * delta;
        
        // Get terrain height at current position
        const terrainHeight = this.terrain ? this.terrain.getHeightAt(this.position.x, this.position.z) : 0;
        
        // Check if character is on ground
        if (this.position.y <= terrainHeight + this.height * 0.5) {
            this.position.y = terrainHeight + this.height * 0.5;
            this.isOnGround = true;
        } else {
            this.isOnGround = false;
        }
        
        // Update controls position
        this.controls.getObject().position.copy(this.position);
    }
    
    handleCollisions() {
        if (!this.terrain) return;
        
        // Check for collisions with terrain in all directions
        for (const rayDirection of this.collisionRays) {
            // Rotate ray direction based on character rotation
            const rotatedRay = rayDirection.clone();
            rotatedRay.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
            
            // Create raycaster
            this.raycaster.set(
                this.position.clone().add(new THREE.Vector3(0, this.height * 0.5, 0)),
                rotatedRay
            );
            
            // Check for intersections with terrain
            const intersects = this.raycaster.intersectObject(this.terrain.mesh);
            
            if (intersects.length > 0 && intersects[0].distance < this.collisionDistance) {
                // Calculate correction vector
                const correction = rotatedRay.clone().multiplyScalar(this.collisionDistance - intersects[0].distance);
                
                // Apply correction to position
                this.position.add(correction);
                
                // Adjust velocity to prevent moving into the collision
                const dot = this.velocity.dot(rotatedRay);
                if (dot < 0) {
                    const velocityAlongRay = rotatedRay.clone().multiplyScalar(dot);
                    this.velocity.sub(velocityAlongRay);
                }
            }
        }
    }
    
    updateCameraPosition() {
        if (this.cameraMode === 'first-person') {
            // First-person: camera at eye level
            this.camera.position.set(
                this.position.x,
                this.position.y + this.height * 0.8,
                this.position.z
            );
        } else {
            // Third-person: camera behind character
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            const cameraPosition = this.position.clone()
                .sub(cameraDirection.multiplyScalar(this.thirdPersonDistance))
                .add(new THREE.Vector3(0, this.thirdPersonHeight, 0));
            
            this.camera.position.copy(cameraPosition);
            this.camera.lookAt(
                this.position.x,
                this.position.y + this.height * 0.5,
                this.position.z
            );
        }
    }
    
    updateModel() {
        if (this.model) {
            // Update model position
            this.model.position.copy(this.position);
            
            // Get camera direction for model rotation
            const cameraDirection = new THREE.Vector3();
            this.camera.getWorldDirection(cameraDirection);
            cameraDirection.y = 0;
            cameraDirection.normalize();
            
            // Update model rotation to face camera direction
            if (this.cameraMode === 'first-person') {
                // In first-person, model should face camera direction
                const targetRotation = Math.atan2(cameraDirection.x, cameraDirection.z);
                this.rotation.y = targetRotation;
            } else {
                // In third-person, model should face movement direction if moving
                if (this.direction.length() > 0) {
                    const targetRotation = Math.atan2(this.direction.x, this.direction.z);
                    // Smoothly interpolate rotation
                    this.rotation.y = THREE.MathUtils.lerp(
                        this.rotation.y,
                        targetRotation,
                        0.1
                    );
                }
            }
            
            this.model.rotation.y = this.rotation.y;
            
            // Update animations based on movement
            this.updateAnimation(this.direction.length() > 0);
        }
    }
    
    updateAnimation(isMoving) {
        // If we have an animation mixer, use FBX animations
        if (this.mixer && Object.keys(this.animations).length > 0) {
            let targetAnimation;
            
            if (isMoving) {
                // Use walk/run animation when moving
                if (this.sprint) {
                    // Running
                    targetAnimation = this.animations['run'] || this.animations['Run'] || this.animations['RUN'];
                } else {
                    // Walking
                    targetAnimation = this.animations['walk'] || this.animations['Walk'] || this.animations['WALK'];
                }
            } else {
                // Use idle animation when standing still
                targetAnimation = this.animations['idle'] || this.animations['Idle'] || this.animations['IDLE'];
            }
            
            // If we found a suitable animation and it's different from current
            if (targetAnimation && this.currentAnimation && this.currentAnimation._clip !== targetAnimation) {
                // Fade out current animation
                this.currentAnimation.fadeOut(0.2);
                
                // Start new animation
                this.currentAnimation = this.mixer.clipAction(targetAnimation);
                this.currentAnimation.reset().fadeIn(0.2).play();
            }
        } else {
            // Fallback to simple animation for basic model
            this.animateModel(isMoving);
        }
    }
    
    animateModel(isMoving) {
        // Simple animation by moving arms and legs
        if (!this.model) return;
        
        // Find arms and legs by position in the children array
        // With our new model structure, the indices have changed
        let leftArm, rightArm, leftLeg, rightLeg;
        
        // Find the arms and legs by iterating through the children
        this.model.children.forEach(child => {
            // Check position to identify the part
            if (child.position.x < -this.radius && Math.abs(child.position.y - this.height * 0.3) < 0.1) {
                leftArm = child; // Left arm is positioned to the left at shoulder height
            } else if (child.position.x > this.radius && Math.abs(child.position.y - this.height * 0.3) < 0.1) {
                rightArm = child; // Right arm is positioned to the right at shoulder height
            } else if (child.position.x < 0 && child.position.y < 0) {
                leftLeg = child; // Left leg is positioned to the left below the body
            } else if (child.position.x > 0 && child.position.y < 0) {
                rightLeg = child; // Right leg is positioned to the right below the body
            }
        });
        
        // If we found all limbs, animate them
        if (leftArm && rightArm && leftLeg && rightLeg) {
            if (isMoving) {
                // Animation time based on movement speed
                const time = performance.now() * 0.001 * this.speed * 0.1;
                
                // Swing arms and legs in opposite directions
                const armSwing = Math.sin(time * 5) * 0.25;
                const legSwing = Math.sin(time * 5) * 0.25;
                
                leftArm.rotation.x = armSwing;
                rightArm.rotation.x = -armSwing;
                leftLeg.rotation.x = -legSwing;
                rightLeg.rotation.x = legSwing;
            } else {
                // Reset to idle pose
                leftArm.rotation.x = 0;
                rightArm.rotation.x = 0;
                leftLeg.rotation.x = 0;
                rightLeg.rotation.x = 0;
            }
        }
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        
        if (this.controls) {
            this.controls.getObject().position.copy(this.position);
        }
        
        if (this.model) {
            this.model.position.copy(this.position);
        }
        
        this.updateCameraPosition();
    }
}
