import { default as ThreeStats } from 'three/addons/libs/stats.module.js';

export class Stats {
    constructor() {
        this.stats = new ThreeStats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.cssText = 'position:relative;top:0;left:0;';
        
        this.dom = this.stats.dom;
    }
    
    begin() {
        this.stats.begin();
    }
    
    end() {
        this.stats.end();
    }
}
