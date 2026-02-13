import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { useHandLandmarker } from '../hooks/useHandLandmarker';
import Scene from './Effects/Scene';
import { soundEngine } from '../services/SoundEngine';
import { Explosion, EffectType, Preset } from '../types';

// Grid Configuration
const ROWS = 3;
const COLS = 4;
const PINCH_THRESHOLD = 0.08; 

// Colors
const GRID_COLORS = [
    '#FF0055', '#FF7700', '#FFDD00', '#99FF00',
    '#00FF66', '#00FFFF', '#0077FF', '#5500FF',
    '#AA00FF', '#FF00FF', '#FF00AA', '#FFFFFF'
];
const FREEPLAY_COLORS = ['#FF0055', '#00FFFF', '#FFFF00', '#FF00FF', '#00FF00'];

// Default Presets
const DEFAULT_PRESETS: Preset[] = [
    { id: 'default-1', name: 'Neon Burst', effect: 'firework', soundId: 'synth-zap' },
    { id: 'default-2', name: 'Fairy Dust', effect: 'sparkles', soundId: 'synth-ping' },
    { id: 'default-3', name: 'Void Pulse', effect: 'pulse', soundId: 'synth-thud' },
];

type Mode = 'grid' | 'freeplay';

const Experience: React.FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const { landmarker, loading } = useHandLandmarker();
    const requestRef = useRef<number>();
    
    // UI State
    const [mode, setMode] = useState<Mode>('grid');
    const [presets, setPresets] = useState<Preset[]>(DEFAULT_PRESETS);
    const [activePresetId, setActivePresetId] = useState<string>('default-1');
    
    // Current Configuration State (Derived from preset or manual override)
    const [currentEffect, setCurrentEffect] = useState<EffectType>('firework');
    const [currentSoundId, setCurrentSoundId] = useState<string>('synth-zap');
    
    // Interaction State
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [explosions, setExplosions] = useState<Explosion[]>([]);
    const [isPinching, setIsPinching] = useState(false);
    
    // Refs for performance
    const lastPinchState = useRef(false);
    const lastActiveCell = useRef<number | null>(null);

    // Update config when preset changes
    useEffect(() => {
        const preset = presets.find(p => p.id === activePresetId);
        if (preset) {
            setCurrentEffect(preset.effect);
            setCurrentSoundId(preset.soundId);
        }
    }, [activePresetId, presets]);

    const removeExplosion = useCallback((id: number) => {
        setExplosions(prev => prev.filter(e => e.id !== id));
    }, []);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const arrayBuffer = await file.arrayBuffer();
            const newSoundId = `custom-${Date.now()}`;
            const success = await soundEngine.registerCustomSound(newSoundId, arrayBuffer);
            if (success) {
                setCurrentSoundId(newSoundId);
                setActivePresetId(''); // Deselect preset as we have a custom config
            }
        }
    };

    const handleEffectChange = (effect: EffectType) => {
        setCurrentEffect(effect);
        setActivePresetId(''); // Deselect preset on manual change
    };

    const saveCurrentAsPreset = () => {
        const name = prompt("Enter a name for your preset:");
        if (name) {
            const newPreset: Preset = {
                id: `preset-${Date.now()}`,
                name,
                effect: currentEffect,
                soundId: currentSoundId
            };
            setPresets(prev => [...prev, newPreset]);
            setActivePresetId(newPreset.id);
        }
    };

    const triggerInteraction = useCallback((x: number, y: number, cellIndex: number = -1) => {
        // Convert normalized coords to Three.js world coords
        const threeX = (x - 0.5) * 14; 
        const threeY = -(y - 0.5) * 10; 

        // Sound Logic
        if (mode === 'grid') {
            soundEngine.playTone(cellIndex);
        } else {
            soundEngine.play(currentSoundId);
        }

        // Visual Logic
        const color = mode === 'grid' 
            ? GRID_COLORS[cellIndex % GRID_COLORS.length] 
            : FREEPLAY_COLORS[Math.floor(Math.random() * FREEPLAY_COLORS.length)];

        const newExplosion: Explosion = {
            id: Date.now() + Math.random(),
            type: mode === 'grid' ? 'firework' : currentEffect,
            position: [threeX, threeY, 0],
            color: color,
            timestamp: Date.now()
        };
        setExplosions(prev => [...prev, newExplosion]);
    }, [mode, currentEffect, currentSoundId]);

    const detectHands = useCallback(() => {
        if (!webcamRef.current?.video || !landmarker) {
            requestRef.current = requestAnimationFrame(detectHands);
            return;
        }

        const video = webcamRef.current.video;
        if (video.readyState !== 4) {
             requestRef.current = requestAnimationFrame(detectHands);
             return;
        }

        const startTimeMs = performance.now();
        const results = landmarker.detectForVideo(video, startTimeMs);

        if (results.landmarks && results.landmarks.length > 0) {
            const landmarks = results.landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];

            const distance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2)
            );

            const currentlyPinching = distance < PINCH_THRESHOLD;

            const rawX = (thumbTip.x + indexTip.x) / 2;
            const rawY = (thumbTip.y + indexTip.y) / 2;
            const visualX = 1 - rawX; // Flip due to mirror
            const visualY = rawY;

            let cellIndex = -1;
            if (mode === 'grid') {
                const col = Math.floor(visualX * COLS);
                const row = Math.floor(visualY * ROWS);
                const safeCol = Math.max(0, Math.min(COLS - 1, col));
                const safeRow = Math.max(0, Math.min(ROWS - 1, row));
                cellIndex = safeRow * COLS + safeCol;
            }

            if (currentlyPinching) {
                setIsPinching(true);
                if (mode === 'grid') {
                    setActiveCell(cellIndex);
                }

                if (!lastPinchState.current) {
                    triggerInteraction(visualX, visualY, cellIndex);
                } 
                else if (mode === 'grid' && lastActiveCell.current !== cellIndex) {
                    triggerInteraction(visualX, visualY, cellIndex);
                }
            } else {
                setIsPinching(false);
                setActiveCell(null);
            }

            lastPinchState.current = currentlyPinching;
            lastActiveCell.current = mode === 'grid' ? cellIndex : null;
        } else {
            setIsPinching(false);
            setActiveCell(null);
            lastPinchState.current = false;
        }
        
        requestRef.current = requestAnimationFrame(detectHands);
    }, [landmarker, mode, triggerInteraction]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(detectHands);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [detectHands]);

    useEffect(() => {
        const handleInteraction = () => {
            soundEngine.resume();
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
        window.addEventListener('click', handleInteraction);
        window.addEventListener('touchstart', handleInteraction);
        return () => {
            window.removeEventListener('click', handleInteraction);
            window.removeEventListener('touchstart', handleInteraction);
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-black text-white font-mono">
                <div className="animate-pulse">Loading Vision Models...</div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full overflow-hidden bg-black select-none font-sans">
            {/* Webcam */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
                 <Webcam
                    ref={webcamRef}
                    audio={false}
                    className="absolute min-w-full min-h-full object-cover mirror-x"
                    videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
                />
            </div>

            {/* Grid Overlay */}
            {mode === 'grid' && (
                <div className="absolute inset-0 z-10 grid" style={{ 
                    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                    gridTemplateRows: `repeat(${ROWS}, 1fr)`
                }}>
                    {Array.from({ length: ROWS * COLS }).map((_, i) => {
                        const isActive = activeCell === i;
                        const borderColor = GRID_COLORS[i % GRID_COLORS.length];
                        return (
                            <div key={i} className="border border-white/10 flex items-center justify-center transition-all duration-150 ease-out"
                                style={{
                                    backgroundColor: isActive ? `${borderColor}44` : 'transparent',
                                    boxShadow: isActive ? `inset 0 0 20px ${borderColor}` : 'none',
                                    borderColor: isActive ? borderColor : 'rgba(255,255,255,0.1)'
                                }}
                            >
                                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'scale-150 opacity-100' : 'scale-0 opacity-0'}`}
                                     style={{ backgroundColor: borderColor }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Visuals */}
            <Scene explosions={explosions} removeExplosion={removeExplosion} />

            {/* Status */}
            <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isPinching ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500'}`}></div>
                <span className="text-xs text-white font-bold bg-black/50 px-2 py-1 rounded backdrop-blur">
                    {isPinching ? 'ACTIVE' : 'READY'}
                </span>
            </div>

            {/* Control Panel */}
            <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 
                            bg-neutral-900/90 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white shadow-2xl max-h-[80vh] overflow-y-auto">
                
                <div className="flex gap-2 mb-4 p-1 bg-black/40 rounded-lg">
                    <button 
                        onClick={() => setMode('grid')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Grid
                    </button>
                    <button 
                        onClick={() => setMode('freeplay')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'freeplay' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        Freeplay
                    </button>
                </div>

                {mode === 'freeplay' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* Preset Selection */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">Presets</label>
                            <div className="grid grid-cols-1 gap-2">
                                {presets.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => setActivePresetId(preset.id)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm border transition-colors flex justify-between items-center
                                            ${activePresetId === preset.id 
                                                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100' 
                                                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'}`}
                                    >
                                        <span>{preset.name}</span>
                                        {activePresetId === preset.id && <span className="w-2 h-2 rounded-full bg-indigo-400"></span>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px bg-white/10 my-2"></div>

                        {/* Visual Effect Selector */}
                        <div>
                            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-2 block">
                                Custom Adjustment
                            </label>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                                {(['firework', 'sparkles', 'pulse'] as EffectType[]).map(effect => (
                                    <button
                                        key={effect}
                                        onClick={() => handleEffectChange(effect)}
                                        className={`py-2 px-1 text-xs rounded border transition-all ${currentEffect === effect ? 'border-white/50 bg-white/10 text-white' : 'border-white/10 text-gray-500 hover:bg-white/5'}`}
                                    >
                                        {effect.charAt(0).toUpperCase() + effect.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {/* Audio Upload */}
                            <div className="mb-2">
                                <label className="block w-full cursor-pointer bg-white/5 hover:bg-white/10 border border-dashed border-white/20 rounded-lg p-3 text-center transition-colors">
                                    <span className="text-xs text-gray-400">
                                        Upload Custom Sound
                                        <br/>
                                        <span className="text-[10px] text-gray-600">(Overrides current sound)</span>
                                    </span>
                                    <input 
                                        type="file" 
                                        accept="audio/*" 
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>

                        {/* Save Preset */}
                        <button
                            onClick={saveCurrentAsPreset}
                            className="w-full py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-lg transition-colors"
                        >
                            Save as New Preset
                        </button>

                        {/* Current Settings Info */}
                        <div className="text-[10px] text-gray-500 text-center font-mono mt-2">
                            Effect: {currentEffect} | Sound: {currentSoundId.startsWith('custom') ? 'Custom File' : currentSoundId}
                        </div>
                    </div>
                )}
                
                {mode === 'grid' && (
                    <div className="text-xs text-gray-400 text-center py-2">
                        Pincez dans les cases de la grille pour jouer la gamme pentatonique.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Experience;
