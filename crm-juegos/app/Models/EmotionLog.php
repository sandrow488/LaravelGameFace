<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Modelo EmotionLog
 * 
 * Registra cada emoción individual que la webcam detecta en el rostro del usuario 
 * durante el transcurso de una sesión de juego (por ejemplo, felicidad, sorpresa, neutralidad).
 */
class EmotionLog extends Model
{
    use HasFactory;

    // Campos permitidos para inserción masiva
    protected $fillable = [
        'game_session_id', // La sesión en la que se detectó la emoción
        'emotion',         // El nombre de la emoción detectada en texto (ej. "happy")
        'confidence',      // El nivel de certeza de la IA sobre esta emoción (ej. 0.95 = 95%)
    ];

    /**
     * Relación: Esta emoción fue capturada durante una Sesión de Juego en específico.
     * (A través de la sesión de juego se puede rastrear a qué usuario pertenece).
     */
    public function gameSession()
    {
        return $this->belongsTo(GameSession::class);
    }
}