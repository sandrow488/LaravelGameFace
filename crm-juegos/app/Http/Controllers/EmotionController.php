<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;
use App\Models\EmotionLog;

// Registra y almacena las emociones detectadas durante el juego
class EmotionController extends Controller
{
    /**
     * Almacena una nueva emoción en la base de datos.
     * Este método es llamado constantemente por el frontend (React) cada vez que 
     * la cámara detecta un cambio en la emoción facial del usuario.
     * 
     * @param Request $request La petición HTTP que contiene 'emotion' y 'confidence'
     * @param int $id El ID de la sesión de juego activa
     */
    public function store(Request $request, $id)
    {
        // 1. Validación: Asegura que lleguen los datos correctos y en el formato esperado
        $request->validate([
            'emotion'    => 'required|string',   // Nombre de la emoción (happy, sad, etc)
            'confidence' => 'required|numeric'   // Nivel de confianza de la IA (ej: 0.98)
        ]);

        // 2. Busca la sesión de juego en la base de datos. 
        // Si no existe, lanza un error 404 automáticamente gracias a findOrFail
        $session = GameSession::findOrFail($id);

        // 3. Capa de Seguridad: Verifica que el usuario que hace la petición 
        // es el mismo que inició la sesión de juego. Previene inyección de datos cruzada.
        if ($session->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado para esta sesión de juego'], 403);
        }

        // 4. Crea el registro (Log) de la emoción en la tabla 'emotion_logs'
        EmotionLog::create([
            'game_session_id' => $session->id,      
            'emotion'         => $request->emotion,  
            'confidence'      => $request->confidence, 
        ]);

        // 5. Retorna una respuesta exitosa (código HTTP 201: Creado) al frontend
        return response()->json(['message' => 'Emoción registrada correctamente'], 201);
    }
}