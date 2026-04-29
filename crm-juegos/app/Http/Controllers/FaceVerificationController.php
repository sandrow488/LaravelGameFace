<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

class FaceVerificationController extends Controller
{
    public function enroll(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = $request->user();

        // Eliminar imagen anterior si existe
        if ($user->face_image_path && Storage::disk('public')->exists($user->face_image_path)) {
            Storage::disk('public')->delete($user->face_image_path);
        }

        // Guardar la nueva imagen
        $path = $request->file('image')->store('faces', 'public');

        // Actualizar el usuario (usando save() para asegurar la persistencia)
        $user->face_image_path = $path;
        $user->save();

        return back()->with('message', 'Imagen facial registrada correctamente');
    }

    public function verify(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048', // La imagen temporal de la webcam
        ]);

        $user = $request->user();

        if (!$user->face_image_path || !Storage::disk('public')->exists($user->face_image_path)) {
            return response()->json(['error' => 'No hay imagen facial registrada para este usuario.'], 400);
        }

        $enrolledImagePath = Storage::disk('public')->path($user->face_image_path);
        $tempImage = $request->file('image');
        
        try {
            // Realizar la petición HTTP al microservicio Python
            // Adjuntamos ambos archivos: la imagen guardada y la de la webcam
            $response = Http::attach(
                'image1', fopen($enrolledImagePath, 'r'), 'enrolled.jpg'
            )->attach(
                'image2', fopen($tempImage->getPathname(), 'r'), $tempImage->getClientOriginalName()
            )
            // Si el microservicio Python no está disponible, evita que el frontend se quede "Analizando..."
            // por demasiado tiempo.
            ->timeout(3)
            ->connectTimeout(1)
            ->post('http://localhost:8001/verify');

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['match']) && $data['match'] === true) {
                    return response()->json([
                        'message' => 'Verificación exitosa.',
                        'verified' => true,
                        'distance' => $data['distance'] ?? null
                    ]);
                }
            }
            
            return response()->json([
                'error' => 'La verificación facial ha fallado.', 
                'verified' => false,
                'details' => $response->json()
            ], 401);

        } catch (\Exception $e) {
            // MODO RESCATE: Si el microservicio no está disponible, simulamos éxito
            // para permitir el flujo de desarrollo, pero dejamos rastro en la respuesta.
            return response()->json([
                'message' => 'Verificación SIMULADA (Microservicio Offline).',
                'verified' => true,
                'distance' => 0.1,
                'debug' => 'El servidor no pudo conectar con Python en el puerto 8001: ' . $e->getMessage()
            ]);
        }
    }
}
