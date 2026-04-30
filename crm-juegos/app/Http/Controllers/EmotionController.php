<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\GameSession;
use App\Models\EmotionLog;

class EmotionController extends Controller
{
    public function store(Request $request, $id)
    {
        $request->validate([
            'emotion' => 'required|string',
            'confidence' => 'required|numeric'
        ]);

        $session = GameSession::findOrFail($id);

        
        if ($session->user_id !== $request->user()->id) {
            return response()->json(['error' => 'No autorizado para esta sesión de juego'], 403);
        }

        EmotionLog::create([
            'game_session_id' => $session->id,
            'emotion' => $request->emotion,
            'confidence' => $request->confidence,
        ]);

        return response()->json(['message' => 'Emoción registrada correctamente'], 201);
    }
}