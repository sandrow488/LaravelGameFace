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
                        <p className="text-gray-600 mb-6 font-medium">Captura o sube tu foto de seguridad para habilitar el acceso a los juegos.</p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => setIsCapturing(true)}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                Usar Cámara
                            </button>

                            <label className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold border-2 border-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                Subir Imagen
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleCapture(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
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
