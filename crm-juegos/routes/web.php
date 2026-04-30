<?php

use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\GameController;
use App\Http\Controllers\FaceVerificationController;
use App\Http\Controllers\EmotionController;
use App\Http\Controllers\ChatController;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    $games = \App\Models\Game::where('is_published', true)->orderBy('created_at', 'desc')->get();
    return Inertia::render('Dashboard', [
        'games' => $games
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('/play/{game}', function (\App\Models\Game $game) {
    $userRoles = auth()->user()->roles->pluck('name')->toArray();
    $canPreview = in_array('administrador', $userRoles) || in_array('gestor', $userRoles);
    
    
    if (!$game->is_published && !$canPreview) {
        abort(403, 'No tienes permiso para ver este juego porque no está publicado.');
    }

    return Inertia::render('Games/Play', [
        'game' => $game
    ]);
})->middleware(['auth'])->name('games.play');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

     
     Route::post('/face/enroll', [FaceVerificationController::class, 'enroll'])->name('face.enroll');
     Route::post('/api/face/verify', [FaceVerificationController::class, 'verify'])->name('face.verify');
    Route::post('/game-sessions/{id}/emotions', [EmotionController::class, 'store'])->name('emotions.store');
    Route::get('/messages', [ChatController::class, 'index'])->name('chat.index');
    Route::post('/messages', [ChatController::class, 'store'])->name('chat.store');

    
    Route::post('/games/start', function (Illuminate\Http\Request $request) {
        $game = \App\Models\Game::findOrFail($request->game_id);
        $session = \App\Models\GameSession::create([
            'user_id' => auth()->id(),
            'game_id' => $game->id,
            'started_at' => now(),
        ]);
        return response()->json([
            'session_id' => $session->id,
            'started_at' => $session->started_at,
        ]);
    })->name('games.start');

    Route::post('/games/result', function (Illuminate\Http\Request $request) {
        $session = \App\Models\GameSession::findOrFail($request->session_id);
        if ($session->user_id !== auth()->id()) abort(403);
        $endedAt = now();
        $duration = \Carbon\Carbon::parse($session->started_at)->diffInSeconds($endedAt);
        $session->update([
            'ended_at' => $endedAt,
            'duration_seconds' => $duration,
            'score' => $request->score
        ]);
        return response()->json(['message' => 'OK']);
    })->name('games.result');
});

Route::middleware(['auth', 'role:administrador,gestor'])->group(function () {
    Route::resource('games', GameController::class)->except(['show']);
    Route::put('/games/{game}/toggle', [GameController::class, 'togglePublish'])->name('games.toggle');
});

require __DIR__.'/auth.php';