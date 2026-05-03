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

// Maneja el login/logout y captura la foto facial inicial en sesión
class AuthenticatedSessionController extends Controller
{
    /**
     * Muestra la vista de inicio de sesión (Login).
     * Renderiza el componente React 'Auth/Login.jsx' usando Inertia.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            // Pasa como propiedad si la funcionalidad de restaurar contraseña está activada
            'canResetPassword' => Route::has('password.request'),
            // Pasa cualquier mensaje de estado flash (ej. "Contraseña restablecida con éxito")
            'status' => session('status'),
        ]);
    }

    /**
     * Procesa el intento de inicio de sesión.
     * En esta aplicación, además del email y contraseña, se captura una foto de la webcam del usuario.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        // 1. Autentica al usuario usando email y contraseña (validado en LoginRequest)
        // Si falla, lanza un error y vuelve al formulario. Si pasa, el usuario inicia sesión.
        $request->authenticate();

        // 2. Regenera el ID de la sesión para prevenir ataques de Session Fixation
        $request->session()->regenerate();

        // 3. CAPTURA DE FOTOGRAFÍA INICIAL (LOGIN)
        // Si el formulario de login incluyó el archivo 'image' (capturado por la webcam en el frontend)
        if ($request->hasFile('image')) {
            // Guarda la imagen temporalmente en la carpeta 'temp_faces'
            $path = $request->file('image')->store('temp_faces', 'public');

            // Guarda LA RUTA de esta imagen en la variable de sesión 'login_face_image'.
            // Esta ruta será usada más adelante (en FaceVerificationController) para comprobar 
            // que la persona jugando es la misma que inició sesión.
            $request->session()->put('login_face_image', $path);
        }

        // 4. Redirige al usuario al Dashboard o a la URL que intentaba visitar antes del login
        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destruye la sesión autenticada (Logout).
     */
    public function destroy(Request $request): RedirectResponse
    {
        // Cierra la sesión en el "guard" por defecto (web)
        Auth::guard('web')->logout();

        // Invalida la sesión actual en el servidor (elimina todas las variables guardadas, incluyendo 'login_face_image')
        $request->session()->invalidate();

        // Genera un nuevo token CSRF por seguridad
        $request->session()->regenerateToken();

        // Redirige a la pantalla principal
        return redirect('/');
    }
}