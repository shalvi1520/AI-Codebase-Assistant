from fastapi import APIRouter, UploadFile, File
import os
import shutil
import zipfile

from app.services.parser import parse_all_files
from app.services.embedding import generate_embedding
from app.services.vector_store import add_embeddings
from app.services.graph_builder import build_dependency_graph

router = APIRouter()

UPLOAD_DIR = "uploads"
EXTRACT_DIR = "extracted"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(EXTRACT_DIR, exist_ok=True)


@router.post("/upload")
async def upload_codebase(file: UploadFile = File(...)):




    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    repo_name = file.filename.replace(".zip", "")




    repo_extract_path = os.path.join(EXTRACT_DIR, repo_name)


    if os.path.exists(repo_extract_path):
        shutil.rmtree(repo_extract_path)

    os.makedirs(repo_extract_path, exist_ok=True)




    with zipfile.ZipFile(file_path, "r") as zip_ref:
        zip_ref.extractall(repo_extract_path)




    parsed = parse_all_files(repo_extract_path)

    embeddings = []
    metadata = []




    for item in parsed:

        text_for_embedding = f"""
Language: {item.get('language', 'unknown')}
File: {item['file']}
Function Name: {item['function_name']}

Code:
{item['code']}
"""

        vector = generate_embedding(text_for_embedding)

        embeddings.append(vector)

        metadata.append({
            "file": item["file"],
            "language": item.get("language", "unknown"),
            "function_name": item["function_name"],
            "calls": item.get("calls", []),
            "code": item["code"],
            "start_line": item["start_line"],
            "end_line": item["end_line"]
        })




    add_embeddings(repo_name, embeddings, metadata)




    graph = build_dependency_graph(repo_name)




    lang_counts = {}
    for item in parsed:
        lang = item.get("language", "unknown")
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    return {
        "message": "Upload, parsing, embedding, and graph generation completed",
        "functions_found": len(parsed),
        "vectors_stored": len(embeddings),
        "languages_parsed": lang_counts,
        "graph": graph
    }