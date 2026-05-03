import React, { useRef, useState, useCallback, useEffect } from 'react';

// Componente genérico para capturar una foto desde la cámara.
// Recibe parámetros (props) como onCapture (lo que debe hacer cuando se toma la foto),
// onCancel (si el usuario presiona cancelar), y un texto dinámico para el botón.
export default function WebcamCapture({ onCapture, onCancel, buttonText = "Capturar", isProcessing = false }) {
    // Referencia al elemento HTML <video> para mostrar el streaming de la cámara
    const videoRef = useRef(null);

    // Referencia al elemento HTML <canvas> (invisible) usado para "pintar" la foto capturada
    const canvasRef = useRef(null);

    // Guarda mensajes de error, por ejemplo, si el usuario deniega los permisos de cámara
    const [error, setError] = useState(null);

    // Guarda el flujo multimedia actual (MediaStream) para poder cerrarlo de forma limpia después
    const streamRef = useRef(null);

    // Función que arranca la cámara web
    const startCamera = async () => {
        try {
            if (streamRef.current) return; // Si ya hay cámara corriendo, no hace nada

            // Pide permisos y acceso a la cámara frontal (resolución 320x240)
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" } 
            });

            streamRef.current = mediaStream; 

            // Vincula el flujo de video al tag <video> para que el usuario se vea
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null); 
        } catch (err) {
            console.error("Error accessing camera:", err);
            // Muestra error amigable si el usuario rechaza los permisos o no tiene cámara
            setError("No se pudo acceder a la cámara. Por favor, concede los permisos necesarios.");
        }
    };

    // Función para apagar la cámara de forma segura
    // useCallback evita que React recree esta función innecesariamente en cada render
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            // Apaga cada 'pista' del streaming (video y audio si lo hubiera)
            streamRef.current.getTracks().forEach(track => track.stop()); 
            streamRef.current = null; 
        }
    }, []);

    // Se ejecuta al montar el componente (inicia cámara) y al desmontar (apaga cámara)
    useEffect(() => {
        startCamera(); 
        return () => stopCamera(); 
    }, [stopCamera]);

    // Lógica principal: Tomar la foto
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return; 

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d'); 

        // 1. Igualar dimensiones del canvas invisible con las del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 2. "Pintar" en 2D el cuadro exacto de video actual dentro del canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 3. Convertir el contenido del canvas en un archivo binario de imagen (Blob en formato JPEG)
        canvas.toBlob((blob) => {
            if (blob) {
                // Transformar el Blob en un File nativo de Javascript y enviarlo al componente padre (via callback onCapture)
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                onCapture(file); 
            }
        }, 'image/jpeg', 0.9); // 0.9 es la calidad del JPEG
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            {error ? (
                // Mostrar alerta de error si falla la cámara
                <div className="text-red-500 bg-red-100 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            ) : (
                // Mostrar el visor de la cámara web
                <div className="relative border-4 border-indigo-600/30 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl min-h-[240px] w-full max-w-sm flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay       
                        playsInline    
                        muted          
                        className="w-full h-full object-cover transform scale-x-[-1]" // scale-x-[-1] hace el efecto de espejo natural
                    />
                    {/* El canvas existe pero está invisible (hidden), solo se usa para extraer la foto */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Controles / Botones */}
            <div className="flex space-x-3">
                {/* Botón opcional de cancelar */}
                {onCancel && (
                    <button
                        type="button"
                        onClick={() => { stopCamera(); onCancel(); }} 
                        disabled={isProcessing}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        Cancelar
                    </button>
                )}

                {/* Botón principal de Captura */}
                {!error && (
                    <button
                        type="button"
                        onClick={capturePhoto}       
                        disabled={isProcessing}      
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center shadow-md"
                    >
                        {isProcessing ? (
                            // Mostrar un pequeño spinner si se está procesando la solicitud
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                            </>
                        ) : buttonText} 
                    </button>
                )}
            </div>
        </div>
    );
}