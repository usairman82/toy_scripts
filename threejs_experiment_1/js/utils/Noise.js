// Improved Perlin Noise implementation
// Based on the improved noise algorithm by Ken Perlin
// Adapted for JavaScript and optimized for our procedural world generation

export class Noise {
    constructor(seed = Math.random()) {
        this.seed = seed;
        this.initialize();
    }
    
    initialize() {
        // Initialize permutation table
        this.perm = new Uint8Array(512);
        this.gradP = new Array(512);
        
        // Generate random permutation table
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            p[i] = i;
        }
        
        // Shuffle permutation table
        let n = 256;
        let q;
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor((this.random() * (i + 1)));
            q = p[i];
            p[i] = p[j];
            p[j] = q;
        }
        
        // Extend permutation table to 512 elements
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
        }
        
        // Precompute gradients
        for (let i = 0; i < 512; i++) {
            const v = this.perm[i] % 12;
            this.gradP[i] = this.grad3[v];
        }
    }
    
    // Simple seeded random function
    random() {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }
    
    // 3D gradient vectors
    grad3 = [
        [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
        [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
        [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ];
    
    // Fade function for smoother interpolation
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    
    // Linear interpolation
    lerp(a, b, t) {
        return (1 - t) * a + t * b;
    }
    
    // Dot product of vectors
    dot(g, x, y, z) {
        return g[0] * x + g[1] * y + g[2] * z;
    }
    
    // 2D Perlin Noise
    perlin2(x, y) {
        // Find unit grid cell containing point
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        
        // Get relative coordinates of point within cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        
        // Hash coordinates of the 4 square corners
        const A = this.perm[X] + Y;
        const AA = this.perm[A];
        const AB = this.perm[A + 1];
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B];
        const BB = this.perm[B + 1];
        
        // Calculate noise contributions from each corner
        const n00 = this.dot(this.gradP[AA], x, y, 0);
        const n01 = this.dot(this.gradP[BA], x - 1, y, 0);
        const n10 = this.dot(this.gradP[AB], x, y - 1, 0);
        const n11 = this.dot(this.gradP[BB], x - 1, y - 1, 0);
        
        // Interpolate noise contributions
        const x1 = this.lerp(n00, n01, u);
        const x2 = this.lerp(n10, n11, u);
        
        return this.lerp(x1, x2, v);
    }
    
    // 3D Perlin Noise
    perlin3(x, y, z) {
        // Find unit grid cell containing point
        let X = Math.floor(x) & 255;
        let Y = Math.floor(y) & 255;
        let Z = Math.floor(z) & 255;
        
        // Get relative coordinates of point within cell
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        // Hash coordinates of the 8 cube corners
        const A = this.perm[X] + Y;
        const AA = this.perm[A] + Z;
        const AB = this.perm[A + 1] + Z;
        const B = this.perm[X + 1] + Y;
        const BA = this.perm[B] + Z;
        const BB = this.perm[B + 1] + Z;
        
        // Calculate noise contributions from each corner
        const n000 = this.dot(this.gradP[AA], x, y, z);
        const n001 = this.dot(this.gradP[BA], x - 1, y, z);
        const n010 = this.dot(this.gradP[AB], x, y - 1, z);
        const n011 = this.dot(this.gradP[BB], x - 1, y - 1, z);
        const n100 = this.dot(this.gradP[AA + 1], x, y, z - 1);
        const n101 = this.dot(this.gradP[BA + 1], x - 1, y, z - 1);
        const n110 = this.dot(this.gradP[AB + 1], x, y - 1, z - 1);
        const n111 = this.dot(this.gradP[BB + 1], x - 1, y - 1, z - 1);
        
        // Interpolate noise contributions
        const x1 = this.lerp(n000, n001, u);
        const x2 = this.lerp(n010, n011, u);
        const y1 = this.lerp(x1, x2, v);
        
        const x3 = this.lerp(n100, n101, u);
        const x4 = this.lerp(n110, n111, u);
        const y2 = this.lerp(x3, x4, v);
        
        return this.lerp(y1, y2, w);
    }
    
    // Fractal Brownian Motion (fBm) for more natural-looking noise
    fbm(x, y, octaves = 6, lacunarity = 2.0, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.perlin2(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return total / maxValue;
    }
    
    // 3D fBm
    fbm3(x, y, z, octaves = 6, lacunarity = 2.0, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;
        
        for (let i = 0; i < octaves; i++) {
            total += this.perlin3(x * frequency, y * frequency, z * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }
        
        return total / maxValue;
    }
    
    // Ridged multifractal terrain
    ridgedMultifractal(x, y, octaves = 6, lacunarity = 2.0, gain = 0.5, offset = 1.0) {
        let sum = 0;
        let frequency = 1.0;
        let amplitude = 0.5;
        let prev = 1.0;
        
        for (let i = 0; i < octaves; i++) {
        const n = Math.abs(this.perlin2(x * frequency, y * frequency));
        let signal = offset - n;
        signal *= signal;
        signal *= prev;
            prev = signal;
            
            sum += signal * amplitude;
            frequency *= lacunarity;
            amplitude *= gain;
        }
        
        return sum;
    }
    
    // Terrain noise function - combines different noise types for realistic terrain
    terrain(x, y, options = {}) {
        const {
            scale = 0.003,
            elevation = 1.0,
            octaves = 8,
            persistence = 0.5,
            lacunarity = 2.0,
            ridgeWeight = 0.8,
            fbmWeight = 1.0
        } = options;
        
        const nx = x * scale;
        const ny = y * scale;
        
        // Combine ridged multifractal and fBm for varied terrain
        let ridged = this.ridgedMultifractal(nx, ny, octaves, lacunarity, persistence);
        let fbm = this.fbm(nx, ny, octaves, lacunarity, persistence);
        
        // Blend the two noise types
        return (ridged * ridgeWeight + fbm * fbmWeight) * elevation;
    }
}
