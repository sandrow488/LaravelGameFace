import React, { useState } from 'react';
import WebcamCapture from '@/Components/WebcamCapture';
import { router } from '@inertiajs/react';

export default function FaceEnrollmentForm({ className = '' }) {
    const [isCapturing, setIsCapturing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [message, setMessage] = useState('');
    const [errors, setErrors] = useState({});

    const handleCapture = (file) => {
        setIsProcessing(true);
        setMessage('');
        setErrors({});
        
        router.post(route('face.enroll'), {
            image: file
        }, {
            forceFormData: true,
            onSuccess: () => {
                setMessage('¡Rostro enrolado con éxito! Ya puedes volver a tus juegos.');
                setIsCapturing(false);
            },
            onError: (errs) => {
                setErrors(errs);
            },
            onFinish: () => {
                setIsProcessing(false);
            }
        });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900">Enrolamiento Facial</h2>
                <p className="mt-1 text-sm text-gray-600">
                    Registra tu rostro para poder acceder a los juegos mediante reconocimiento facial.
                </p>
            </header>

            <div className="mt-6">
                {message && (
                    <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                        {message}
                    </div>
                )}
                
                {errors.image && (
                    <div className="mb-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                        {errors.image}
                    </div>
                )}

                {!isCapturing ? (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
                        <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4 text-indigo-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        </div>
                        <p className="text-gray-600 mb-6 font-medium">Captura tu foto de seguridad para habilitar el acceso a los juegos.</p>
                        <button
                            onClick={() => setIsCapturing(true)}
                            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                        >
                            Tomar Foto de Seguridad
                        </button>
                    </div>
                ) : (
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-xl inline-block">
                        <WebcamCapture 
                            onCapture={handleCapture} 
                            onCancel={() => setIsCapturing(false)}
                            isProcessing={isProcessing}
                            buttonText="Guardar Rostro"
                        />
                    </div>
                )}
            </div>
        </section>
    );
}
