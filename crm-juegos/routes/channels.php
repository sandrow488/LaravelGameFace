<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('game.{session_id}', function ($user, $session_id) {
    if ($user) {
        // En una aplicación estricta, aquí validaríamos que $user->id 
        // pertenezca los jugadores autorizados en la sesión $session_id.
        return [
            'id' => $user->id,
            'name' => $user->name,
        ];
    }
    return false;
});
