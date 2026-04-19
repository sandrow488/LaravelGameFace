# Memoria Técnica del Proyecto: CRM de Juegos con Verificación Facial y Tiempo Real

Este proyecto ha sido desarrollado como práctica final, integrando una arquitectura de microservicios, comunicación en tiempo real y procesamiento de inteligencia artificial aplicado a la experiencia de usuario.

## 1. Arquitectura General del Sistema

El sistema se divide en tres capas principales que interactúan mediante protocolos estándar para garantizar la escalabilidad y la separación de responsabilidades:

*   **Núcleo de Gestión (Backend):** Desarrollado en Laravel 11, actúa como el orquestador central. Gestiona la lógica de negocio, la persistencia de datos, la autenticación mediante Sanctum y la comunicación de sockets a través de Reverb.
*   **Interfaz de Usuario (Frontend):** Implementada con React bajo el stack de Inertia.js. Permite una experiencia de aplicación de página única (SPA) manteniendo el enrutamiento y la seguridad gestionada desde el servidor.
*   **Servicio de Inteligencia Artificial (Microservicio):** Una instancia independiente basada en Python (FastAPI) y DeepFace, dedicada exclusivamente al reconocimiento facial para la verificación de identidad.

## 2. Flujo de Verificación de Identidad

Siguiendo un criterio estricto de seguridad, el proceso de verificación no se resuelve en el cliente para evitar manipulaciones. El flujo se desglosa en los siguientes pasos:

1.  **Captura:** El frontend utiliza la API de MediaDevices para capturar un frame de la webcam.
2.  **Transmisión:** La imagen se envía mediante una petición HTTP POST protegida por el middleware de sesión a Laravel.
3.  **Evaluación:** Laravel recupera la imagen de referencia del usuario almacenada en el almacenamiento local y realiza una petición interna al microservicio Python enviando ambas capturas.
4.  **Resultado:** El microservicio utiliza la librería DeepFace para comparar los descriptores faciales mediante distancia euclídea y devuelve un resultado booleano. Laravel valida esta respuesta y otorga el acceso a la sesión de juego.

## 3. Detección de Emociones y Privacidad

A diferencia de la verificación de identidad, la detección de emociones se realiza íntegramente en el lado del cliente utilizando la librería face-api.js. Esta decisión arquitectónica se basa en dos principios:

*   **Rendimiento:** Evita la saturación del ancho de banda y del hilo principal del servidor mediante el procesamiento en el navegador.
*   **Privacidad de Datos:** Únicamente se envían datos abstractos (la emoción detectada y el nivel de confianza) al backend para su almacenamiento en la tabla `emotion_logs`, garantizando que las imágenes biométricas del usuario no salgan de su dispositivo durante el juego.

## 4. Comunicación en Tiempo Real (WebSockets)

Para el sistema de chat y presencia, se utiliza Laravel Reverb configurado con canales de presencia (`PresenceChannel`).

*   **Aislamiento:** Cada sesión de juego tiene su propio identificador de canal (`game.{session_id}`), lo que impide la filtración de mensajes entre distintas partidas o usuarios.
*   **Gestión de Presencia:** El sistema registra en tiempo real qué usuarios están conectados a una sesión específica, actualizando dinámicamente el contador de jugadores activos.
*   **Persistencia:** Todos los mensajes se almacenan en la tabla `chat_messages` vinculados al usuario y a la sesión de juego, permitiendo la recuperación del historial tras una recarga de la aplicación.

## 5. Modelo de Datos

La base de datos PostgreSQL gestiona las siguientes entidades principales:

*   `users`: Almacena credenciales y la ruta de la imagen biométrica base para el enrolamiento.
*   `game_sessions`: Registra el inicio, fin, duración y puntuación de cada partida.
*   `chat_messages`: Persistencia de la comunicación, vinculada obligatoriamente a una sesión de juego.
*   `emotion_logs`: Histórico de estados anímicos detectados durante el uso de la plataforma.

## 6. Configuración y Despliegue

El proyecto requiere que tanto el servidor de PHP como el microservicio de Python estén activos. El backend de Laravel debe estar configurado para comunicarse con la URL del microservicio (por defecto puerto 8001 para evitar conflictos en el desarrollo local). El servidor de WebSockets (Reverb) debe ejecutarse de forma paralela para habilitar las funcionalidades reactivas del chat.
