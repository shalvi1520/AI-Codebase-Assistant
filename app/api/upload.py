from fastapi import APIRouter, UploadFile, File
import os
import shutil
import zipfile

from app.services.parser import parse_python_files
from app.services.embedding import generate_embedding
from app.services.vector_store import add_embeddings


router = APIRouter()

UPLOAD_DIR = "uploads"
EXTRACT_DIR = "extracted"

# Create folders if they don't exist
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)


@router.post("/upload")
async def upload_codebase(file: UploadFile = File(...)):

    # Save uploaded ZIP
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Clear previous extracted code
    if os.path.exists(EXTRACT_DIR):
        shutil.rmtree(EXTRACT_DIR)

    os.makedirs(EXTRACT_DIR, exist_ok=True)

    # Extract ZIP
    with zipfile.ZipFile(file_path, "r") as zip_ref:
        zip_ref.extractall(EXTRACT_DIR)

    # Parse Python files
    parsed = parse_python_files(EXTRACT_DIR)

    embeddings = []
    metadata = []

    # Generate embeddings for each function
    for item in parsed:
        text_for_embedding = item["function_name"] + " " + item["code"]
        vector = generate_embedding(text_for_embedding)

        embeddings.append(vector)

        metadata.append({
            "file": item["file"],
            "function_name": item["function_name"],
            "code": item["code"]
        })

    # Store embeddings in FAISS vector database
    add_embeddings(embeddings, metadata)

    return {
        "message": "Upload, parsing, embedding and indexing completed",
        "functions_found": len(parsed),
        "vectors_stored": len(embeddings)
    }