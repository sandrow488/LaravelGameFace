// Importaciones necesarias de React y librerías externas
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';                    // Para enviar las emociones detectadas al servidor
import * as faceapi from 'face-api.js';       // Librería de IA para detectar caras y expresiones en el navegador

// Componente EmotionOverlay: se superpone sobre el juego y detecta la emoción del jugador en tiempo real
// Recibe sessionId: ID de la sesión de juego activa (para asociar las emociones a la sesión correcta)
export default function EmotionOverlay({ sessionId }) {
    // currentEmotion: texto de la emoción detectada que se muestra en la interfaz
    const [currentEmotion, setCurrentEmotion] = useState('Analizando...');

    // videoRef: referencia al elemento <video> del DOM donde se muestra el feed de la cámara
    const videoRef = useRef(null);

    // useEffect: se ejecuta cuando el componente se monta o cuando sessionId cambia
    // Contiene toda la lógica de inicialización de la cámara y la IA
    useEffect(() => {
        let emotionInterval; // Variable para guardar el ID del intervalo y poder cancelarlo después

        // Función asíncrona que configura todo el sistema de detección de emociones
        const startEmotionDetection = async () => {
            if (!sessionId) return; // Si no hay sesión activa, no hace nada

            try {
                // Paso 1: Descarga los modelos de IA de face-api.js desde GitHub
                // tinyFaceDetector: modelo ligero para detectar caras en tiempo real
                // faceExpressionNet: modelo para clasificar expresiones faciales (feliz, triste, etc.)
                const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
                ]);

                // Paso 2: Solicita acceso a la cámara del usuario (frontcamera)
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream; // Conecta el stream de video al elemento <video>
                }

                let lastEmotionReported = null; // Guarda la última emoción enviada al servidor para evitar duplicados

                // Paso 3: Crea un intervalo que analiza la cara cada 5000ms (5 segundos)
                emotionInterval = setInterval(async () => {
                    // Verifica que el video esté listo y visible antes de analizar
                    // readyState === 4 significa que el video tiene suficientes datos para reproducir
                    // document.visibilityState !== 'visible' evita análisis cuando la pestaña está oculta
                    if (
                        !videoRef.current ||
                        videoRef.current.readyState !== 4 ||
                        document.visibilityState !== 'visible' ||
                        videoRef.current.paused
                    ) {
                        return; // Sale del ciclo si las condiciones no son las correctas
                    }

                    try {
                        // Analiza el frame actual del video buscando una cara y sus expresiones
                        // TinyFaceDetectorOptions: inputSize=160 (resolución del análisis), scoreThreshold=0.5 (confianza mínima)
                        const detections = await faceapi.detectSingleFace(
                            videoRef.current,
                            new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 })
                        ).withFaceExpressions(); // Encadena el análisis de expresiones a la detección de cara

                        if (detections) {
                            // expressions es un objeto con la probabilidad de cada emoción (0 a 1)
                            // Ejemplo: { happy: 0.85, sad: 0.02, neutral: 0.10, ... }
                            const expressions = detections.expressions;

                            // Encuentra la emoción con mayor probabilidad comparando pares de valores
                            const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
                                expressions[a] > expressions[b] ? a : b
                            );

                            // Traduce los nombres de emociones del inglés al español con emojis
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
                            setCurrentEmotion(translated); // Actualiza la pantalla con la nueva emoción

                            // Solo envía la emoción al servidor si cambió respecto a la última enviada
                            // Esto evita saturar la base de datos con registros repetidos
                            if (lastEmotionReported !== dominantEmotion) {
                                axios.post(`/game-sessions/${sessionId}/emotions`, {
                                    emotion:    dominantEmotion,                // Nombre en inglés para la BD
                                    confidence: expressions[dominantEmotion]    // Nivel de confianza (0-1)
                                }).catch(e => console.debug("Error al reportar:", e)); // Ignora errores silenciosamente

                                lastEmotionReported = dominantEmotion; // Actualiza el último valor reportado
                            }
                        }
                    } catch (err) {
                        // Captura errores del ciclo de detección sin interrumpir el intervalo
                        console.debug("Error en el ciclo de detección:", err);
                    }
                }, 5000); // El ciclo se repite cada 5 segundos

            } catch (err) {
                // Si falla la inicialización (cámara denegada, modelos no cargan, etc.)
                console.error("No se pudo iniciar la detección de emociones", err);
                setCurrentEmotion('Cámara no disponible');
            }
        };

        startEmotionDetection(); // Inicia el proceso cuando el componente se monta

        // Función de limpieza: se ejecuta cuando el componente se desmonta (usuario sale del juego)
        return () => {
            if (emotionInterval) clearInterval(emotionInterval); // Para el intervalo de detección
            if (videoRef.current && videoRef.current.srcObject) {
                // Detiene todos los tracks de video para apagar la cámara completamente
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [sessionId]); // Solo se re-ejecuta si sessionId cambia

    // Render: interfaz visual superpuesta en la esquina inferior derecha del juego
    return (
        <div className="absolute bottom-6 right-6 z-50 pointer-events-none">
            {/* Contenedor principal con efecto glassmorphism */}
            <div className="bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                {/* Badge con el texto de la emoción actual */}
                <div className="mb-2 bg-indigo-600/90 text-white text-[10px] font-bold px-2 py-1 rounded-full text-center tracking-wider uppercase">
                    {currentEmotion}
                </div>
                {/* Miniatura de la cámara del usuario */}
                <div className="relative w-32 h-24 rounded-xl overflow-hidden bg-gray-800 ring-2 ring-indigo-500/50">
                    <video
                        ref={videoRef}    // Conectado al stream de la cámara
                        autoPlay          // Reproduce automáticamente sin interacción del usuario
                        playsInline       // Evita que se abra en pantalla completa en móviles
                        muted             // Sin audio (no necesitamos audio para detectar emociones)
                        className="w-full h-full object-cover scale-x-[-1]" // scale-x-[-1] voltea horizontalmente para efecto espejo
                    />
                </div>
            </div>
        </div>
    );
}