<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatMessage;
use App\Events\GameMessageSent; // Evento que se dispara para notificar a los demás usuarios por WebSocket

class ChatController extends Controller
{
    // index: devuelve el historial de mensajes de una sesión de juego específica
    public function index(Request $request)
    {
        // Valida que se haya enviado el ID de la sesión y que exista en la BD
        $request->validate(['game_session_id' => 'required|exists:game_sessions,id']);

        // Busca todos los mensajes de esa sesión, carga el usuario de cada mensaje, y los ordena del más antiguo al más nuevo
        return response()->json(
            ChatMessage::where('game_session_id', $request->game_session_id)
                ->with('user')  // Eager loading: carga el usuario en una sola consulta adicional (evita N+1)
                ->oldest()      // ORDER BY created_at ASC (del primero al último)
                ->get()
        );
    }

    // store: guarda un nuevo mensaje y lo emite por WebSocket a los demás usuarios del chat
    public function store(Request $request)
    {
        // Valida que el mensaje no esté vacío y que pertenezca a una sesión existente
        $request->validate([
            'game_session_id' => 'required|exists:game_sessions,id',
            'message'         => 'required|string|max:1000' // Máximo 1000 caracteres por mensaje
        ]);

        // Guarda el mensaje en la base de datos
        $message = ChatMessage::create([
            'game_session_id' => $request->game_session_id,
            'user_id'         => auth()->id(),                   // ID del usuario autenticado que envía el mensaje
            'message'         => strip_tags($request->message),  // strip_tags elimina HTML malicioso (seguridad XSS)
        ]);

        // Emite el evento por WebSocket a todos los demás usuarios conectados al canal del juego
        // toOthers() excluye al remitente (él ya lo ve en su pantalla inmediatamente)
        broadcast(new GameMessageSent($message))->toOthers();

        // Devuelve el mensaje guardado con los datos del usuario incluidos (para mostrar en pantalla)
        return response()->json([
            'status'  => 'Mensaje enviado exitosamente',
            'message' => $message->load('user') // Carga la relación 'user' en el mensaje recién creado
        ], 200);
    }
}