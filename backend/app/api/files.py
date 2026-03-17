import os
from fastapi import APIRouter

router = APIRouter()

REPO_DIR = "extracted"


@router.get("/file")
def get_file(repo_name: str, path: str):

    file_path = os.path.join(REPO_DIR, repo_name, path)

    if not os.path.exists(file_path):
        return {"error": "File not found"}

    with open(file_path, "r", encoding="utf-8") as f:
        code = f.read()

    return {
        "file": path,
        "code": code
    }