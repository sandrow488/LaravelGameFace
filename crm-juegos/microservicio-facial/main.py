from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil
import os
from deepface import DeepFace

# App
app = FastAPI()

UPLOAD_DIR = "temp_images"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Endpoint
@app.post("/verify")
async def verify_faces(image1: UploadFile = File(...), image2: UploadFile = File(...)):
    
    path1 = os.path.join(UPLOAD_DIR, image1.filename)
    path2 = os.path.join(UPLOAD_DIR, image2.filename)
    
    try:
        with open(path1, "wb") as buffer:
            shutil.copyfileobj(image1.file, buffer)
        with open(path2, "wb") as buffer:
            shutil.copyfileobj(image2.file, buffer)
            
        
        try:
            result = DeepFace.verify(img1_path=path1, img2_path=path2, enforce_detection=True)
            return {
                "match": bool(result.get("verified", False)),
                "distance": float(result.get("distance", 1.0))
            }
        except ValueError as ve:
            
            return {
                "match": False,
                "distance": 1.0,
                "error": str(ve)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        
        if os.path.exists(path1):
            os.remove(path1)
        if os.path.exists(path2):
            os.remove(path2)