"""
docs.py
───────
FastAPI router — Auto Documentation Generator endpoints.

Routes:
  POST /docs/readme        — Generate README.md for a repo
  POST /docs/functions     — Generate function-level documentation
  POST /docs/api           — Generate API endpoint documentation
  GET  /docs/download/{repo_name}/{doc_type}  — Download as .md file
"""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
import os

from app.services.doc_generator import (
    generate_readme,
    generate_function_docs,
    generate_api_docs,
    save_docs_to_disk,
)

router = APIRouter()

DOCS_DIR = "generated_docs"
os.makedirs(DOCS_DIR, exist_ok=True)


# ── Request models ────────────────────────────────────────────────────────────

class DocRequest(BaseModel):
    repo_name:   str
    file_filter: str = ""    # optional; used by /docs/functions


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/docs/readme")
async def generate_readme_endpoint(request: DocRequest):
    """
    Generate a full README.md for the indexed repository.

    Body:
        repo_name  (str) — name used when the repo was uploaded
    """
    result = generate_readme(request.repo_name)

    # Persist to disk for download
    save_docs_to_disk(request.repo_name, "readme", result["content"])

    return {
        "type":       "readme",
        "repo_name":  request.repo_name,
        "content":    result["content"],
        "sections":   result["sections"],
        "word_count": result["word_count"],
    }


@router.post("/docs/functions")
async def generate_function_docs_endpoint(request: DocRequest):
    """
    Generate docstring-style documentation for every indexed function.

    Body:
        repo_name   (str) — repo identifier
        file_filter (str) — optional path substring to narrow scope
                            e.g. "services/auth" or "components"
    """
    result = generate_function_docs(request.repo_name, request.file_filter)

    # Persist to disk
    save_docs_to_disk(request.repo_name, "functions", result["markdown"])

    return {
        "type":      "functions",
        "repo_name": request.repo_name,
        "docs":      result["docs"],
        "total":     result["total"],
        "markdown":  result["markdown"],
    }


@router.post("/docs/api")
async def generate_api_docs_endpoint(request: DocRequest):
    """
    Generate OpenAPI-style docs for detected endpoints in the repository.

    Body:
        repo_name (str) — repo identifier
    """
    result = generate_api_docs(request.repo_name)

    # Persist to disk
    save_docs_to_disk(request.repo_name, "api", result["markdown"])

    return {
        "type":          "api",
        "repo_name":     request.repo_name,
        "endpoints":     result["endpoints"],
        "total":         result["total"],
        "markdown":      result["markdown"],
        "has_endpoints": result["has_endpoints"],
    }


@router.get("/docs/download/{repo_name}/{doc_type}")
async def download_docs(repo_name: str, doc_type: str):
    """
    Download previously generated documentation as a plain .md file.

    Path params:
        repo_name — repository identifier
        doc_type  — "readme" | "functions" | "api"
    """
    safe_name = repo_name.replace("/", "_").replace("\\", "_")
    filename  = f"{safe_name}_{doc_type}.md"
    path      = os.path.join(DOCS_DIR, filename)

    if not os.path.exists(path):
        return {"error": f"No {doc_type} docs found for '{repo_name}'. Generate them first."}

    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    return PlainTextResponse(
        content=content,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/docs/status/{repo_name}")
async def docs_status(repo_name: str):
    """
    Check which doc types have already been generated for a repo.
    Returns a dict of {doc_type: bool}.
    """
    safe_name = repo_name.replace("/", "_").replace("\\", "_")
    doc_types = ["readme", "functions", "api"]

    status = {}
    for dt in doc_types:
        filename = f"{safe_name}_{dt}.md"
        path     = os.path.join(DOCS_DIR, filename)
        status[dt] = os.path.exists(path)

    return {
        "repo_name": repo_name,
        "generated": status,
    }