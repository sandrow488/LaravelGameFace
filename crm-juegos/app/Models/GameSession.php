<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Modelo GameSession
 * 
 * Representa una partida individual que un usuario ha jugado en un juego específico.
 * Guarda todo el ciclo de vida de la partida desde que inicia hasta que termina, y la puntuación.
 */
class GameSession extends Model
{
    use HasFactory;

    // Campos que se pueden insertar o actualizar directamente desde la base de datos
    protected $fillable = [
        'user_id',          // ID del usuario que jugó
        'game_id',          // ID del juego que se jugó
        'started_at',       // Fecha y hora exacta de inicio de la partida
        'ended_at',         // Fecha y hora exacta de fin de la partida
        'duration_seconds', // Duración total en segundos (calculado al terminar)
        'score',            // Puntuación o métrica final lograda en la partida
    ];

    /**
     * Conversión automática de campos de base de datos a objetos de fecha (Carbon).
     */
    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    /**
     * Relación Inversa: Esta sesión pertenece a un único Usuario.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relación Inversa: Esta sesión se jugó en un único Juego.
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }
}