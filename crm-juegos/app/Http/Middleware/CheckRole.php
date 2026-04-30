<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    
    public function handle(Request $request, Closure $next, ...$roles): Response
    {
        if (! $request->user()) {
            return redirect('login');
        }

        
        $userRoles = $request->user()->roles->pluck('name')->toArray();

        
        $hasRole = false;
        foreach ($roles as $role) {
            if (in_array($role, $userRoles)) {
                $hasRole = true;
                break;
            }
        }

        if (!$hasRole) {
            abort(403, 'No tienes permiso para acceder a esta área (requiere rol: ' . implode(' o ', $roles) . ').');
        }

        return $next($request);
    }
}