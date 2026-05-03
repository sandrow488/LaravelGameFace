<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

// Reglas de validación para actualizar el perfil del usuario
class ProfileUpdateRequest extends FormRequest
{
    /**
     * Define las reglas de validación que se aplican al formulario de edición de perfil.
     * Asegura que el usuario provea un nombre y un correo electrónico válido,
     * y comprueba que dicho correo no esté siendo usado ya por otra cuenta.
     */
    public function rules(): array
    {
        return [
            // Nombre: Obligatorio, texto, hasta 255 caracteres
            'name' => ['required', 'string', 'max:255'],
            
            // Email:
            'email' => [
                'required',     // Obligatorio
                'string',       // Debe ser texto
                'lowercase',    // Se convertirá a minúsculas para uniformidad
                'email',        // Debe tener formato válido (@dominio.com)
                'max:255',      // Límite de longitud en BD
                
                // Regla especial (Rule::unique): Verifica en la tabla Users que el correo no esté duplicado.
                // Sin embargo, ignoramos el ID del usuario actual ('ignore($this->user()->id)'),
                // para que el sistema le permita mantener su mismo correo sin decirle que "ya está en uso".
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }
}