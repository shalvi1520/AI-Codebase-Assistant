from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.files import router as file_router
from app.api.upload import router as upload_router
from app.api.query import router as query_router
from app.utils.helpers import get_commit_log, get_rich_repo_info
import os
import json

REPO_INFO_DIR = "repo_info"
os.makedirs(REPO_INFO_DIR, exist_ok=True)

# -------------------------------------------------
# Create FastAPI app
# -------------------------------------------------
app = FastAPI(
    title="AI Codebase Assistant API",
    description="Backend for CodeLens AI – AI powered codebase understanding",
    version="1.0.0",
)


# -------------------------------------------------
# CORS Configuration
# -------------------------------------------------
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


# -------------------------------------------------
# Register API Routers
# -------------------------------------------------
app.include_router(upload_router, tags=["Upload"])
app.include_router(query_router,  tags=["Query"])
app.include_router(file_router)


# -------------------------------------------------
# Root endpoint
# -------------------------------------------------
@app.get("/")
async def health_check():
    return {
        "status":  "running",
        "service": "AI Codebase Assistant Backend",
        "version": "1.0.0"
    }


# -------------------------------------------------
# Detailed health endpoint
# -------------------------------------------------
@app.get("/health")
async def detailed_health():
    return {
        "api":          "ok",
        "upload_route": "/upload",
        "git_route":    "/upload-git",
        "query_route":  "/query",
        "commit_route": "/commit-log",
        "repo_info":    "/repo-info",
        "docs":         "/docs"
    }


# -------------------------------------------------
# Commit log endpoint — UNCHANGED
# GET /commit-log?repo_name=my-repo
# Returns the last 20 commits for a cloned Git repo.
# Returns empty list for ZIP-uploaded repos (no git history).
# -------------------------------------------------
@app.get("/commit-log")
async def commit_log(repo_name: str):
    repo_path = os.path.join("extracted", repo_name)

    if not os.path.exists(repo_path):
        return {"error": "Repo not found", "commits": []}

    commits = get_commit_log(repo_path, max_commits=20)

    return {
        "repo_name": repo_name,
        "commits":   commits
    }


# -------------------------------------------------
# Rich repo info endpoint — NEW
# GET /repo-info?repo_name=my-repo
#
# Returns collaborators, languages, commits, stats,
# latest commit, and branches for a cloned git repo.
#
# Serves from the cached JSON saved at clone time
# (fast — no re-computation needed).
#
# If repo was ZIP-uploaded (no .git dir), returns
# empty data gracefully with a clear message.
# -------------------------------------------------
@app.get("/repo-info")
async def repo_info(repo_name: str):

    # Fast path: serve from cached JSON saved during /upload-git
    cached_path = os.path.join(REPO_INFO_DIR, f"{repo_name}.json")

    if os.path.exists(cached_path):
        with open(cached_path, "r") as f:
            data = json.load(f)
        return {"repo_name": repo_name, "source": "git", **data}

    # Fallback: repo exists on disk but was not cloned via /upload-git
    repo_path = os.path.join("extracted", repo_name)

    if not os.path.exists(repo_path):
        return {"error": "Repo not found", "repo_name": repo_name}

    # Check if it has a .git directory (i.e., was cloned not unzipped)
    git_dir = os.path.join(repo_path, ".git")

    if not os.path.exists(git_dir):
        return {
            "repo_name":     repo_name,
            "source":        "zip",
            "message":       "ZIP upload — no git history available",
            "commit_log":    [],
            "collaborators": [],
            "languages":     [],
            "stats":         {},
            "latest_commit": {},
            "branches":      []
        }

    # Compute live if JSON cache is missing but .git exists
    info = get_rich_repo_info(repo_path)

    # Save to cache for next time
    with open(cached_path, "w") as f:
        json.dump(info, f)

    return {"repo_name": repo_name, "source": "git", **info}