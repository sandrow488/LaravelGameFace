<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;

// Conecta con el microservicio Python para validar la identidad facial
class FaceVerificationController extends Controller
{
    /**
     * Enrolamiento: Guarda la foto facial base del usuario en su perfil.
     * Esta foto servirá para futuras comparaciones de seguridad.
     */
    public function enroll(Request $request)
    {
        // 1. Verifica que se haya subido un archivo de imagen válido y no muy pesado (2MB max)
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = $request->user();

        // 2. Si el usuario ya tenía una foto facial anterior, la elimina del disco para ahorrar espacio
        if ($user->face_image_path && Storage::disk('public')->exists($user->face_image_path)) {
            Storage::disk('public')->delete($user->face_image_path);
        }

        // 3. Guarda la nueva imagen en la carpeta 'faces' dentro del disco público (storage/app/public/faces)
        $path = $request->file('image')->store('faces', 'public');

        // 4. Actualiza la ruta de la imagen en el modelo del usuario
        $user->face_image_path = $path;
        $user->save();

        // Redirige hacia atrás con un mensaje de éxito
        return back()->with('message', 'Imagen facial registrada correctamente');
    }

    /**
     * Verificación: Compara la foto tomada en tiempo real con la foto guardada durante el login.
     * Este método se llama justo antes de entrar a un juego.
     */
    public function verify(Request $request)
    {
        // 1. Valida la foto en vivo que envía la webcam
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        // 2. Obtiene la ruta de la foto temporal que se capturó EN EL MOMENTO DEL LOGIN
        // Esto garantiza que quien inició sesión sigue sentado frente a la pantalla
        $loginFacePath = $request->session()->get('login_face_image');

        // 3. Comprobación de seguridad: Si no hay foto del login, bloquea el acceso
        if (!$loginFacePath || !Storage::disk('public')->exists($loginFacePath)) {
            return response()->json(['error' => 'No se capturó tu rostro durante el inicio de sesión. Por favor, vuelve a iniciar sesión.'], 400);
        }

        // Convierte la ruta relativa a una ruta absoluta del sistema operativo
        $enrolledImagePath = Storage::disk('public')->path($loginFacePath);
        $tempImage = $request->file('image');

        try {
            // 4. COMUNICACIÓN CON EL MICROSERVICIO (Python/FastAPI)
            // Se envían ambas imágenes a través de una petición HTTP POST
            $response = Http::attach(
                'image1', fopen($enrolledImagePath, 'r'), 'enrolled.jpg'  // Foto del login
            )->attach(
                'image2', fopen($tempImage->getPathname(), 'r'), $tempImage->getClientOriginalName() // Foto en vivo
            )
            ->timeout(10)         // Tiempo máximo de espera: 10 segundos
            ->connectTimeout(2)   // Tiempo máximo para conectar: 2 segundos
            ->post(config('services.facial.url') . '/verify'); // Lee la URL desde .env (ej. http://127.0.0.1:8000/verify)

            // 5. EVALUACIÓN DE LA RESPUESTA
            if ($response->successful()) {
                $data = $response->json(); 

                // Si el microservicio responde con match = true, es la misma persona
                if (isset($data['match']) && $data['match'] === true) {
                    \Log::info('Verificación facial exitosa para usuario: ' . $request->user()->id, ['distance' => $data['distance'] ?? 'n/a']);

                    return response()->json([
                        'message'  => 'Verificación exitosa.',
                        'verified' => true,
                        'distance' => $data['distance'] ?? null 
                    ]);
                }

                // Si no hacen match, se registra un Warning en el archivo log de Laravel
                \Log::warning('Verificación facial fallida (No coinciden) para usuario: ' . $request->user()->id, ['data' => $data]);
            } else {
                \Log::error('Error en microservicio facial', ['status' => $response->status(), 'body' => $response->body()]);
            }

            // Si llegamos aquí, la verificación falló (no hubo match o hubo error en IA)
            return response()->json([
                'error'    => 'La verificación facial ha fallado. Asegúrate de que tu rostro sea visible y coincida con tu foto de registro.',
                'verified' => false,
                'details'  => $response->json() 
            ], 401);

        } catch (\Exception $e) {
            // Manejo de errores catastróficos (Ej: el servicio Python está apagado)
            \Log::error('Fallo crítico en conexión con microservicio facial: ' . $e->getMessage());

            return response()->json([
                'error'    => 'El servicio de verificación facial no está disponible en este momento.',
                'verified' => false,
                'debug'    => $e->getMessage()
            ], 503);
        }
    }
}