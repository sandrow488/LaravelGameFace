import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';                    
import * as faceapi from 'face-api.js';       // Librería de IA para detección facial en el navegador

// Componente EmotionOverlay: Superposición invisible que lee las emociones en tiempo real
export default function EmotionOverlay({ sessionId }) {
    // Estado para mostrar visualmente (esquina de la pantalla) qué emoción cree la IA que tienes
    const [currentEmotion, setCurrentEmotion] = useState('Analizando...');

    // Referencia al elemento <video> oculto que captura la cámara
    const videoRef = useRef(null);

    useEffect(() => {
        let emotionInterval; // Guardará el ID del intervalo para poder limpiarlo al desmontar

        // Función asíncrona principal que arranca la detección
        const startEmotionDetection = async () => {
            if (!sessionId) return; // Si no hay sesión de juego válida, se cancela todo

            try {
                // 1. CARGA DE MODELOS DE INTELIGENCIA ARTIFICIAL
                // Descarga desde Github los pesos neuronales ligeros (TinyFace y Expressions)
                const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);

                // 2. ACTIVAR WEBCAM
                // Solicita permiso al navegador para encender la cámara frontal
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream; // Conecta el flujo de la cámara a la etiqueta <video>
                }

                let lastEmotionReported = null; 

                // 3. BUCLE DE DETECCIÓN CONSTANTE (Cada 5 segundos)
                emotionInterval = setInterval(async () => {
                    // Verificaciones de seguridad: si el video está pausado o la pestaña está en segundo plano, no proceses
                    if (
                        !videoRef.current ||
                        videoRef.current.readyState !== 4 ||
                        document.visibilityState !== 'visible' ||
                        videoRef.current.paused
                    ) {
                        return; 
                    }

                    try {
                        // Aplica la IA sobre el frame actual de video para extraer una lista de emociones y su % de confianza
                        const detections = await faceapi.detectSingleFace(
                            videoRef.current,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
                        ).withFaceExpressions(); 

                        if (detections) {
                            const expressions = detections.expressions;

                            // Algoritmo matemático para encontrar cuál es la emoción con el porcentaje más alto (ej: 0.98 happy vs 0.01 sad)
                            const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
                                expressions[a] > expressions[b] ? a : b
                            );

                            // Diccionario de traducción visual para que el usuario lo vea en español
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

                            // 4. ENVÍO DE DATOS AL BACKEND
                            // Para no saturar la base de datos, SOLO mandamos la emoción al servidor
                            // si la emoción actual es DIFERENTE a la última que se detectó.
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
                }, 5000); // 5000ms = 5 segundos

            } catch (err) {
                console.error("No se pudo iniciar la detección de emociones", err);
                setCurrentEmotion('Cámara no disponible');
            }
        };

        startEmotionDetection(); 

        // Cleanup: si el componente desaparece (se cambia de ruta), debemos APAGAR la cámara y limpiar el setInterval
        return () => {
            if (emotionInterval) clearInterval(emotionInterval); 
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [sessionId]); 

    // Interfaz visual del componente: un recuadro oscuro transparente en la esquina inferior derecha
    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                {/* Texto indicando la emoción actual */}
                <div className="mb-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full text-center tracking-wider uppercase">
                    {currentEmotion}
                </div>
                {/* Visualización de la cámara (escalada en X para modo "espejo") */}
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