<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    // Muestra la página de login al usuario (renderiza el componente React Login.jsx)
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            // Pasa al frontend si existe la ruta de recuperar contraseña (para mostrar el enlace)
            'canResetPassword' => Route::has('password.request'),
            // Pasa mensajes de estado de sesión (ej: "Email verificado correctamente")
            'status' => session('status'),
        ]);
    }

    // Procesa el formulario de login cuando el usuario pulsa "Entrar"
    public function store(LoginRequest $request): RedirectResponse
    {
        // Valida las credenciales (email + contraseña) usando el LoginRequest
        // Si son incorrectas, lanza una excepción y vuelve al formulario con error
        $request->authenticate();

        // Regenera el ID de sesión para prevenir ataques de fijación de sesión (seguridad)
        $request->session()->regenerate();

        // Si el formulario de login incluyó una foto (captura de la cámara), la guarda temporalmente
        if ($request->hasFile('image')) {
            // Guarda la foto en storage/app/public/temp_faces/ con un nombre único
            $path = $request->file('image')->store('temp_faces', 'public');

            // Guarda la ruta de esa foto en la sesión del usuario
            // Esto permite que FaceVerificationController la recupere más tarde para comparar caras
            $request->session()->put('login_face_image', $path);
        }

        // Redirige al usuario a la página que intentaba visitar, o al dashboard si no había ninguna
        return redirect()->intended(route('dashboard', absolute: false));
    }

    // Cierra la sesión del usuario (logout)
    public function destroy(Request $request): RedirectResponse
    {
        // Cierra la sesión del guard web (autenticación por cookies/sesión)
        Auth::guard('web')->logout();

        // Invalida la sesión actual, eliminando todos los datos almacenados en ella
        $request->session()->invalidate();

        // Regenera el token CSRF para que las peticiones anteriores no sean válidas
        $request->session()->regenerateToken();

        // Redirige al usuario a la página de inicio (que a su vez redirige al login)
        return redirect('/');
    }
}