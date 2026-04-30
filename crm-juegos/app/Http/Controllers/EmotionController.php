<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;
use App\Models\EmotionLog;

class EmotionController extends Controller
{
    // store: recibe y guarda en BD una emoción detectada durante una sesión de juego activa
    public function store(Request $request, $id)
    {
        // Valida que se hayan enviado los datos correctos
        $request->validate([
            'emotion'    => 'required|string',   // Nombre de la emoción en inglés (happy, sad, etc.)
            'confidence' => 'required|numeric'   // Nivel de confianza de la detección (0 a 1)
        ]);

        // Busca la sesión de juego por su ID o devuelve error 404 si no existe
        $session = GameSession::findOrFail($id);

        // Comprueba que la sesión pertenece al usuario autenticado que hace la petición
        // Esto evita que un usuario pueda falsear emociones en la sesión de otro
        if ($session->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado para esta sesión de juego'], 403);
        }

        // Crea el registro de emoción en la tabla emotion_logs asociado a esta sesión
        EmotionLog::create([
            'game_session_id' => $session->id,      // Qué sesión de juego
            'emotion'         => $request->emotion,  // Qué emoción se detectó
            'confidence'      => $request->confidence, // Con qué certeza (0-1)
        ]);

        // Devuelve éxito con código 201 (Created: recurso creado correctamente)
        return response()->json(['message' => 'Emoción registrada correctamente'], 201);
    }
}