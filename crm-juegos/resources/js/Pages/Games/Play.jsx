
import React, { useState, useEffect, useRef } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'; 
import { Head, Link } from '@inertiajs/react';                  
import WebcamCapture from '@/Components/WebcamCapture';          
import GameChat from '@/Components/GameChat';                    
import EmotionOverlay from '@/Components/EmotionOverlay';        
import axios from 'axios';                                       
import * as faceapi from 'face-api.js';                         



export default function Play({ auth, game }) {
    

    
    const [isVerified, setIsVerified] = useState(false);

    
    const [isVerifying, setIsVerifying] = useState(false);

    
    const [verifyError, setVerifyError] = useState('');

    
    const [sessionId, setSessionId] = useState(null);

    
    const videoRef = useRef(null);

    
    const handleVerification = async (file) => {
        setIsVerifying(true);   
        setVerifyError('');     

        try {
            
            const formData = new FormData();
            formData.append('image', file); 

            
            
            const verifyRes = await axios.post('/api/face/verify', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            
            if (verifyRes.data.verified) {
                
                const sessionRes = await axios.post('/games/start', { game_id: game.id });

                
                setSessionId(sessionRes.data.session_id);

                
                setIsVerified(true);
            } else {
                
                throw new Error('La verificación facial falló según el servidor.');
            }

        } catch (err) {
            
            console.error("Fallo de Seguridad (Detalles):", err.response?.data || err);

            
            const errorMsg = err.response?.data?.error || err.message || 'Error durante la verificación.';

            
            setVerifyError(errorMsg);
        } finally {
            
            setIsVerifying(false); 
        }
    };

    
    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <div className="flex justify-between items-center">
                    {}
                    <h2 className="font-bold text-2xl text-gray-900 leading-tight flex items-center">
                        <span className="w-3 h-3 bg-green-500 rounded-full mr-3 animate-pulse"></span>
                        {game.title}
                    </h2>
                    {}
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

                    {}
                    {!game.is_published && (
                        <div className="backdrop-blur-sm bg-yellow-500/20 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg" role="alert">
                            <p className="font-bold flex items-center">Modo Previsualización (Oculto)</p>
                        </div>
                    )}

                    {}
                    {!isVerified ? (
                        
                        <div className="bg-white p-8 shadow-xl rounded-2xl max-w-lg mx-auto text-center border-t-8 border-indigo-600">
                            <h3 className="text-xl font-bold mb-2">Punto de Control</h3>

                            <>
                                <p className="text-gray-600 mb-6">Por motivos de seguridad, debemos verificar tu identidad comparando con la foto que tomaste al iniciar sesión.</p>

                                {}
                                {verifyError && (
                                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm font-semibold">
                                        {verifyError}
                                    </div>
                                )}

                                {}
                                <WebcamCapture
                                    onCapture={handleVerification}    
                                    isProcessing={isVerifying}        
                                    buttonText="Verificar y Entrar"
                                />
                            </>
                        </div>
                    ) : (
                        
                        <div className="flex-grow flex bg-white overflow-hidden shadow-2xl rounded-3xl border border-gray-200/60 ring-1 ring-black/5">

                            <div className="flex-1 flex flex-col relative w-full border-r border-gray-200">
                                {}
                                <EmotionOverlay sessionId={sessionId} />

                                {}
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

                                {}
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

                            {}
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