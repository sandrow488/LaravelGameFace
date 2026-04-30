<?php

use Illuminate\Support\Facades\Broadcast;

// Define los canales de WebSocket y su lógica de autorización
// Un canal de presencia permite saber qué usuarios están conectados

// Canal 'game.{session_id}': canal específico para cada sesión de juego
// La autorización se comprueba cuando el frontend intenta unirse al canal
Broadcast::channel('game.{session_id}', function ($user, $session_id) {
    // $user: el usuario que intenta unirse al canal (Laravel lo inyecta automáticamente)
    // $session_id: el ID de la sesión de juego (viene del nombre del canal)

    if ($user) {
        // Si el usuario está autenticado, le permite unirse al canal
        // Devuelve sus datos para que otros puedan saber quién está conectado
        return [
            'id'   => $user->id,
            'name' => $user->name,
        ];
    }
    // Si no está autenticado, devuelve false para bloquear el acceso al canal
    return false;
});