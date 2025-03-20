import * as THREE from 'three';

export class LoadingManager {
    constructor() {
        // Create Three.js loading manager
        this.manager = new THREE.LoadingManager();
        
        // Initialize loaders
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.audioLoader = new THREE.AudioLoader(this.manager);
        
        // Track loading progress
        this.totalItems = 0;
        this.loadedItems = 0;
        this.progress = 0;
        
        // Callbacks
        this.onProgress = null;
        this.onComplete = null;
        
        // Setup manager callbacks
        this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
            // Calculate progress as a value between 0 and 1
            this.progress = Math.min(itemsLoaded / Math.max(itemsTotal, 1), 1);
            
            console.log(`Loading: ${url} (${itemsLoaded}/${itemsTotal}) - ${Math.floor(this.progress * 100)}%`);
            
            // Force a minimum progress of 0.01 to ensure the progress bar is visible
            const reportProgress = Math.max(0.01, this.progress);
            
            if (this.onProgress) {
                // Debug: Log progress callback
                console.log('Calling onProgress with:', reportProgress);
                this.onProgress(reportProgress);
            } else {
                console.warn('onProgress callback is not set');
            }
        };
        
        this.manager.onLoad = () => {
            console.log('All assets loaded through Three.js manager');
            // Ensure we report 100% progress when all assets are loaded
            if (this.onProgress) {
                this.onProgress(1);
            }
        };
        
        this.manager.onError = (url) => {
            console.error('Error loading', url);
        };
    }
    
    loadTexture(url) {
        return new Promise((resolve) => {
            this.textureLoader.load(url, (texture) => {
                resolve(texture);
            });
        });
    }
    
    loadAudio(url) {
        return new Promise((resolve) => {
            this.audioLoader.load(url, (buffer) => {
                resolve(buffer);
            });
        });
    }
    
    addItem() {
        this.totalItems++;
        return this.totalItems;
    }
    
    itemLoaded() {
        this.loadedItems++;
        
        // Calculate progress as a value between 0 and 1
        this.progress = Math.min(this.loadedItems / Math.max(this.totalItems, 1), 1);
        
        console.log(`Manual loading progress: ${Math.floor(this.progress * 100)}%`);
        
        // Force a minimum progress of 0.01 to ensure the progress bar is visible
        const reportProgress = Math.max(0.01, this.progress);
        
        if (this.onProgress) {
            // Debug: Log manual progress callback
            console.log('Calling onProgress (manual) with:', reportProgress);
            this.onProgress(reportProgress);
        } else {
            console.warn('onProgress callback is not set for manual loading');
        }
        
        return this.progress;
    }
    
    complete() {
        console.log('Loading complete');
        
        // Ensure we report 100% progress when complete is called
        this.progress = 1;
        
        if (this.onProgress) {
            console.log('Calling final onProgress with 100%');
            this.onProgress(1);
        } else {
            console.warn('onProgress callback is not set for completion');
        }
        
        // Small delay to ensure progress updates are visible before completion
        setTimeout(() => {
            if (this.onComplete) {
                console.log('Calling onComplete callback');
                this.onComplete();
            } else {
                console.warn('onComplete callback is not set');
            }
        }, 1000); // Increased delay to ensure progress bar is visible
    }
    
    reset() {
        this.totalItems = 0;
        this.loadedItems = 0;
        this.progress = 0;
    }
}
