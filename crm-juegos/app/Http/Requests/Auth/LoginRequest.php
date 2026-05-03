<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Petición de Validación (FormRequest) para el inicio de sesión.
 * Separa la lógica de validación de campos del controlador.
 */
class LoginRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado a hacer esta petición.
     * Siempre retorna true porque cualquier visitante puede intentar iniciar sesión.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación que deben cumplir los datos que envía el frontend en el formulario de Login.
     */
    public function rules(): array
    {
        return [
            // El email es obligatorio, debe ser texto y con formato válido (usuario@dominio.com)
            'email'    => ['required', 'string', 'email'],         
            // La contraseña es obligatoria
            'password' => ['required', 'string'],                  
            // REQUISITO PERSONALIZADO: Es obligatoria una imagen de la webcam (max 2MB)
            'image'    => ['required', 'image', 'mimes:jpeg,png,jpg', 'max:2048'], 
        ];
    }

    /**
     * Intenta autenticar al usuario usando las credenciales proporcionadas.
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        // 1. Asegura que el usuario no está intentando adivinar contraseñas (fuerza bruta).
        // Si excede los intentos, lanza una excepción que detiene el flujo.
        $this->ensureIsNotRateLimited();

        // 2. Intenta hacer login verificando en la BD el email y password, y considerando si marcó "Recordarme"
        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            
            // Si las credenciales están mal, suma un "hit" (intento fallido) al contador del RateLimiter
            RateLimiter::hit($this->throttleKey());

            // Lanza el error de validación para decirle al usuario que los datos son incorrectos
            throw ValidationException::withMessages([
                'email' => trans('auth.failed'), 
            ]);
        }

        // 3. Si el login es exitoso, limpia (reinicia) el contador de intentos fallidos
        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Asegura que el usuario no exceda el límite de intentos permitidos de login.
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        // Si no ha sobrepasado los 5 intentos, continúa normalmente
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return; 
        }

        // Lanza un evento de bloqueo para que otras partes del sistema lo registren (opcional)
        event(new Lockout($this));

        // Calcula cuántos segundos faltan para poder volver a intentar
        $seconds = RateLimiter::availableIn($this->throttleKey());

        // Informa al usuario del bloqueo (ej: "Demasiados intentos. Intente de nuevo en 30 segundos")
        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60), 
            ]),
        ]);
    }

    /**
     * Genera la llave única para el limitador de intentos (Rate Limiter).
     * Crea un string combinando el email y la dirección IP del usuario (ej: "juan@mail.com|192.168.1.5").
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}