<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    // handle: método principal del middleware, se ejecuta antes de que la petición llegue al controlador
    // $roles: lista variable de roles permitidos (ej: 'administrador', 'gestor')
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        // Si el usuario no está autenticado, lo redirige al login
        if (! $request->user()) {
            return redirect('login');
        }

        // Obtiene todos los roles del usuario desde la base de datos como array de strings
        // Ejemplo: ['administrador', 'jugador']
        $userRoles = $request->user()->roles->pluck('name')->toArray();

        // Comprueba si el usuario tiene al menos uno de los roles requeridos
        $hasRole = false;
        foreach ($roles as $role) {
            if (in_array($role, $userRoles)) {
                $hasRole = true;
                break; // En cuanto encuentra un rol válido, no necesita seguir comprobando
            }
        }

        // Si el usuario no tiene ninguno de los roles requeridos, bloquea el acceso con error 403
        if (!$hasRole) {
            abort(403, 'No tienes permiso para acceder a esta área (requiere rol: ' . implode(' o ', $roles) . ').');
        }

        // Si tiene el rol correcto, deja pasar la petición hacia el controlador
        return $next($request);
    }
}