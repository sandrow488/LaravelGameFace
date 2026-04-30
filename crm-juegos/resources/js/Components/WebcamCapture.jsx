// Importaciones de React: useRef para referenciar elementos del DOM, useState para estado, useCallback y useEffect para efectos
import React, { useRef, useState, useCallback, useEffect } from 'react';

// Componente reutilizable para capturar fotos desde la cámara del dispositivo
// Props:
//   onCapture: función que se llama con el archivo de imagen cuando el usuario pulsa el botón
//   onCancel: función opcional que se llama si el usuario cancela (muestra el botón Cancelar)
//   buttonText: texto personalizado del botón de captura (por defecto "Capturar")
//   isProcessing: si es true, bloquea el botón y muestra "Procesando..."
export default function WebcamCapture({ onCapture, onCancel, buttonText = "Capturar", isProcessing = false }) {
    // videoRef: referencia al elemento <video> donde se muestra el feed de la cámara en tiempo real
    const videoRef = useRef(null);

    // canvasRef: referencia a un <canvas> oculto que se usa para "sacar una foto" del video
    const canvasRef = useRef(null);

    // error: mensaje de error si no se pudo acceder a la cámara
    const [error, setError] = useState(null);

    // streamRef: guarda el stream de la cámara para poder detenerlo después
    const streamRef = useRef(null);

    // startCamera: solicita acceso a la cámara y conecta el stream al elemento <video>
    const startCamera = async () => {
        try {
            if (streamRef.current) return; // Si la cámara ya está activa, no la inicia de nuevo

            // Solicita acceso a la cámara frontal con resolución 320x240
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" } // "user" = cámara frontal
            });

            streamRef.current = mediaStream; // Guarda el stream para poder detenerlo después

            // Conecta el stream al elemento <video> para que muestre el feed en tiempo real
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null); // Limpia cualquier error anterior
        } catch (err) {
            console.error("Error accessing camera:", err);
            // Muestra un mensaje de error amigable al usuario
            setError("No se pudo acceder a la cámara. Por favor, concede los permisos necesarios.");
        }
    };

    // stopCamera: detiene todos los tracks del stream para apagar la cámara completamente
    // useCallback evita que esta función se recree en cada render (optimización de rendimiento)
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop()); // Detiene cada track (video, audio)
            streamRef.current = null; // Limpia la referencia
        }
    }, []);

    // useEffect: inicia la cámara cuando el componente se monta y la detiene cuando se desmonta
    useEffect(() => {
        startCamera(); // Inicia la cámara al cargar el componente
        return () => stopCamera(); // Función de limpieza: apaga la cámara al salir de la pantalla
    }, [stopCamera]);

    // capturePhoto: captura el frame actual del video y lo convierte en un archivo de imagen
    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return; // Verifica que los elementos existan

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d'); // Obtiene el contexto 2D para dibujar en el canvas

        // Ajusta el tamaño del canvas al tamaño real del video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Dibuja el frame actual del video en el canvas (equivale a "hacer una foto")
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convierte el canvas a un Blob (datos binarios de imagen) en formato JPEG con calidad 0.9
        canvas.toBlob((blob) => {
            if (blob) {
                // Convierte el Blob a un File para que sea compatible con FormData
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                onCapture(file); // Llama a la función del componente padre con el archivo capturado
            }
        }, 'image/jpeg', 0.9); // 0.9 = 90% de calidad (buen equilibrio entre tamaño y calidad)
    };

    // Render: interfaz visual del componente
    return (
        <div className="flex flex-col items-center space-y-4">
            {error ? (
                // Si hay un error de cámara, muestra el mensaje en lugar del video
                <div className="text-red-500 bg-red-100 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            ) : (
                // Contenedor del video con borde decorativo
                <div className="relative border-4 border-indigo-600/30 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl min-h-[240px] w-full max-w-sm flex items-center justify-center">
                    <video
                        ref={videoRef}
                        autoPlay       // Reproduce automáticamente
                        playsInline    // Evita pantalla completa en móviles iOS
                        muted          // Sin audio (solo necesitamos video)
                        className="w-full h-full object-cover transform scale-x-[-1]" // Efecto espejo horizontal
                    />
                    {/* Canvas oculto: solo se usa internamente para capturar el frame */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Botones de acción */}
            <div className="flex space-x-3">
                {/* Botón Cancelar: solo aparece si se proporcionó la función onCancel */}
                {onCancel && (
                    <button
                        type="button"
                        onClick={() => { stopCamera(); onCancel(); }} // Apaga la cámara antes de cancelar
                        disabled={isProcessing}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        Cancelar
                    </button>
                )}

                {/* Botón de captura: solo aparece si no hay error de cámara */}
                {!error && (
                    <button
                        type="button"
                        onClick={capturePhoto}       // Llama a la función que captura la foto
                        disabled={isProcessing}      // Deshabilitado mientras se procesa la imagen
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center shadow-md"
                    >
                        {isProcessing ? (
                            // Muestra un spinner animado mientras se está procesando
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Procesando...
                            </>
                        ) : buttonText} {/* Si no está procesando, muestra el texto personalizado del botón */}
                    </button>
                )}
            </div>
        </div>
    );
}