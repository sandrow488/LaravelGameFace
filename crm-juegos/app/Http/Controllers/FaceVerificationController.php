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

        $loginFacePath = $request->session()->get('login_face_image');

        if (!$loginFacePath || !Storage::disk('public')->exists($loginFacePath)) {
            return response()->json(['error' => 'No se capturó tu rostro durante el inicio de sesión. Por favor, vuelve a iniciar sesión.'], 400);
        }

        $enrolledImagePath = Storage::disk('public')->path($loginFacePath);
        $tempImage = $request->file('image');
        
        try {
            $response = Http::attach(
                'image1', fopen($enrolledImagePath, 'r'), 'enrolled.jpg'
            )->attach(
                'image2', fopen($tempImage->getPathname(), 'r'), $tempImage->getClientOriginalName()
            )
            ->timeout(10) // Aumentamos el timeout para DeepFace
            ->connectTimeout(2)
            ->post(config('services.facial.url') . '/verify');

            if ($response->successful()) {
                $data = $response->json();
                
                if (isset($data['match']) && $data['match'] === true) {
                    \Log::info('Verificación facial exitosa para usuario: ' . $request->user()->id, ['distance' => $data['distance'] ?? 'n/a']);
                    return response()->json([
                        'message' => 'Verificación exitosa.',
                        'verified' => true,
                        'distance' => $data['distance'] ?? null
                    ]);
                }
                
                \Log::warning('Verificación facial fallida (No coinciden) para usuario: ' . $request->user()->id, ['data' => $data]);
            } else {
                \Log::error('Error en microservicio facial', ['status' => $response->status(), 'body' => $response->body()]);
            }
            
            return response()->json([
                'error' => 'La verificación facial ha fallado. Asegúrate de que tu rostro sea visible y coincida con tu foto de registro.', 
                'verified' => false,
                'details' => $response->json()
            ], 401);

        } catch (\Exception $e) {
            \Log::error('Fallo crítico en conexión con microservicio facial: ' . $e->getMessage());
            return response()->json([
                'error' => 'El servicio de verificación facial no está disponible en este momento.',
                'verified' => false,
                'debug' => $e->getMessage()
            ], 503);
        }
    }
}
