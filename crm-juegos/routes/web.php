<?php

// Importación de Controladores y dependencias de Laravel e Inertia (React)
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\GameController;
use App\Http\Controllers\FaceVerificationController;
use App\Http\Controllers\EmotionController;
use App\Http\Controllers\ChatController;

/**
 * RUTA RAÍZ
 * Redirige a cualquier usuario que entre al dominio principal directamente a la pantalla de login.
 */
Route::get('/', function () {
    return redirect()->route('login');
});

/**
 * RUTA DASHBOARD (Panel principal)
 * Accesible solo para usuarios autenticados ('auth') y con correo verificado ('verified').
 * Obtiene el catálogo de juegos publicados y los pasa al frontend (React/Inertia).
 */
Route::get('/dashboard', function () {
    // Obtiene solo los juegos marcados como publicados
    $games = \App\Models\Game::where('is_published', true)->orderBy('created_at', 'desc')->get();
    
    // Renderiza la vista React 'Dashboard.jsx' pasándole los juegos como propiedad (props)
    return Inertia::render('Dashboard', [
        'games' => $games
    ]);
})->middleware(['auth', 'verified'])->name('dashboard');

/**
 * RUTA JUGAR (Carga la pantalla de un juego)
 * Permite a un usuario jugar un juego si está autenticado.
 */
Route::get('/play/{game}', function (\App\Models\Game $game) {
    // Obtiene los nombres de los roles que tiene el usuario actual
    $userRoles = auth()->user()->roles->pluck('name')->toArray();
    
    // Verifica si es administrador o gestor (ellos pueden ver juegos no publicados)
    $canPreview = in_array('administrador', $userRoles) || in_array('gestor', $userRoles);

    // Si el juego no está publicado y el usuario no tiene permisos especiales, bloquea el acceso (HTTP 403)
    if (!$game->is_published && !$canPreview) {
        abort(403, 'No tienes permiso para ver este juego porque no está publicado.');
    }

    // Renderiza la vista React 'Games/Play.jsx'
    return Inertia::render('Games/Play', [
        'game' => $game
    ]);
})->middleware(['auth'])->name('games.play');

/**
 * GRUPO DE RUTAS AUTENTICADAS
 * Todas las rutas dentro de este grupo requieren que el usuario haya iniciado sesión.
 */
Route::middleware('auth')->group(function () {
    
    // ---------------- PERFIL DE USUARIO ----------------
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');       // Ver formulario
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');   // Actualizar datos
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy'); // Eliminar cuenta

    // ---------------- RECONOCIMIENTO FACIAL ----------------
    // Sube una foto para guardarla como foto de perfil "base" (Enrolamiento)
    Route::post('/face/enroll', [FaceVerificationController::class, 'enroll'])->name('face.enroll');
    
    // Llama al microservicio Python para comparar la cara actual con la foto base
    Route::post('/api/face/verify', [FaceVerificationController::class, 'verify'])->name('face.verify');

    // ---------------- REGISTRO DE EMOCIONES ----------------
    // Guarda en la base de datos una emoción detectada por la cámara en una sesión de juego
    Route::post('/game-sessions/{id}/emotions', [EmotionController::class, 'store'])->name('emotions.store');

    // ---------------- CHAT DEL JUEGO ----------------
    // Obtiene el historial de mensajes de la partida
    Route::get('/messages', [ChatController::class, 'index'])->name('chat.index');    
    // Envía y difunde (broadcast) un nuevo mensaje al resto de jugadores
    Route::post('/messages', [ChatController::class, 'store'])->name('chat.store');   

    // ---------------- FLUJO DEL JUEGO ----------------
    // Inicia una sesión de juego en la base de datos al arrancar el nivel
    Route::post('/games/start', function (Illuminate\Http\Request $request) {
        $game = \App\Models\Game::findOrFail($request->game_id);
        
        $session = \App\Models\GameSession::create([
            'user_id'    => auth()->id(),
            'game_id'    => $game->id,
            'started_at' => now(), // Registra la hora de inicio
        ]);
        
        // Retorna el ID de sesión generado para que React lo use después
        return response()->json([
            'session_id' => $session->id,
            'started_at' => $session->started_at,
        ]);
    })->name('games.start');

    // Termina la sesión de juego, calculando duración y guardando puntuación
    Route::post('/games/result', function (Illuminate\Http\Request $request) {
        $session = \App\Models\GameSession::findOrFail($request->session_id);
        
        // Medida de seguridad: asegura que solo el dueño de la sesión puede terminarla
        if ($session->user_id !== auth()->id()) abort(403); 
        
        $endedAt = now();
        // Calcula la diferencia en segundos entre inicio y fin
        $duration = \Carbon\Carbon::parse($session->started_at)->diffInSeconds($endedAt);
        
        $session->update([
            'ended_at'         => $endedAt,
            'duration_seconds' => $duration,
            'score'            => $request->score 
        ]);
        return response()->json(['message' => 'OK']);
    })->name('games.result');
});

/**
 * GRUPO DE RUTAS DE ADMINISTRACIÓN
 * Solo los usuarios autenticados que posean rol 'administrador' o 'gestor' pueden entrar.
 */
Route::middleware(['auth', 'role:administrador,gestor'])->group(function () {
    
    // Crea rutas estándar (index, create, store, edit, update, destroy) para gestionar el CRUD de Juegos
    Route::resource('games', GameController::class)->except(['show']);

    // Ruta especial para cambiar el estado de un juego de "Público" a "Oculto" (Toggle)
    Route::put('/games/{game}/toggle', [GameController::class, 'togglePublish'])->name('games.toggle');
});

// Importa las rutas estándar de autenticación de Laravel Breeze (Login, Register, Forgot Password, etc.)
require __DIR__.'/auth.php';