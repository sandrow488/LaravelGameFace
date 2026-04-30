<?php

namespace App\Http\Controllers;

use App\Models\Game;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GameController extends Controller
{
    
    public function index()
    {
        
        
        $games = Game::with('user:id,name')->latest()->get();
        return Inertia::render('Games/Index', [
            'games' => $games
        ]);
    }

    
    public function create()
    {
        return Inertia::render('Games/Create');
    }

    
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url_path' => 'required|string|max:255',
            'is_published' => 'boolean',
        ]);

        
        $validated['user_id'] = $request->user()->id;

        Game::create($validated);

        return redirect()->route('games.index')->with('success', 'Juego creado correctamente.');
    }

    
    public function edit(Game $game)
    {
        return Inertia::render('Games/Edit', [
            'game' => $game
        ]);
    }

    
    public function update(Request $request, Game $game)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'url_path' => 'required|string|max:255',
            'is_published' => 'boolean',
        ]);

        $game->update($validated);

        return redirect()->route('games.index')->with('success', 'Juego actualizado correctamente.');
    }

    
    
    public function destroy(Game $game)
    {
        $game->delete();
        return redirect()->route('games.index')->with('success', 'Juego eliminado correctamente.');
    }

    
    public function togglePublish(Game $game)
    {
        $game->is_published = !$game->is_published;
        $game->save();
        
        $estado = $game->is_published ? 'publicado' : 'oculto';
        return redirect()->route('games.index')->with('success', "El juego ahora está $estado.");
    }
}