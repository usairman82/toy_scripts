import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class LoadingScreen {
    constructor() {
        // Get or create container for the globe
        this.container = document.querySelector('.globe-container');
        
        // If the container doesn't exist, create it
        if (!this.container) {
            console.log('Creating new globe container');
            this.container = document.createElement('div');
            this.container.className = 'globe-container';
            
            // Get the loading container and insert the globe container before the progress bar
            const loadingContainer = document.querySelector('.loading-container');
            const progressBar = document.querySelector('.progress-bar');
            
            // Make sure we have the loading container and progress bar before inserting
            if (loadingContainer && progressBar) {
                loadingContainer.insertBefore(this.container, progressBar);
            } else {
                console.error('Loading container or progress bar not found');
                // If elements not found, append to body as fallback
                document.body.appendChild(this.container);
            }
        } else {
            console.log('Using existing globe container');
            // Clear any existing content
            while (this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
        }

        // Debug: Log DOM elements to ensure they exist
        console.log('Progress bar element:', document.querySelector('.progress'));
        console.log('Loading text element:', document.querySelector('.loading-text'));
        
        // Set up the scene
        this.scene = new THREE.Scene();
        
        // Set up the camera
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
        this.camera.position.z = 2;
        
        // Set up the renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(150, 150);
        this.renderer.setClearColor(0x000000, 0);
        this.container.appendChild(this.renderer.domElement);
        
        // Create the globe
        this.createGlobe();
        
        // Start animation
        this.animate();
    }
    
    createGlobe() {
        // Create a sphere geometry for the globe
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        
        // Create a texture loader
        const textureLoader = new THREE.TextureLoader();
        
        // Create a basic material with a blue color for the globe
        const material = new THREE.MeshPhongMaterial({
            color: 0x2244ff,
            emissive: 0x112244,
            specular: 0xffffff,
            shininess: 30,
            opacity: 0.9,
            transparent: true
        });
        
        // Create the globe mesh
        this.globe = new THREE.Mesh(geometry, material);
        this.scene.add(this.globe);
        
        // Add color animation properties
        this.colorFadeTime = 0;
        this.fadeDirection = 1; // 1 for blue to black, -1 for black to blue
        
        // Add a wireframe to the globe for a more interesting look
        const wireframe = new THREE.WireframeGeometry(geometry);
        const line = new THREE.LineSegments(wireframe);
        line.material.color.setHex(0x44ff44);
        line.material.opacity = 0.2;
        line.material.transparent = true;
        this.globe.add(line);
        
        // Create a pulsing glow effect around the globe
        // Inner glow layer
        const innerGlowGeometry = new THREE.SphereGeometry(0.55, 32, 32);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00aaff,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        this.innerGlowMesh = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        this.scene.add(this.innerGlowMesh);
        
        // Outer glow layer
        const outerGlowGeometry = new THREE.SphereGeometry(0.65, 32, 32);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        this.outerGlowMesh = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        this.scene.add(this.outerGlowMesh);
        
        // Add glow animation properties
        this.glowPulseTime = 0;
        this.glowPulseSpeed = 0.03;
        
        // Add some particles around the globe for a space effect
        const particlesGeometry = new THREE.BufferGeometry();
        const particleCount = 100;
        const posArray = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i++) {
            // Create a sphere of particles around the globe
            const radius = 1 + Math.random() * 0.5;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            posArray[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            posArray[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            posArray[i * 3 + 2] = radius * Math.cos(phi);
        }
        
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.01,
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles = new THREE.Points(particlesGeometry, particlesMaterial);
        this.scene.add(this.particles);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0x333333);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 3, 5);
        this.scene.add(directionalLight);
        
        // Add a point light inside the globe for extra glow
        const pointLight = new THREE.PointLight(0x00aaff, 1, 2);
        pointLight.position.set(0, 0, 0);
        this.scene.add(pointLight);
        this.pointLight = pointLight;
        
        // Set up post-processing for bloom effect
        this.setupPostProcessing();
    }
    
    setupPostProcessing() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);
        
        // Add render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Add bloom pass for glow effect
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(150, 150), // resolution
            1.5,                         // strength
            0.4,                         // radius
            0.85                         // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;
    }
    
    animate() {
        this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
        
        // Rotate the globe - increased rotation speed for more visible movement
        if (this.globe) {
            this.globe.rotation.y += 0.02;
            this.globe.rotation.x += 0.01;
            
            // Fade between black and blue
            if (this.globe.material) {
                // Update fade time
                this.colorFadeTime += 0.01 * this.fadeDirection;
                
                // Reverse direction when reaching limits
                if (this.colorFadeTime >= 1) {
                    this.fadeDirection = -1;
                    this.colorFadeTime = 1;
                } else if (this.colorFadeTime <= 0) {
                    this.fadeDirection = 1;
                    this.colorFadeTime = 0;
                }
                
                // Calculate color values based on fade time
                const r = Math.floor(0x00 + (0x22 * this.colorFadeTime));
                const g = Math.floor(0x00 + (0x44 * this.colorFadeTime));
                const b = Math.floor(0x00 + (0xff * this.colorFadeTime));
                
                // Set material color and emissive
                this.globe.material.color.setRGB(r/255, g/255, b/255);
                this.globe.material.emissive.setRGB(r/510, g/510, b/510); // Half intensity for emissive
                
                // Update inner glow mesh color to match
                if (this.innerGlowMesh && this.innerGlowMesh.material) {
                    this.innerGlowMesh.material.color.setRGB(r/510, (g*2)/255, (b*2)/255);
                }
                
                // Update outer glow mesh with complementary color
                if (this.outerGlowMesh && this.outerGlowMesh.material) {
                    this.outerGlowMesh.material.color.setRGB(0/255, (g*1.5)/255, (b*2)/255);
                }
                
                // Update point light color
                if (this.pointLight) {
                    this.pointLight.color.setRGB(r/255, g/255, b/255);
                    this.pointLight.intensity = 0.5 + this.colorFadeTime;
                }
                
                // Update bloom effect intensity based on color fade
                if (this.bloomPass) {
                    this.bloomPass.strength = 1 + this.colorFadeTime;
                }
                
                // Animate glow pulse
                this.glowPulseTime += this.glowPulseSpeed;
                
                // Calculate pulse factor (0 to 1 to 0)
                const pulseFactor = Math.sin(this.glowPulseTime) * 0.5 + 0.5;
                
                // Apply pulse to inner glow
                if (this.innerGlowMesh) {
                    // Pulse size
                    const innerScale = 1.1 + (pulseFactor * 0.1);
                    this.innerGlowMesh.scale.set(innerScale, innerScale, innerScale);
                    
                    // Pulse opacity
                    this.innerGlowMesh.material.opacity = 0.1 + (pulseFactor * 0.3);
                }
                
                // Apply pulse to outer glow with slight delay
                if (this.outerGlowMesh) {
                    // Pulse size with offset
                    const outerPulseFactor = Math.sin(this.glowPulseTime - 0.5) * 0.5 + 0.5;
                    const outerScale = 1.0 + (outerPulseFactor * 0.15);
                    this.outerGlowMesh.scale.set(outerScale, outerScale, outerScale);
                    
                    // Pulse opacity
                    this.outerGlowMesh.material.opacity = 0.05 + (outerPulseFactor * 0.15);
                }
                
                // Debug: Log color values occasionally
                if (Math.random() < 0.01) {
                    console.log('Globe color fade:', this.colorFadeTime.toFixed(2), 
                        `RGB: ${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`);
                }
            }
            
            // Debug: Log rotation to ensure it's changing
            if (Math.random() < 0.01) { // Log occasionally to avoid console spam
                console.log('Globe rotation:', 
                    this.globe.rotation.y.toFixed(2), 
                    this.globe.rotation.x.toFixed(2));
            }
        }
        
        // Rotate the particles in the opposite direction
        if (this.particles) {
            this.particles.rotation.y -= 0.005;
        }
        
        // Render the scene with post-processing
        if (this.composer) {
            this.composer.render();
        } else if (this.renderer && this.scene && this.camera) {
            // Fallback to standard rendering if composer not available
            this.renderer.render(this.scene, this.camera);
        }
    }
    
    updateProgress(progress) {
        // Update the progress bar directly
        const progressBar = document.querySelector('.progress');
        const loadingText = document.querySelector('.loading-text');
        
        // Debug: Log progress value
        console.log('Updating progress:', progress, 'Progress bar element:', progressBar);
        
        if (progressBar) {
            const widthPercentage = `${Math.max(1, Math.floor(progress * 100))}%`;
            progressBar.style.width = widthPercentage;
            console.log('Setting progress bar width to:', widthPercentage);
        } else {
            console.error('Progress bar element not found!');
        }
        
        if (loadingText) {
            loadingText.textContent = `Loading world... ${Math.floor(progress * 100)}%`;
        } else {
            console.error('Loading text element not found!');
        }
        
        // Update the globe's appearance based on progress
        if (this.globe && this.globe.material) {
            // Increase rotation speed slightly with progress
            this.globe.rotation.y += 0.005 * progress;
            
            // Make the globe spin faster as loading progresses
            this.globe.rotation.x = 0.005 + (progress * 0.02);
            
            // Increase the globe's opacity as loading progresses
            this.globe.material.opacity = 0.5 + (progress * 0.5);
            
            // Speed up the color fade based on progress
            // Higher progress = faster color transitions
            this.fadeDirection *= (1 + progress * 0.5);
            
            // Increase glow pulse speed with progress
            this.glowPulseSpeed = 0.03 + (progress * 0.05);
            
            // Increase bloom strength with progress
            if (this.bloomPass) {
                this.bloomPass.strength = 1 + (progress * 1.5);
            }
        }
        
        // Update particles based on progress
        if (this.particles) {
            // Make particles more visible as progress increases
            this.particles.material.opacity = 0.3 + (progress * 0.7);
            
            // Increase particle size slightly with progress
            this.particles.material.size = 0.01 + (progress * 0.01);
        }
    }
    
    dispose() {
        // Clean up Three.js resources
        if (this.globe && this.globe.geometry) this.globe.geometry.dispose();
        if (this.globe && this.globe.material) this.globe.material.dispose();
        if (this.innerGlowMesh && this.innerGlowMesh.geometry) this.innerGlowMesh.geometry.dispose();
        if (this.innerGlowMesh && this.innerGlowMesh.material) this.innerGlowMesh.material.dispose();
        if (this.outerGlowMesh && this.outerGlowMesh.geometry) this.outerGlowMesh.geometry.dispose();
        if (this.outerGlowMesh && this.outerGlowMesh.material) this.outerGlowMesh.material.dispose();
        if (this.particles && this.particles.geometry) this.particles.geometry.dispose();
        if (this.particles && this.particles.material) this.particles.material.dispose();
        if (this.composer) this.composer.dispose();
        
        // THREE.Scene doesn't have a dispose method, so we need to remove objects manually
        if (this.scene) {
            // Remove all objects from the scene
            while(this.scene.children.length > 0) { 
                const object = this.scene.children[0];
                this.scene.remove(object);
            }
        }
        
        if (this.renderer) this.renderer.dispose();
        
        // Remove the container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
