<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ChatMessage;
use App\Events\GameMessageSent; 

// Gestiona el envío y lectura de mensajes del chat en tiempo real
class ChatController extends Controller
{
    
    public function index(Request $request)
    {
        
        $request->validate(['game_session_id' => 'required|exists:game_sessions,id']);

        
        return response()->json(
            ChatMessage::where('game_session_id', $request->game_session_id)
                ->with('user')  
                ->oldest()      
                ->get()
        );
    }

    
    public function store(Request $request)
    {
        
        $request->validate([
            'game_session_id' => 'required|exists:game_sessions,id',
            'message'         => 'required|string|max:1000' 
        ]);

        
        $message = ChatMessage::create([
            'game_session_id' => $request->game_session_id,
            'user_id'         => auth()->id(),                   
            'message'         => strip_tags($request->message),  
        ]);

        
        
        broadcast(new GameMessageSent($message))->toOthers();

        
        return response()->json([
            'status'  => 'Mensaje enviado exitosamente',
            'message' => $message->load('user') 
        ], 200);
    }
}