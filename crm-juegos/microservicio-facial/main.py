from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil  # Para copiar archivos de forma eficiente
import os      # Para operaciones del sistema de archivos
from deepface import DeepFace  # Librería de reconocimiento facial basada en redes neuronales

# App: crea la instancia de la aplicación FastAPI
app = FastAPI()

# Define la carpeta donde se guardarán temporalmente las imágenes recibidas
UPLOAD_DIR = "temp_images"
# Crea la carpeta si no existe (exist_ok=True evita error si ya existe)
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Endpoint: define la ruta POST /verify que recibe dos imágenes y compara los rostros
@app.post("/verify")
async def verify_faces(image1: UploadFile = File(...), image2: UploadFile = File(...)):
    # Construye las rutas completas donde se guardarán las imágenes temporalmente
    # image1.filename es el nombre del archivo que envió Laravel (ej: "enrolled.jpg")
    path1 = os.path.join(UPLOAD_DIR, image1.filename)
    path2 = os.path.join(UPLOAD_DIR, image2.filename)

    try:
        # Guarda la primera imagen (foto del login) en disco
        # "wb" significa escritura en modo binario (para archivos de imagen)
        with open(path1, "wb") as buffer:
            shutil.copyfileobj(image1.file, buffer)  # Copia el contenido del archivo al buffer

        # Guarda la segunda imagen (foto actual del usuario) en disco
        with open(path2, "wb") as buffer:
            shutil.copyfileobj(image2.file, buffer)

        try:
            # Llama a DeepFace para comparar ambas imágenes
            # DeepFace usa redes neuronales preentrenadas para extraer vectores faciales y compararlos
            # enforce_detection=True: si no detecta una cara humana en alguna imagen, lanza ValueError
            result = DeepFace.verify(img1_path=path1, img2_path=path2, enforce_detection=True)

            # Devuelve el resultado al cliente (Laravel)
            # result["verified"] es True si las caras pertenecen a la misma persona
            # result["distance"] es la distancia entre los vectores faciales: cuanto más bajo, más parecidas
            return {
                "match": bool(result.get("verified", False)),
                "distance": float(result.get("distance", 1.0))
            }

        except ValueError as ve:
            # Si DeepFace no pudo detectar una cara (ej: dedos delante de la cámara, imagen borrosa)
            # Devuelve match=False sin lanzar un error 500, para que Laravel pueda manejarlo limpiamente
            return {
                "match": False,
                "distance": 1.0,    # Distancia máxima (personas totalmente distintas)
                "error": str(ve)    # Descripción del error para depuración
            }

    except Exception as e:
        # Si ocurre cualquier otro error inesperado (ej: archivo corrupto, error de memoria)
        # Lanza un error HTTP 500 con el detalle del problema
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # El bloque finally se ejecuta SIEMPRE, aunque haya habido un error
        # Elimina las imágenes temporales del disco para no acumular archivos
        if os.path.exists(path1):
            os.remove(path1)
        if os.path.exists(path2):
            os.remove(path2)