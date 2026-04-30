# LaravelGameFace - CRM de Juegos con Verificación Facial

## Descripción General

Este proyecto es una plataforma de gestión de juegos que implementa una arquitectura moderna basada en microservicios. El sistema no es un monolito tradicional, sino que separa las responsabilidades en diferentes módulos para mejorar la escalabilidad y el mantenimiento.

LaravelGameFace combina:

- **Verificación de identidad** mediante reconocimiento facial
- **Chat en tiempo real** entre jugadores
- **Detección de emociones** en el cliente
- **Autenticación segura** con Sanctum

El núcleo del sistema es una aplicación backend desarrollada con el framework Laravel 12, la cual gestiona la lógica de negocio, la base de datos relacional y la autenticación de usuarios. La interfaz de usuario está construida con React, utilizando Inertia.js para permitir una navegación fluida de tipo SPA sin abandonar el ecosistema de rutas de Laravel.


---

## Tecnologías Utilizadas

### Backend

- **Laravel 12** - Framework PHP moderno
- **Laravel Reverb** - WebSockets en tiempo real
- **Laravel Sanctum** - Autenticación stateless
- **PostgreSQL / SQLite** - Base de datos relacional

### Frontend

- **React 18** - Librería UI moderna
- **Inertia.js** - Glue entre Laravel y React
- **Tailwind CSS** - Framework de estilos
- **face-api.js** - Detección facial en cliente
- **Vite** - Build tool moderno

### Microservicio Facial

- **Python 3.12** - Lenguaje de scripting
- **FastAPI** - Framework web de alto rendimiento
- **DeepFace** - Librería de reconocimiento facial

---

### Flujo de Verificación Facial

1. **Cliente captura** frame de webcam con face-api.js
2. **Envía** imagen a Laravel endpoint
3. **Laravel** recupera imagen de referencia y envía ambas al microservicio Python
4. **DeepFace** compara descriptores faciales y devuelve similitud
5. **Laravel** procesa resultado y otorga/deniega acceso

---

## Microservicio Facial

### Descripción

Un microservicio independiente programado en Python (FastAPI) se encarga del reconocimiento facial. Laravel se comunica con este servicio de forma interna para validar la identidad de los usuarios mediante la librería DeepFace, garantizando que el procesamiento pesado de imágenes no afecte al rendimiento del servidor principal y evitando que imágenes biométricas se procesen directamente en el backend de PHP.

### Endpoint Principal

**POST** `/verify`

Compara dos imágenes y verifica si pertenecen a la misma persona.

**Request:**

```bash
curl -X POST "http://localhost:8001/verify" \
  -F "image1=@foto_referencia.jpg" \
  -F "image2=@foto_capturada.jpg"
```

**Response:**

```json
{
  "match": true,
  "distance": 0.23
}
```

- `match`: Boolean si las imágenes coinciden (threshold ~0.6)
- `distance`: Distancia euclídea entre descriptores (menor = más similar)

---

## Sección 1: Gestión con MCP (Model Context Protocol)

Esta sección demuestra cómo utilizas herramientas de IA conectadas a la API de GitHub para gestionar el flujo de trabajo del repositorio.

Consulta de Pull Requests:

<img width="929" height="324" alt="image" src="https://github.com/user-attachments/assets/4cd34db6-014b-4272-97c6-2af682cf77ab" />

Se utiliza la herramienta mcp__github__list_pull_requests para verificar si existen tareas pendientes. El sistema confirma que la lista está vacía, permitiendo iniciar una nueva rama sin conflictos.

Sincronización del Código (Git Push):

<img width="677" height="582" alt="image" src="https://github.com/user-attachments/assets/a0851854-6873-4b4d-a690-c04fcc8fa8f5" />

Tras realizar los cambios locales en el microservicio, se sube la rama feature/prueba-evento al origen. Aquí se observa el proceso de enumeración y escritura de objetos en el servidor remoto.

Confirmación de la Pull Request:

<img width="744" height="405" alt="image" src="https://github.com/user-attachments/assets/a6c627e3-23de-4966-b87f-758116c9c516" />


Una vez subida la rama, el asistente MCP detecta y muestra los detalles de la PR #1. Se confirma el estado "Open", el autor y las ramas de origen/destino, validando la integración total entre el chat y el repositorio.

---

## Sección 2: Mensajería con RabbitMQ
Esta sección valida la arquitectura de microservicios mediante el envío y recepción de mensajes asíncronos.

Publicación desde el Panel (Productor):

<img width="899" height="783" alt="image" src="https://github.com/user-attachments/assets/bddee5a1-98f9-4925-be0c-bccd51f9891f" />

Uso de la interfaz de gestión de RabbitMQ (puerto 15672) para publicar un mensaje manualmente en la cola test. Se define el payload con el mensaje de éxito del test.

Recepción en el Microservicio (Consumidor):

<img width="618" height="159" alt="image" src="https://github.com/user-attachments/assets/cd67c344-fd3e-46eb-aecb-dd96e915a9cb" />


Ejecución del script consumer.py en el microservicio. Se observa cómo el servicio está a la escucha y procesa instantáneamente el JSON enviado desde RabbitMQ, imprimiendo el mensaje: "profe, la practica funciona al 100%".

---

## Guía de comandos para el inicio del proyecto

Siga estos pasos de forma secuencial para poner en marcha todos los componentes del sistema.

### 1. Configuración del entorno Laravel

Entre en la carpeta `crm-juegos` y ejecute la preparación del backend y frontend:

```bash
cd crm-juegos
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
npm install
npm run dev
```

### 2. Despliegue de infraestructura con Docker

Inicie el servidor de RabbitMQ para habilitar el intercambio de mensajes:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 3. Configuración del servidor MCP

Cree el archivo `.vscode/mcp.json` y pegue la configuración para habilitar la conexión de la IA con su repositorio de GitHub:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "SU_TOKEN_PERSONAL"
      }
    }
  }
}
```

### 4. Puesta en marcha del microservicio de eventos

Acceda a la carpeta del consumidor y arranque el script de escucha de RabbitMQ:

```bash
cd consumer-service
py -m pip install -r requirements.txt
py consumer.py
```

### 5. Ejecución del microservicio de reconocimiento facial

Prepare el entorno de Python e inicie el servidor de la API de visión artificial:

```bash
cd microservicio-facial
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

---

## 📁 Estructura de Directorios Principal

```text
LaravelGameFace/
├── crm-juegos/                # Aplicación Principal Laravel + React
│   ├── app/                   # Backend PHP
│   ├── database/              # Migraciones y Seeders
│   ├── resources/js/          # Frontend React + Inertia
│   └── routes/                # Rutas web, API y WebSockets
│
├── microservicio-facial/      # API de Visión Artificial
│   ├── main.py                # Aplicación FastAPI
│   ├── requirements.txt       # Dependencias Python
│   └── venv/                  # Entorno virtual
│
├── consumer-service/          # Consumidor de Eventos (RabbitMQ)
│   └── consumer.py            # Script de Python
│
└── .vscode/
    └── mcp.json               # Configuración de Model Context Protocol
```
