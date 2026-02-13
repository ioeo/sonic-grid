import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Explosion } from '../../types';
import { Firework, Sparkles, Pulse } from './VisualEffects';

interface SceneProps {
    explosions: Explosion[];
    removeExplosion: (id: number) => void;
}

const Scene: React.FC<SceneProps> = ({ explosions, removeExplosion }) => {
    return (
        <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 20 }}
            gl={{ alpha: true, antialias: true }}
        >
            <ambientLight intensity={0.5} />
            {explosions.map((exp) => {
                const onComplete = () => removeExplosion(exp.id);
                
                switch (exp.type) {
                    case 'sparkles':
                        return <Sparkles key={exp.id} position={exp.position} color={exp.color} onComplete={onComplete} />;
                    case 'pulse':
                        return <Pulse key={exp.id} position={exp.position} color={exp.color} onComplete={onComplete} />;
                    case 'firework':
                    default:
                        return <Firework key={exp.id} position={exp.position} color={exp.color} onComplete={onComplete} />;
                }
            })}
        </Canvas>
    );
};

export default Scene;
