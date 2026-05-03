<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatMessage;
use App\Events\GameMessageSent; 

// Gestiona el envío y lectura de mensajes del chat en tiempo real
class ChatController extends Controller
{
    /**
     * Obtiene todos los mensajes de una sesión de juego específica.
     * Se usa cuando un usuario entra a la sala para cargar el historial de chat.
     */
    public function index(Request $request)
    {
        // Valida que el ID de sesión de juego proporciando realmente exista en la DB
        $request->validate(['game_session_id' => 'required|exists:game_sessions,id']);

        // Realiza una consulta a la base de datos:
        // - where: Busca mensajes de esta sesión
        // - with('user'): Trae también los datos del autor del mensaje (Eager Loading) para evitar N+1 query problem
        // - oldest: Los ordena cronológicamente (el más viejo primero)
        return response()->json(
            ChatMessage::where('game_session_id', $request->game_session_id)
                ->with('user')  
                ->oldest()      
                ->get()
        );
    }

    /**
     * Recibe un mensaje nuevo del usuario, lo guarda y lo difunde a todos los demás.
     */
    public function store(Request $request)
    {
        // 1. Validación estricta del mensaje recibido
        $request->validate([
            'game_session_id' => 'required|exists:game_sessions,id',
            'message'         => 'required|string|max:1000' // Límite de 1000 caracteres para evitar spam
        ]);

        // 2. Guarda el mensaje en la base de datos
        $message = ChatMessage::create([
            'game_session_id' => $request->game_session_id,
            'user_id'         => auth()->id(), // El ID del usuario que tiene sesión iniciada
            'message'         => strip_tags($request->message), // Sanitiza HTML para prevenir ataques XSS
        ]);

        // 3. BROADCASTING (Magia del tiempo real):
        // Lanza un evento que es interceptado por RabbitMQ/Reverb. 
        // toOthers() hace que el mensaje le llegue a todos en la sala EXCEPTO al que lo envió (porque él ya lo tiene).
        broadcast(new GameMessageSent($message))->toOthers();

        // 4. Devuelve el mensaje creado al autor para que lo renderice en su propia pantalla
        return response()->json([
            'status'  => 'Mensaje enviado exitosamente',
            'message' => $message->load('user') // Carga los datos del usuario antes de enviarlo
        ], 200);
    }
}