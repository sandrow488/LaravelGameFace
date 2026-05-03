<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; 
use Illuminate\Notifications\Notifiable;                
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Modelo User
 * 
 * Representa a los usuarios registrados en el sistema.
 * Extiende de Authenticatable para heredar toda la funcionalidad de login y seguridad de Laravel.
 */
class User extends Authenticatable
{
    // Traits que añaden funcionalidades: factorías para testing y Notifiable para correos/notificaciones
    use HasFactory, Notifiable;

    /**
     * Los atributos que se pueden asignar de manera masiva (Mass Assignment).
     * Evita que usuarios malintencionados inyecten campos como 'is_admin' en un formulario.
     */
    protected $fillable = [
        'name',            // Nombre completo del usuario
        'email',           // Correo electrónico para el login
        'password',        // Contraseña encriptada
        'face_image_path', // Ruta de la foto del rostro usada para reconocimiento facial (en storage)
    ];

    /**
     * Los atributos que deben ocultarse cuando el modelo se convierte a un Array o JSON.
     * Esto previene que datos sensibles se envíen accidentalmente al frontend (React).
     */
    protected $hidden = [
        'password',
        'remember_token', // Token para la funcionalidad de "Recordarme" en el login
    ];

    /**
     * Define cómo deben transformarse (castearse) ciertos atributos cuando se acceden.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime', // Convierte la fecha a objeto Carbon
            'password'          => 'hashed',   // Asegura que la contraseña siempre se encripte al guardarla
        ];
    }

    /**
     * Relación Muchos a Muchos: Un usuario puede tener varios roles (ej: gestor, jugador).
     */
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    /**
     * Relación Uno a Muchos: Un usuario (si tiene permisos) puede haber creado varios juegos.
     */
    public function games()
    {
        return $this->hasMany(Game::class);
    }

    /**
     * Relación Uno a Muchos: Un usuario tiene un historial de muchas sesiones de juego jugadas.
     */
    public function gameSessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }
}