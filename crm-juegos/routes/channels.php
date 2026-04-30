<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('game.{session_id}', function ($user, $session_id) {
    if ($user) {
        
        
        return [
            'id' => $user->id,
            'name' => $user->name,
        ];
    }
    return false;
});