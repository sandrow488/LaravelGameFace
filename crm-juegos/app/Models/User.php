<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable; // Clase base de Laravel para usuarios autenticables
use Illuminate\Notifications\Notifiable;                // Permite enviar notificaciones al usuario
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    // Traits: añaden funcionalidades extra al modelo sin necesidad de heredarlas
    // HasFactory permite crear usuarios falsos en los tests con User::factory()
    // Notifiable permite enviar emails y notificaciones push al usuario
    use HasFactory, Notifiable;

    // $fillable: lista blanca de campos que se pueden rellenar masivamente (ej: User::create([...]))
    // Sin esta lista, Laravel rechaza la asignación masiva por seguridad
    protected $fillable = [
        'name',            // Nombre del usuario
        'email',           // Email (único, usado para el login)
        'password',        // Contraseña (se guarda encriptada gracias al cast de abajo)
        'face_image_path', // Ruta de la foto facial del perfil (campo personalizado añadido al proyecto)
    ];

    // $hidden: campos que se ocultan automáticamente cuando el modelo se convierte a JSON o array
    // Esto evita que la contraseña o el token de "recuérdame" aparezcan en las respuestas de la API
    protected $hidden = [
        'password',
        'remember_token',
    ];

    // casts: define cómo Laravel transforma los valores al leerlos de la base de datos
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime', // Convierte el timestamp a un objeto Carbon (fecha/hora)
            'password'          => 'hashed',   // Encripta automáticamente la contraseña al guardarla
        ];
    }

    // Relación muchos a muchos con roles: un usuario puede tener varios roles y un rol muchos usuarios
    // Se gestiona a través de una tabla pivot 'role_user' en la base de datos
    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    // Relación uno a muchos con juegos: un usuario puede haber creado varios juegos
    public function games()
    {
        return $this->hasMany(Game::class);
    }

    // Relación uno a muchos con sesiones de juego: un usuario puede tener muchas sesiones de juego registradas
    public function gameSessions(): HasMany
    {
        return $this->hasMany(GameSession::class);
    }
}