from fastapi import APIRouter, UploadFile, File
import os
import shutil
import zipfile

from app.services.parser import parse_python_files
from app.services.embedding import generate_embedding
from app.services.vector_store import add_embeddings
from app.services.graph_builder import build_dependency_graph  # 🔥 NEW

router = APIRouter()

UPLOAD_DIR = "uploads"
EXTRACT_DIR = "extracted"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)


@router.post("/upload")
async def upload_codebase(file: UploadFile = File(...)):

    # -----------------------------
    # SAVE UPLOADED ZIP
    # -----------------------------
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    repo_name = file.filename.replace(".zip", "")

    # -----------------------------
    # CREATE REPO-SPECIFIC FOLDER
    # -----------------------------
    repo_extract_path = os.path.join(EXTRACT_DIR, repo_name)

    # Delete old repo folder
    if os.path.exists(repo_extract_path):
        shutil.rmtree(repo_extract_path)

    os.makedirs(repo_extract_path, exist_ok=True)

    # -----------------------------
    # EXTRACT ZIP INTO REPO FOLDER
    # -----------------------------
    with zipfile.ZipFile(file_path, "r") as zip_ref:
        zip_ref.extractall(repo_extract_path)

    # -----------------------------
    # PARSE FILES (WITH CALLS)
    # -----------------------------
    parsed = parse_python_files(repo_extract_path)

    embeddings = []
    metadata = []

    # -----------------------------
    # CREATE EMBEDDINGS + METADATA
    # -----------------------------
    for item in parsed:

        text_for_embedding = f"""
File: {item['file']}
Function Name: {item['function_name']}

Code:
{item['code']}
"""

        vector = generate_embedding(text_for_embedding)

        embeddings.append(vector)

        metadata.append({
            "file": item["file"],
            "function_name": item["function_name"],
            "calls": item.get("calls", []),  # 🔥 IMPORTANT (for graph)
            "code": item["code"],
            "start_line": item["start_line"],
            "end_line": item["end_line"]
        })

    # -----------------------------
    # STORE IN VECTOR DB
    # -----------------------------
    add_embeddings(repo_name, embeddings, metadata)

    # -----------------------------
    # 🔥 BUILD DEPENDENCY GRAPH
    # -----------------------------
    graph = build_dependency_graph(repo_name)

    # -----------------------------
    # RESPONSE
    # -----------------------------
    return {
        "message": "Upload, parsing, embedding, and graph generation completed",
        "functions_found": len(parsed),
        "vectors_stored": len(embeddings),
        "graph": graph  # 🔥 RETURN GRAPH
    }