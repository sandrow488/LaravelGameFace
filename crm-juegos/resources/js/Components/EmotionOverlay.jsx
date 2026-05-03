
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';                    
import * as faceapi from 'face-api.js';       



export default function EmotionOverlay({ sessionId }) {
    
    const [currentEmotion, setCurrentEmotion] = useState('Analizando...');

    
    const videoRef = useRef(null);

    
    
    useEffect(() => {
        let emotionInterval; 

        
        const startEmotionDetection = async () => {
            if (!sessionId) return; 

            try {
                
                
                
                const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);

                
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream; 
                }

                let lastEmotionReported = null; 

                
                emotionInterval = setInterval(async () => {
                    
                    
                    
                    if (
                        !videoRef.current ||
                        videoRef.current.readyState !== 4 ||
                        document.visibilityState !== 'visible' ||
                        videoRef.current.paused
                    ) {
                        return; 
                    }

                    try {
                        
                        
                        const detections = await faceapi.detectSingleFace(
                            videoRef.current,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
                        ).withFaceExpressions(); 

                        if (detections) {
                            
                            
                            const expressions = detections.expressions;

                            
                            const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
                                expressions[a] > expressions[b] ? a : b
                            );

                            
                            const emotionTranslations = {
                                'happy':     '¡Estás Feliz! 😊',
                                'sad':       'Pareces Triste 😢',
                                'angry':     '¡Estás Enojado! 😠',
                                'surprised': '¡Qué Sorpresa! 😲',
                                'neutral':   'Estado: Neutral 😐',
                                'fearful':   '¡Vaya Susto! 😨',
                                'disgusted': 'Pareces Disgustado 🤢'
                            };

                            const translated = emotionTranslations[dominantEmotion] || 'Estado: Normal';
                            setCurrentEmotion(translated); 

                            
                            
                            if (lastEmotionReported !== dominantEmotion) {
                                axios.post(`/game-sessions/${sessionId}/emotions`, {
                                    emotion:    dominantEmotion,                
                                    confidence: expressions[dominantEmotion]    
                                }).catch(e => console.debug("Error al reportar:", e)); 

                                lastEmotionReported = dominantEmotion; 
                            }
                        }
                    } catch (err) {
                        
                        console.debug("Error en el ciclo de detección:", err);
                    }
                }, 5000); 

            } catch (err) {
                
                console.error("No se pudo iniciar la detección de emociones", err);
                setCurrentEmotion('Cámara no disponible');
            }
        };

        startEmotionDetection(); 

        
        return () => {
            if (emotionInterval) clearInterval(emotionInterval); 
            if (videoRef.current && videoRef.current.srcObject) {
                
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [sessionId]); 

    
    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-none">
            {}
            <div className="bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                {}
                <div className="mb-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full text-center tracking-wider uppercase">
                    {currentEmotion}
                </div>
                {}
                <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-indigo-500/50">
                    <video
                        ref={videoRef}    
                        autoPlay          
                        playsInline       
                        muted             
                        className="w-full h-full object-cover scale-x-[-1]" 
                    />
                </div>
            </div>
        </div>
    );
}