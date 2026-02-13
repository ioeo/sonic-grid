import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export const useHandLandmarker = () => {
    const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initLandmarker = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
                
                const handLandmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 1
                });
                
                setLandmarker(handLandmarker);
                setLoading(false);
            } catch (error) {
                console.error("Error initializing hand landmarker:", error);
                setLoading(false);
            }
        };

        initLandmarker();

        return () => {
            if (landmarker) {
                landmarker.close();
            }
        };
    }, []);

    return { landmarker, loading };
};
