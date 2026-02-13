class SoundEngine {
    private audioContext: AudioContext | null = null;
    private soundLibrary: Map<string, AudioBuffer> = new Map();
    private masterGain: GainNode | null = null;

    // Pentatonic Scale frequencies for Grid Mode
    private frequencies: number[] = [
        261.63, // C4
        293.66, // D4
        329.63, // E4
        392.00, // G4
        440.00, // A4
        523.25, // C5
        587.33, // D5
        659.25, // E5
        783.99, // G5
        880.00, // A5
        1046.50, // C6
        1174.66, // D6
    ];

    constructor() {
        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.5;
            this.masterGain.connect(this.audioContext.destination);
        } catch (e) {
            console.error("Web Audio API not supported", e);
        }
    }

    public resume() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Grid Mode Tone
    public playTone(index: number) {
        if (!this.audioContext || !this.masterGain) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();

        const freq = this.frequencies[index % this.frequencies.length];
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);

        gain.gain.setValueAtTime(0, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.audioContext.currentTime + 1.5);
    }

    // Register a custom sound buffer with a specific ID
    public async registerCustomSound(id: string, arrayBuffer: ArrayBuffer): Promise<boolean> {
        if (!this.audioContext) return false;
        try {
            const decodedBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.soundLibrary.set(id, decodedBuffer);
            return true;
        } catch (e) {
            console.error("Error decoding audio data", e);
            return false;
        }
    }

    // Play a sound by ID (custom or synth)
    public play(soundId: string) {
        if (!this.audioContext || !this.masterGain) return;

        // 1. Check if it's a loaded custom sound
        if (this.soundLibrary.has(soundId)) {
            const buffer = this.soundLibrary.get(soundId);
            if (buffer) {
                const source = this.audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(this.masterGain);
                source.start();
            }
            return;
        }

        // 2. Synthesize default sounds if not custom
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        const now = this.audioContext.currentTime;

        switch (soundId) {
            case 'synth-zap':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start();
                osc.stop(now + 0.3);
                break;
            case 'synth-ping':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, now);
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.2, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
                osc.start();
                osc.stop(now + 1.0);
                break;
            case 'synth-thud':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);
                gain.gain.setValueAtTime(0.5, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
                osc.start();
                osc.stop(now + 0.4);
                break;
            default:
                // Silent fallback or basic blip if unknown ID
                break;
        }
    }
}

export const soundEngine = new SoundEngine();
