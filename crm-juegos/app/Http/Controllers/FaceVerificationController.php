<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

class FaceVerificationController extends Controller
{
    // Registro: guarda la foto facial del usuario en su perfil
    public function enroll(Request $request)
    {
        // Valida que se haya enviado una imagen válida (jpeg, png o jpg, máximo 2MB)
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        // Obtiene el usuario autenticado que hace la petición
        $user = $request->user();

        // Si el usuario ya tenía una foto facial guardada, la elimina del disco antes de guardar la nueva
        if ($user->face_image_path && Storage::disk('public')->exists($user->face_image_path)) {
            Storage::disk('public')->delete($user->face_image_path);
        }

        // Guarda la nueva imagen en la carpeta 'faces' dentro del disco público (storage/app/public/faces/)
        $path = $request->file('image')->store('faces', 'public');

        // Actualiza el campo face_image_path del usuario en la base de datos con la nueva ruta
        $user->face_image_path = $path;
        $user->save();

        // Redirige de vuelta al perfil con un mensaje de éxito
        return back()->with('message', 'Imagen facial registrada correctamente');
    }

    // Verificación: compara la cara del login con la cara actual antes de entrar al juego
    public function verify(Request $request)
    {
        // Valida que se haya enviado una imagen válida con la petición
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        // Recupera de la sesión la ruta de la foto que se capturó cuando el usuario hizo login
        // Esta foto se guardó en AuthenticatedSessionController cuando el usuario inició sesión
        $loginFacePath = $request->session()->get('login_face_image');

        // Si no existe la foto del login en la sesión, significa que el usuario no pasó por el login correctamente
        // Devuelve un error 400 (Bad Request) para que el usuario vuelva a iniciar sesión
        if (!$loginFacePath || !Storage::disk('public')->exists($loginFacePath)) {
            return response()->json(['error' => 'No se capturó tu rostro durante el inicio de sesión. Por favor, vuelve a iniciar sesión.'], 400);
        }

        // Convierte la ruta relativa en ruta absoluta del disco duro para poder abrir el archivo
        $enrolledImagePath = Storage::disk('public')->path($loginFacePath);

        // Obtiene el archivo de imagen enviado en la petición actual (la cara capturada ahora)
        $tempImage = $request->file('image');

        try {
            // Construye una petición HTTP multipart hacia el microservicio Python
            // Adjunta las dos imágenes: la del login (image1) y la actual (image2)
            $response = Http::attach(
                'image1', fopen($enrolledImagePath, 'r'), 'enrolled.jpg'  // Foto del login
            )->attach(
                'image2', fopen($tempImage->getPathname(), 'r'), $tempImage->getClientOriginalName() // Foto actual
            )
            ->timeout(10)         // Espera hasta 10 segundos por la respuesta de Python
            ->connectTimeout(2)   // Si no conecta en 2 segundos, falla
            ->post(config('services.facial.url') . '/verify'); // URL del microservicio en el .env (puerto 8001)

            // Si la petición al microservicio fue exitosa (código HTTP 200)
            if ($response->successful()) {
                $data = $response->json(); // Decodifica la respuesta JSON de Python

                // Comprueba si Python indica que las caras coinciden (match: true)
                if (isset($data['match']) && $data['match'] === true) {
                    // Registra en el log del servidor que la verificación fue exitosa
                    \Log::info('Verificación facial exitosa para usuario: ' . $request->user()->id, ['distance' => $data['distance'] ?? 'n/a']);

                    // Devuelve al frontend que la verificación fue aprobada
                    return response()->json([
                        'message'  => 'Verificación exitosa.',
                        'verified' => true,
                        'distance' => $data['distance'] ?? null // Distancia facial calculada por DeepFace
                    ]);
                }

                // Si Python respondió pero las caras NO coinciden, registra una advertencia
                \Log::warning('Verificación facial fallida (No coinciden) para usuario: ' . $request->user()->id, ['data' => $data]);
            } else {
                // Si Python devolvió un error HTTP (500, 404, etc.), lo registra
                \Log::error('Error en microservicio facial', ['status' => $response->status(), 'body' => $response->body()]);
            }

            // En cualquier caso que no sea match=true, devuelve acceso denegado (401 Unauthorized)
            return response()->json([
                'error'    => 'La verificación facial ha fallado. Asegúrate de que tu rostro sea visible y coincida con tu foto de registro.',
                'verified' => false,
                'details'  => $response->json() // Detalles de la respuesta de Python para depurar
            ], 401);

        } catch (\Exception $e) {
            // Si Python no está disponible o hay un error de red, registra el fallo crítico
            \Log::error('Fallo crítico en conexión con microservicio facial: ' . $e->getMessage());

            // Devuelve error 503 (Servicio no disponible) sin permitir el acceso
            return response()->json([
                'error'    => 'El servicio de verificación facial no está disponible en este momento.',
                'verified' => false,
                'debug'    => $e->getMessage()
            ], 503);
        }
    }
}