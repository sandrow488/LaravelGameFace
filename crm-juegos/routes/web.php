<?php

// Importaciones de clases necesarias para las rutas
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\GameController;
use App\Http\Controllers\FaceVerificationController;
use App\Http\Controllers\EmotionController;
use App\Http\Controllers\ChatController;

// Ruta raíz: redirige automáticamente al login (no hay página de inicio pública)
Route::get('/', function () {
    return redirect()->route('login');
});

// Dashboard: página principal tras el login, muestra los juegos publicados
// Middleware 'auth' exige que el usuario esté autenticado
// Middleware 'verified' exige que el email esté verificado
Route::get('/dashboard', function () {
    // Solo carga los juegos con is_published=true, ordenados del más nuevo al más antiguo
    $games = \App\Models\Game::where('is_published', true)->orderBy('created_at', 'desc')->get();
    return Inertia::render('Dashboard', [
        'games' => $games
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

// Ruta para entrar a jugar: carga la pantalla Play.jsx con los datos del juego
// {game} es un parámetro de ruta con Route Model Binding (Laravel busca automáticamente el juego por ID)
Route::get('/play/{game}', function (\App\Models\Game $game) {
    $userRoles = auth()->user()->roles->pluck('name')->toArray();
    // Los administradores y gestores pueden ver previsualizaciones de juegos no publicados
    $canPreview = in_array('administrador', $userRoles) || in_array('gestor', $userRoles);

    // Si el juego no está publicado y el usuario no tiene permiso de previsualización, bloquea el acceso
    if (!$game->is_published && !$canPreview) {
        abort(403, 'No tienes permiso para ver este juego porque no está publicado.');
    }

    // Pasa los datos del juego al componente React
    return Inertia::render('Games/Play', [
        'game' => $game
    ]);
})->middleware(['auth'])->name('games.play');

// Grupo de rutas que requieren autenticación
Route::middleware('auth')->group(function () {
    // Rutas del perfil de usuario (ver, editar, eliminar cuenta)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Ruta para guardar la foto facial desde el formulario del perfil
    Route::post('/face/enroll', [FaceVerificationController::class, 'enroll'])->name('face.enroll');

    // Ruta para verificar la identidad antes de entrar al juego (llamada desde Play.jsx)
    Route::post('/api/face/verify', [FaceVerificationController::class, 'verify'])->name('face.verify');

    // Ruta para que EmotionOverlay envíe las emociones detectadas durante el juego
    Route::post('/game-sessions/{id}/emotions', [EmotionController::class, 'store'])->name('emotions.store');

    // Rutas del chat en tiempo real del juego
    Route::get('/messages', [ChatController::class, 'index'])->name('chat.index');    // Historial de mensajes
    Route::post('/messages', [ChatController::class, 'store'])->name('chat.store');   // Enviar mensaje

    // Ruta para iniciar una sesión de juego (tras pasar la verificación facial)
    // Crea un registro en game_sessions con el tiempo de inicio
    Route::post('/games/start', function (Illuminate\Http\Request $request) {
        $game = \App\Models\Game::findOrFail($request->game_id);
        $session = \App\Models\GameSession::create([
            'user_id'    => auth()->id(),
            'game_id'    => $game->id,
            'started_at' => now(), // Marca el tiempo de inicio
        ]);
        return response()->json([
            'session_id' => $session->id,
            'started_at' => $session->started_at,
        ]);
    })->name('games.start');

    // Ruta para registrar el resultado final de la sesión de juego
    Route::post('/games/result', function (Illuminate\Http\Request $request) {
        $session = \App\Models\GameSession::findOrFail($request->session_id);
        if ($session->user_id !== auth()->id()) abort(403); // Verifica que la sesión pertenece al usuario
        $endedAt = now();
        // Calcula la duración en segundos restando el inicio del fin
        $duration = \Carbon\Carbon::parse($session->started_at)->diffInSeconds($endedAt);
        $session->update([
            'ended_at'         => $endedAt,
            'duration_seconds' => $duration,
            'score'            => $request->score // Puntuación enviada por el juego
        ]);
        return response()->json(['message' => 'OK']);
    })->name('games.result');
});

// Rutas exclusivas para administradores y gestores (CRUD de juegos)
Route::middleware(['auth', 'role:administrador,gestor'])->group(function () {
    // Resource crea automáticamente: index, create, store, edit, update, destroy
    // except(['show']) excluye la ruta de vista individual (no la usamos)
    Route::resource('games', GameController::class)->except(['show']);

    // Ruta para publicar/despublicar un juego (toggle)
    Route::put('/games/{game}/toggle', [GameController::class, 'togglePublish'])->name('games.toggle');
});

// Incluye las rutas de autenticación generadas por Laravel Breeze (login, registro, etc.)
require __DIR__.'/auth.php';