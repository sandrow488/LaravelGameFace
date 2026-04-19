import React, { useRef, useState, useCallback, useEffect } from 'react';

export default function WebcamCapture({ onCapture, onCancel, buttonText = "Capturar", isProcessing = false }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [error, setError] = useState(null);
    const streamRef = useRef(null);

    const startCamera = async () => {
        try {
            if (streamRef.current) return; // Ya está iniciada

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" }
            });
            
            streamRef.current = mediaStream;
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("No se pudo acceder a la cámara. Por favor, concede los permisos necesarios.");
        }
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [stopCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Draw the frame
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
                onCapture(file);
            }
        }, 'image/jpeg', 0.9);
    };

    return (
        <div className="flex flex-col items-center space-y-4">
            {error ? (
                <div className="text-red-500 bg-red-100 p-3 rounded-lg text-sm text-center">
                    {error}
                </div>
            ) : (
                <div className="relative border-4 border-indigo-600/30 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl min-h-[240px] w-full max-w-sm flex items-center justify-center">
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover transform scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            <div className="flex space-x-3">
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
                {!error && (
                    <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={isProcessing}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center shadow-md"
                    >
                        {isProcessing ? (
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
