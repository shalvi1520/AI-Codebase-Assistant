from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.files import router as file_router
from app.api.upload import router as upload_router
from app.api.query import router as query_router
from app.utils.helpers import get_commit_log, get_rich_repo_info
from app.services.visualization import build_heatmap
import os
import json
import pickle

REPO_INFO_DIR = "repo_info"
VECTOR_DB_DIR = "vector_dbs"
os.makedirs(REPO_INFO_DIR, exist_ok=True)

app = FastAPI(
    title="AI Codebase Assistant API",
    description="Backend for CodeLens AI – AI powered codebase understanding",
    version="1.0.0",
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, tags=["Upload"])
app.include_router(query_router,  tags=["Query"])
app.include_router(file_router)


@app.get("/")
async def health_check():
    return {
        "status":  "running",
        "service": "AI Codebase Assistant Backend",
        "version": "1.0.0"
    }


@app.get("/health")
async def detailed_health():
    return {
        "api":          "ok",
        "upload_route": "/upload",
        "git_route":    "/upload-git",
        "query_route":  "/query",
        "commit_route": "/commit-log",
        "repo_info":    "/repo-info",
        "heatmap":      "/heatmap",
        "debug":        "/debug-heatmap",
        "docs":         "/docs"
    }


@app.get("/commit-log")
async def commit_log(repo_name: str):
    repo_path = os.path.join("extracted", repo_name)
    if not os.path.exists(repo_path):
        return {"error": "Repo not found", "commits": []}
    commits = get_commit_log(repo_path, max_commits=20)
    return {"repo_name": repo_name, "commits": commits}


@app.get("/repo-info")
async def repo_info(repo_name: str):
    cached_path = os.path.join(REPO_INFO_DIR, f"{repo_name}.json")
    if os.path.exists(cached_path):
        with open(cached_path, "r") as f:
            data = json.load(f)
        return {"repo_name": repo_name, "source": "git", **data}

    repo_path = os.path.join("extracted", repo_name)
    if not os.path.exists(repo_path):
        return {"error": "Repo not found", "repo_name": repo_name}

    git_dir = os.path.join(repo_path, ".git")
    if not os.path.exists(git_dir):
        return {
            "repo_name": repo_name, "source": "zip",
            "message": "ZIP upload — no git history available",
            "commit_log": [], "collaborators": [], "languages": [],
            "stats": {}, "latest_commit": {}, "branches": []
        }

    info = get_rich_repo_info(repo_path)
    with open(cached_path, "w") as f:
        json.dump(info, f)
    return {"repo_name": repo_name, "source": "git", **info}


# ─────────────────────────────────────────────────────────────
# Heatmap endpoint
# GET /heatmap?repo_name=my-repo
# ─────────────────────────────────────────────────────────────

@app.get("/heatmap")
async def heatmap(repo_name: str):
    data = build_heatmap(repo_name)

    if not data["functions"]:
        return {
            "repo_name": repo_name,
            "error": (
                "No complexity data found. "
                "Re-upload the repository to generate complexity scores. "
                "(Only Python functions are scored in this version.)"
            ),
            "functions": [],
            "by_file":   [],
            "summary":   {}
        }

    return {"repo_name": repo_name, **data}


# ─────────────────────────────────────────────────────────────
# Debug endpoint — visit this in your browser to diagnose
# GET /debug-heatmap?repo_name=my-repo
#
# Shows exactly what pkl files exist, what repo_name was
# received, and whether complexity fields are present.
# ─────────────────────────────────────────────────────────────

@app.get("/debug-heatmap")
async def debug_heatmap(repo_name: str):
    """
    Diagnostic endpoint. Visit:
      http://127.0.0.1:8000/debug-heatmap?repo_name=YOUR_REPO_NAME

    Returns:
      - what pkl files exist in vector_dbs/
      - whether the matching pkl was found
      - first 3 metadata entries (so you can see if complexity is present)
      - count of entries with and without complexity
    """

    # List all available pkl files
    available_pkls = []
    if os.path.exists(VECTOR_DB_DIR):
        available_pkls = [
            f.replace(".pkl", "")
            for f in os.listdir(VECTOR_DB_DIR)
            if f.endswith(".pkl")
        ]

    # Try to load matching pkl
    candidates = [
        repo_name,
        repo_name.replace(".zip", ""),
        repo_name + ".zip",
    ]

    loaded_from = None
    sample      = []
    with_complexity    = 0
    without_complexity = 0

    for name in candidates:
        meta_path = os.path.join(VECTOR_DB_DIR, f"{name}.pkl")
        if os.path.exists(meta_path):
            loaded_from = meta_path
            try:
                with open(meta_path, "rb") as f:
                    metadata = pickle.load(f)

                sample = [
                    {
                        "file":          m.get("file"),
                        "function_name": m.get("function_name"),
                        "complexity":    m.get("complexity", "MISSING"),
                        "risk":          m.get("risk", "MISSING"),
                        "language":      m.get("language"),
                    }
                    for m in metadata[:5]  # first 5 entries only
                ]

                for m in metadata:
                    if m.get("complexity") is not None:
                        with_complexity += 1
                    else:
                        without_complexity += 1

            except Exception as e:
                return {
                    "error":         str(e),
                    "repo_name":     repo_name,
                    "available_pkls": available_pkls,
                }
            break

    return {
        "repo_name_received": repo_name,
        "candidates_tried":   candidates,
        "loaded_from":        loaded_from,
        "available_pkls":     available_pkls,
        "total_entries":      with_complexity + without_complexity,
        "with_complexity":    with_complexity,
        "without_complexity": without_complexity,
        "sample_entries":     sample,
        "verdict": (
            "✅ Ready — complexity data present" if with_complexity > 0
            else "❌ No complexity data — re-upload the repository with the new parser.py"
            if loaded_from
            else "❌ No pkl file found — repo may not be indexed yet"
        )
    }