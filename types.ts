export interface Point {
    x: number;
    y: number;
    z: number;
}

export interface GridCell {
    id: number;
    row: number;
    col: number;
    x: number; // Normalized center x
    y: number; // Normalized center y
    active: boolean;
}

export type EffectType = 'firework' | 'sparkles' | 'pulse';

export interface Explosion {
    id: number;
    type: EffectType;
    position: [number, number, number]; // Three.js coordinates
    color: string;
    timestamp: number;
}

// MediaPipe Landmark types simplified
export interface Landmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
}

export interface Preset {
    id: string;
    name: string;
    effect: EffectType;
    soundId: string;
}
