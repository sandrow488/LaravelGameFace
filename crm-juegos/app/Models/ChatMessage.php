<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo ChatMessage
 * 
 * Representa un mensaje individual enviado por un usuario dentro del chat de una sesión de juego.
 */
class ChatMessage extends Model
{
    use HasFactory;

    // Solo estos campos pueden ser llenados de forma masiva
    protected $fillable = [
        'game_session_id', // ID de la sesión a la que pertenece el chat
        'user_id',         // ID del usuario que envió el mensaje
        'message'          // Contenido de texto del mensaje
    ];

    /**
     * Relación: Un mensaje pertenece a un Usuario (autor).
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación: Un mensaje se envió dentro del contexto de una Sesión de Juego específica.
     */
    public function gameSession()
    {
        return $this->belongsTo(GameSession::class);
    }
}