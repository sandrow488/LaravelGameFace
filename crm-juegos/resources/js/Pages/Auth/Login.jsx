import { useState, useEffect } from 'react';
import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import WebcamCapture from '@/Components/WebcamCapture';

export default function Login({ status, canResetPassword }) {
    const [step, setStep] = useState(1);
    
    const { data, setData, post, processing, errors, reset, clearErrors } = useForm({
        email: '',
        password: '',
        remember: false,
        image: null,
    });

    const handleNext = (e) => {
        e.preventDefault();
        
        if (!data.email || !data.password) {
            return;
        }
        setStep(2);
    };

    const handleCapture = (file) => {
        setData('image', file);
        
        
        
        
        
        
        
    };

    
    useEffect(() => {
        if (data.image) {
            post(route('login'), {
                onStart: () => console.log("Iniciando POST a:", route('login')),
                onFinish: () => reset('password'),
                onError: (err) => {
                    console.error("Detalles del error de login:", err);
                    setData('image', null); 
                    setStep(1);
                },
            });
        }
    }, [data.image]);

    const submitLogin = (file) => {
        clearErrors();
        setData('image', file);
    };

    return (
        <GuestLayout>
            <Head title="Iniciar Sesión" />

            <div className="mb-6 text-center">
                <h2 className="text-xl font-semibold text-gray-800">Bienvenido de nuevo</h2>
                <p className="text-sm text-gray-500 mt-1">Accede para jugar o administrar el catálogo</p>
            </div>

            {status && <div className="mb-4 text-sm font-medium text-green-600 bg-green-50 p-3 rounded-lg text-center">{status}</div>}

            <form onSubmit={step === 1 ? handleNext : (e) => e.preventDefault()} className="space-y-4">
                {step === 1 && (
                    <>
                        <div>
                            <InputLabel htmlFor="email" value="Correo Electrónico" className="font-semibold text-gray-700" />
                            <TextInput
                                id="email"
                                type="email"
                                name="email"
                                value={data.email}
                                className="mt-1 block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 hover:bg-white"
                                autoComplete="username"
                                isFocused={true}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} className="mt-2 text-sm" />
                        </div>

                        <div>
                            <InputLabel htmlFor="password" value="Contraseña" className="font-semibold text-gray-700" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                value={data.password}
                                className="mt-1 block w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-indigo-500 focus:border-indigo-500 transition-colors bg-gray-50 hover:bg-white"
                                autoComplete="current-password"
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} className="mt-2 text-sm" />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center cursor-pointer">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-5 h-5 cursor-pointer"
                                />
                                <span className="ms-2 text-sm font-medium text-gray-600 cursor-pointer">Mantener sesión</span>
                            </label>
                        </div>

                        <div className="pt-4">
                            <PrimaryButton className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-0.5 transition-all outline-none" disabled={processing || !data.email || !data.password}>
                                Siguiente: Verificación Facial
                            </PrimaryButton>
                        </div>
                        
                        {canResetPassword && (
                            <div className="text-center mt-6 pt-6 border-t border-gray-100">
                                <Link
                                    href={route('password.request')}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>
                        )}
                    </>
                )}

                {step === 2 && (
                    <div className="flex flex-col items-center">
                        <p className="text-gray-600 mb-4 text-center font-medium">Por tu seguridad, necesitamos una captura de tu rostro.</p>
                        <InputError message={errors.image} className="mb-4 text-center" />
                        <WebcamCapture 
                            onCapture={submitLogin}
                            onCancel={() => setStep(1)}
                            isProcessing={processing}
                            buttonText="Capturar y Entrar"
                        />
                    </div>
                )}
            </form>
        </GuestLayout>
    );
}