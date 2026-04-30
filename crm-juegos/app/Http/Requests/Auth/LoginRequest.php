<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    // authorize: indica que cualquier usuario (autenticado o no) puede usar este formulario
    // Devuelve true para permitir la petición siempre
    public function authorize(): bool
    {
        return true;
    }

    // rules: define las reglas de validación para los campos del formulario de login
    public function rules(): array
    {
        return [
            'email'    => ['required', 'string', 'email'],         // El email es obligatorio y debe tener formato válido
            'password' => ['required', 'string'],                  // La contraseña es obligatoria
            'image'    => ['required', 'image', 'mimes:jpeg,png,jpg', 'max:2048'], // La foto de la cámara es obligatoria
        ];
    }

    // authenticate: verifica las credenciales del usuario contra la base de datos
    public function authenticate(): void
    {
        // Comprueba primero si el usuario no ha superado el límite de intentos fallidos
        $this->ensureIsNotRateLimited();

        // Intenta autenticar con email y contraseña
        // only('email', 'password') extrae solo esos dos campos del formulario
        // boolean('remember') obtiene el valor del checkbox "Recuérdame"
        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            // Si las credenciales son incorrectas, registra el intento fallido para el rate limiting
            RateLimiter::hit($this->throttleKey());

            // Lanza una excepción de validación que vuelve al formulario con el mensaje de error
            throw ValidationException::withMessages([
                'email' => trans('auth.failed'), // Mensaje: "Las credenciales no coinciden"
            ]);
        }

        // Si el login fue exitoso, limpia el contador de intentos fallidos para este usuario/IP
        RateLimiter::clear($this->throttleKey());
    }

    // ensureIsNotRateLimited: bloquea el login si el usuario ha fallado demasiadas veces seguidas
    public function ensureIsNotRateLimited(): void
    {
        // Comprueba si no ha superado el límite de 5 intentos fallidos
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return; // Si está dentro del límite, no hace nada
        }

        // Dispara el evento Lockout para que otras partes del sistema sepan que ocurrió un bloqueo
        event(new Lockout($this));

        // Calcula cuántos segundos faltan para que se desbloquee
        $seconds = RateLimiter::availableIn($this->throttleKey());

        // Lanza una excepción con el tiempo de espera para informar al usuario
        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60), // Convierte segundos a minutos redondeando hacia arriba
            ]),
        ]);
    }

    // throttleKey: genera una clave única para identificar al usuario en el rate limiter
    // Combina el email (en minúsculas) con la IP del cliente para evitar bloqueos cruzados
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}