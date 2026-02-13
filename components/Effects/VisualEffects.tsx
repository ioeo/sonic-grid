import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface EffectProps {
    position: [number, number, number];
    color: string;
    onComplete: () => void;
}

// --- FIREWORK EFFECT ---
export const Firework: React.FC<EffectProps> = ({ position, color, onComplete }) => {
    const PARTICLE_COUNT = 80;
    const pointsRef = useRef<THREE.Points>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const timeRef = useRef(0);
    
    const { positions, velocities, colors } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const vel = new Float32Array(PARTICLE_COUNT * 3);
        const col = new Float32Array(PARTICLE_COUNT * 3);
        const baseColor = new THREE.Color(color);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos[i * 3] = position[0];
            pos[i * 3 + 1] = position[1];
            pos[i * 3 + 2] = position[2];

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            const speed = Math.random() * 0.15 + 0.05;

            vel[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
            vel[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
            vel[i * 3 + 2] = speed * Math.cos(phi);

            col[i * 3] = baseColor.r + (Math.random() - 0.5) * 0.2;
            col[i * 3 + 1] = baseColor.g + (Math.random() - 0.5) * 0.2;
            col[i * 3 + 2] = baseColor.b + (Math.random() - 0.5) * 0.2;
        }
        return { positions: pos, velocities: vel, colors: col };
    }, [position, color]);

    useFrame((_, delta) => {
        if (!geometryRef.current) return;
        timeRef.current += delta;
        
        const posAttr = geometryRef.current.attributes.position;
        const currentPos = posAttr.array as Float32Array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            currentPos[i * 3] += velocities[i * 3];
            currentPos[i * 3 + 1] += velocities[i * 3 + 1];
            currentPos[i * 3 + 2] += velocities[i * 3 + 2];
            velocities[i * 3 + 1] -= 0.005; // Gravity
            velocities[i * 3] *= 0.98;
            velocities[i * 3 + 1] *= 0.98;
            velocities[i * 3 + 2] *= 0.98;
        }
        posAttr.needsUpdate = true;
        
        if (timeRef.current > 1.5) onComplete();
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
                <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.15} vertexColors transparent opacity={Math.max(0, 1 - timeRef.current * 0.8)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
};

// --- SPARKLES EFFECT ---
export const Sparkles: React.FC<EffectProps> = ({ position, color, onComplete }) => {
    const PARTICLE_COUNT = 50;
    const pointsRef = useRef<THREE.Points>(null);
    const geometryRef = useRef<THREE.BufferGeometry>(null);
    const timeRef = useRef(0);
    
    const { positions, velocities } = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        const vel = new Float32Array(PARTICLE_COUNT * 3);
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            pos[i * 3] = position[0] + (Math.random() - 0.5);
            pos[i * 3 + 1] = position[1] + (Math.random() - 0.5);
            pos[i * 3 + 2] = position[2];
            
            // Float upwards slowly
            vel[i * 3] = (Math.random() - 0.5) * 0.02;
            vel[i * 3 + 1] = Math.random() * 0.05 + 0.01; 
            vel[i * 3 + 2] = 0;
        }
        return { positions: pos, velocities: vel };
    }, [position]);

    useFrame((_, delta) => {
        if (!geometryRef.current) return;
        timeRef.current += delta;
        const posAttr = geometryRef.current.attributes.position;
        const currentPos = posAttr.array as Float32Array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            currentPos[i * 3] += velocities[i * 3];
            currentPos[i * 3 + 1] += velocities[i * 3 + 1];
            // Wiggle
            currentPos[i * 3] += Math.sin(timeRef.current * 10 + i) * 0.01;
        }
        posAttr.needsUpdate = true;
        if (timeRef.current > 2.0) onComplete();
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial color={color} size={0.1} transparent opacity={Math.max(0, 1 - timeRef.current * 0.5)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </points>
    );
};

// --- PULSE EFFECT ---
export const Pulse: React.FC<EffectProps> = ({ position, color, onComplete }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const timeRef = useRef(0);

    useFrame((_, delta) => {
        if (!meshRef.current) return;
        timeRef.current += delta;
        const scale = 1 + timeRef.current * 6;
        meshRef.current.scale.set(scale, scale, scale);
        
        // Check material array or single material
        if (Array.isArray(meshRef.current.material)) {
             // Handle array if needed, though we use single here
        } else {
            (meshRef.current.material as THREE.Material).opacity = Math.max(0, 1 - timeRef.current * 1.5);
        }

        if (timeRef.current > 0.8) onComplete();
    });

    return (
        <mesh ref={meshRef} position={position}>
            <sphereGeometry args={[0.2, 32, 32]} />
            <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
    );
};
