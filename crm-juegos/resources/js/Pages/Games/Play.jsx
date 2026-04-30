// Importaciones: módulos de React y librerías externas necesarias
import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; // Plantilla con cabecera y navegación
import { Head, Link } from '@inertiajs/react';                  // Head = título de pestaña, Link = navegación sin recarga
import WebcamCapture from '@/Components/WebcamCapture';          // Componente de cámara reutilizable
import GameChat from '@/Components/GameChat';                    // Chat en tiempo real
import EmotionOverlay from '@/Components/EmotionOverlay';        // Detector de emociones superpuesto
import axios from 'axios';                                       // Cliente HTTP para hacer peticiones al servidor
import * as faceapi from 'face-api.js';                         // Librería de reconocimiento facial en el navegador

// Componente principal de la pantalla de juego
// Recibe: auth (datos del usuario logueado) y game (datos del juego a cargar)
export default function Play({ auth, game }) {
    // State: variables de estado que controlan qué se muestra en pantalla

    // isVerified: false = mostramos el punto de control, true = mostramos el juego
    const [isVerified, setIsVerified] = useState(false);

    // isVerifying: true mientras se está procesando la verificación (muestra "Procesando...")
    const [isVerifying, setIsVerifying] = useState(false);

    // verifyError: mensaje de error a mostrar si la verificación facial falla
    const [verifyError, setVerifyError] = useState('');

    // sessionId: ID de la sesión de juego en BD, necesario para el chat y las emociones
    const [sessionId, setSessionId] = useState(null);

    // videoRef: referencia al elemento <video> del DOM, usada por el análisis de emociones
    const videoRef = useRef(null);

    // Logic: función que se ejecuta cuando el usuario captura su foto en el punto de control
    const handleVerification = async (file) => {
        setIsVerifying(true);   // Activa el estado de carga
        setVerifyError('');     // Limpia errores anteriores

        try {
            // Crea un FormData para enviar la imagen como multipart/form-data (igual que un formulario HTML)
            const formData = new FormData();
            formData.append('image', file); // Añade el archivo de imagen con la clave 'image'

            // Envía la imagen al endpoint de Laravel que gestiona la verificación facial
            // Laravel la reenviará al microservicio Python internamente
            const verifyRes = await axios.post('/api/face/verify', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Si Laravel responde que la verificación fue exitosa
            if (verifyRes.data.verified) {
                // Crea una sesión de juego en la base de datos para registrar inicio, duración y puntuación
                const sessionRes = await axios.post('/games/start', { game_id: game.id });

                // Guarda el ID de la sesión en el estado (lo usan GameChat y EmotionOverlay)
                setSessionId(sessionRes.data.session_id);

                // Marca como verificado: esto oculta el punto de control y muestra el juego
                setIsVerified(true);
            } else {
                // Si Laravel dice verified=false (raro, porque normalmente lanza 401), lanza error manual
                throw new Error('La verificación facial falló según el servidor.');
            }

        } catch (err) {
            // Muestra los detalles del error en la consola del navegador para depuración
            console.error("Fallo de Seguridad (Detalles):", err.response?.data || err);

            // Extrae el mensaje de error del servidor o usa el mensaje genérico del error
            const errorMsg = err.response?.data?.error || err.message || 'Error durante la verificación.';

            // Actualiza el estado para mostrar el mensaje de error en pantalla
            setVerifyError(errorMsg);
        } finally {
            // Se ejecuta siempre, tanto si hubo error como si no
            setIsVerifying(false); // Desactiva el estado de carga
        }
    };

    // Render: lo que se muestra en pantalla
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    {/* Título del juego con indicador verde parpadeante de actividad */}
                    <h2 className="font-bold text-2xl text-gray-900 leading-tight flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                        {game.title}
                    </h2>
                    {/* Botón para volver al dashboard */}
                    <Link
                        href={route('dashboard')}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                    >
                        Volver al Panel
                    </Link>
                </div>
            }
        >
            <Head title={`Jugando: ${game.title}`} />

            <div className="py-8 bg-gray-100 min-h-[calc(100vh-73px)]">
                <div className="max-w-[1400px] mx-auto sm:px-6 lg:px-8 h-full flex flex-col">

                    {/* Aviso visual si el juego no está publicado (solo lo ven admins y gestores) */}
                    {!game.is_published && (
                        <div className="backdrop-blur-sm bg-yellow-500/20 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                            <p className="font-bold flex items-center">Modo Previsualización (Oculto)</p>
                        </div>
                    )}

                    {/* Condicional principal: si no está verificado, muestra el punto de control; si lo está, muestra el juego */}
                    {!isVerified ? (
                        // PUNTO DE CONTROL: formulario de verificación facial antes de entrar al juego
                        <div className="bg-white p-8 shadow-xl rounded-2xl max-w-lg mx-auto text-center border-t-8 border-indigo-600">
                            <h3 className="text-xl font-bold mb-2">Punto de Control</h3>

                            <>
                                <p className="text-gray-600 mb-6">Por motivos de seguridad, debemos verificar tu identidad comparando con la foto que tomaste al iniciar sesión.</p>

                                {/* Muestra el mensaje de error si la verificación falló */}
                                {verifyError && (
                                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                                        {verifyError}
                                    </div>
                                )}

                                {/* Componente de cámara: cuando el usuario pulsa el botón, llama a handleVerification */}
                                <WebcamCapture
                                    onCapture={handleVerification}    // Función a llamar con la foto capturada
                                    isProcessing={isVerifying}        // Bloquea el botón mientras procesa
                                    buttonText="Verificar y Entrar"
                                />
                            </>
                        </div>
                    ) : (
                        // JUEGO: pantalla completa con el iframe del juego 3D, el overlay de emociones y el chat
                        <div className="flex-grow flex bg-white overflow-hidden shadow-2xl rounded-3xl border border-gray-200/60 ring-1 ring-black/5">

                            <div className="flex-1 flex flex-col relative w-full border-r border-gray-200">
                                {/* EmotionOverlay: componente aislado que detecta emociones sin afectar al juego */}
                                <EmotionOverlay sessionId={sessionId} />

                                {/* Barra superior con el título del juego y el botón de pantalla completa */}
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

                                {/* Contenedor del iframe que carga el juego 3D */}
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

                            {/* Chat en tiempo real: solo se muestra si hay una sesión de juego activa */}
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