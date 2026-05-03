<?php

use Illuminate\Support\Facades\Broadcast;

/**
 * REGISTRO DE CANALES DE WEBSOCKETS (BROADCASTING)
 * 
 * En Laravel, las rutas de 'channels.php' definen los canales de comunicación en tiempo real
 * usando Laravel Reverb, Pusher o Redis, y autorizan quién puede escucharlos.
 */

/**
 * Canal: 'game.{session_id}'
 * Tipo: PresenceChannel (Canal de Presencia)
 * 
 * Este canal se usa en la sala de juego y el chat de una sesión. Permite saber no solo qué mensajes se mandan,
 * sino también la lista exacta de usuarios conectados en vivo (quién entra y quién sale).
 */
Broadcast::channel('game.{session_id}', function ($user, $session_id) {
    // Si el usuario está autenticado (Laravel pasa el modelo $user automáticamente)
    if ($user) {
        
        // Para canales de presencia, debemos devolver un array con la información pública
        // del usuario que será compartida con el resto de participantes del canal.
        return [
            'id'   => $user->id,
            'name' => $user->name,
        ];
    }
    
    // Si se devuelve false, el servidor de WebSockets rechaza la conexión de este usuario al canal.
    return false;
});