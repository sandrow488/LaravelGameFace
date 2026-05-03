import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Estructura de página con navbar
import { Head, Link } from '@inertiajs/react';                   // Componentes de Inertia.js para SEO y navegación sin recargas
import WebcamCapture from '@/Components/WebcamCapture';          // Nuestro componente para tomar fotos
import GameChat from '@/Components/GameChat';                    // El panel de chat lateral
import EmotionOverlay from '@/Components/EmotionOverlay';        // El overlay de Inteligencia Artificial que lee caras
import axios from 'axios';                                       // Cliente HTTP para llamadas a la API
import * as faceapi from 'face-api.js';                         

// Componente Principal de la página Jugar
export default function Play({ auth, game }) {
    // ---------------- ESTADOS DE REACT ----------------
    
    // Indica si el usuario ya pasó el control facial y puede jugar
    const [isVerified, setIsVerified] = useState(false);

    // Indica si el sistema está procesando la validación de la foto en este momento
    const [isVerifying, setIsVerifying] = useState(false);

    // Guarda mensajes de error si la cara no coincide
    const [verifyError, setVerifyError] = useState('');

    // ID único de la sesión de juego actual (se recibe tras el inicio exitoso)
    const [sessionId, setSessionId] = useState(null);

    // ---------------- LÓGICA DE VERIFICACIÓN ----------------
    
    // Esta función se ejecuta cuando el usuario pulsa "Verificar y Entrar" en el componente WebcamCapture
    const handleVerification = async (file) => {
        setIsVerifying(true);   // Muestra el spinner de carga
        setVerifyError('');     // Limpia errores previos

        try {
            // 1. Preparar la imagen para enviarla
            const formData = new FormData();
            formData.append('image', file); 

            // 2. Enviar la foto al servidor (Laravel -> FaceVerificationController -> Python)
            const verifyRes = await axios.post('/api/face/verify', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 3. Evaluar respuesta
            if (verifyRes.data.verified) {
                // Si la cara coincide con la del login, iniciamos oficialmente la partida en la DB
                const sessionRes = await axios.post('/games/start', { game_id: game.id });

                // Guardamos el ID de esta partida. Esto es clave porque el Chat y las Emociones 
                // necesitan saber a qué partida pertenecen.
                setSessionId(sessionRes.data.session_id);

                // Cambiamos el estado a "Verificado", lo que oculta la cámara y muestra el juego
                setIsVerified(true);
            } else {
                throw new Error('La verificación facial falló según el servidor.');
            }

        } catch (err) {
            console.error("Fallo de Seguridad (Detalles):", err.response?.data || err);

            // Extrae el mensaje de error de la API (o muestra uno genérico)
            const errorMsg = err.response?.data?.error || err.message || 'Error durante la verificación.';
            setVerifyError(errorMsg);
        } finally {
            setIsVerifying(false); // Oculta el spinner pase lo que pase
        }
    };

    // ---------------- INTERFAZ GRÁFICA (UI) ----------------
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    {/* Título de la cabecera */}
                    <h2 className="font-bold text-2xl text-gray-900 leading-tight flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                        {game.title}
                    </h2>
                    {/* Botón de volver */}
                    <Link
                        href={route('dashboard')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        Volver al Panel
                    </Link>
                </div>
            }
        >
            <Head title={`Jugando: ${game.title}`} /> {/* Título de la pestaña del navegador */}

            <div className="py-8 bg-gray-100 min-h-[calc(100vh-73px)]">
                <div className="max-w-[1400px] mx-auto sm:px-6 lg:px-8 h-full flex flex-col">

                    {/* Alerta de "Modo Previsualización" si el administrador entra a un juego no publicado */}
                    {!game.is_published && (
                        <div className="backdrop-blur-sm bg-yellow-500/20 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                            <p className="font-bold flex items-center">Modo Previsualización (Oculto)</p>
                        </div>
                    )}

                    {/* LÓGICA DE CONDICIONAL DE RENDERIZADO */}
                    {!isVerified ? (
                        /* PANTALLA 1: CONTROL DE SEGURIDAD (Si aún no se ha verificado el rostro) */
                        <div className="bg-white p-8 shadow-xl rounded-2xl max-w-lg mx-auto text-center border-t-8 border-indigo-600">
                            <h3 className="text-xl font-bold mb-2">Punto de Control</h3>

                            <>
                                <p className="text-gray-600 mb-6">Por motivos de seguridad, debemos verificar tu identidad comparando con la foto que tomaste al iniciar sesión.</p>

                                {/* Mostrar bloque rojo si hubo error en la verificación facial */}
                                {verifyError && (
                                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                                        {verifyError}
                                    </div>
                                )}

                                {/* Invoca al componente reutilizable de la cámara */}
                                <WebcamCapture
                                    onCapture={handleVerification}    
                                    isProcessing={isVerifying}        
                                    buttonText="Verificar y Entrar"
                                />
                            </>
                        </div>
                    ) : (
                        /* PANTALLA 2: SALA DE JUEGO (Si ya se verificó exitosamente) */
                        <div className="flex-grow flex bg-white overflow-hidden shadow-2xl rounded-3xl border border-gray-200/60 ring-1 ring-black/5">

                            <div className="flex-1 flex flex-col relative w-full border-r border-gray-200">
                                {/* OVERLAY: Detecta emociones constantemente mientras juega */}
                                <EmotionOverlay sessionId={sessionId} />

                                {/* Barra superior de opciones del juego */}
                                <div className="px-6 py-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center z-10">
                                    <div>
                                        <h3 className="text-lg font-bold text-white tracking-wide">{game.title}</h3>
                                    </div>
                                    <button
                                        className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                                        title="Pantalla Completa"
                                        onClick={() => document.getElementById('game-iframe').requestFullscreen()}
                                    >
                                        Pantalla Completa
                                    </button>
                                </div>

                                {/* Iframe central donde corre el juego hecho en Unity/HTML5 */}
                                <div className="relative w-full flex-grow bg-black shadow-inner" style={{ minHeight: '65vh' }}>
                                    <iframe
                                        id="game-iframe"
                                        src="/Juego3D/index.html"
                                        className="absolute top-0 left-0 w-full h-full border-0 z-10"
                                        title={`Juego: ${game.title}`}
                                        allowFullScreen
                                        loading="eager"
                                        allow="camera; microphone; display-capture; autoplay; vr; xr-spatial-tracking"
                                        style={{backgroundColor: 'transparent'}}
                                    ></iframe>
                                </div>
                            </div>

                            {/* CHAT LATERAL: Solo se carga una vez que tenemos un ID de sesión válido */}
                            {sessionId && (
                                <GameChat gameSessionId={sessionId} currentUser={auth.user} />
                            )}

                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}