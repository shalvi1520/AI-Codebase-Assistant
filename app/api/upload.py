from fastapi import APIRouter, UploadFile, File
import os
import shutil
import zipfile

router = APIRouter()

UPLOAD_DIR = "uploads"
EXTRACT_DIR = "extracted"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)

@router.post("/upload")
async def upload_codebase(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    # Save ZIP file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Extract ZIP
    with zipfile.ZipFile(file_path, 'r') as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)

    return {"message": "File uploaded and extracted successfully"}