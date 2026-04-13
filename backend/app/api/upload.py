from fastapi import APIRouter, UploadFile, File
from pydantic import BaseModel
import os
import shutil
import zipfile
import json

from app.services.parser import parse_all_files
from app.services.embedding import generate_embedding
from app.services.vector_store import add_embeddings
from app.services.graph_builder import build_dependency_graph
from app.utils.helpers import (
    clone_repo,
    get_blame_for_file,
    get_blame_for_function,
    get_commit_log,
    get_rich_repo_info,
)


router = APIRouter()

UPLOAD_DIR    = "uploads"
EXTRACT_DIR   = "extracted"
REPO_INFO_DIR = "repo_info"

os.makedirs(UPLOAD_DIR,    exist_ok=True)
os.makedirs(EXTRACT_DIR,   exist_ok=True)
os.makedirs(REPO_INFO_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
#  Helper — build a relpath -> blame_map lookup from git tree
# ─────────────────────────────────────────────────────────────

def _build_path_maps(repo_path: str) -> tuple:
    """
    Walk the git tree once and return two dicts:
        relpath_set         : set of all relative paths known to git
        basename_to_relpath : basename -> relative path (last one wins for dups)

    Used so blame lookups work correctly whether the parsed item
    stored a basename OR a relative path.
    """
    relpath_set         = set()
    basename_to_relpath = {}

    try:
        import git as _git
        _repo = _git.Repo(repo_path)
        for blob in _repo.tree().traverse():
            if hasattr(blob, "path"):
                relpath_set.add(blob.path)
                basename_to_relpath[os.path.basename(blob.path)] = blob.path
    except Exception as e:
        print(f"[upload] Could not build path maps: {e}")

    return relpath_set, basename_to_relpath


def _resolve_git_relpath(item_file: str, relpath_set: set, basename_to_relpath: dict):
    """
    Given the 'file' field from a parsed item (which is now a relative path
    like 'src/App.js' or just 'App.js'), find the matching git relative path
    so we can run git blame on it.

    Priority:
      1. Direct match   — item_file is already a valid git relpath
      2. Basename match — fall back to basename lookup
      3. None           — file not tracked by git (skip blame)
    """
    # Normalise separators (Windows uses backslash)
    normalised = item_file.replace("\\", "/")

    if normalised in relpath_set:
        return normalised

    # Try basename fallback
    basename = os.path.basename(item_file)
    if basename in basename_to_relpath:
        return basename_to_relpath[basename]

    return None


# ─────────────────────────────────────────────────────────────
#  Route 1 — ZIP upload
# ─────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_codebase(file: UploadFile = File(...)):

    # ── 1. Save ZIP ───────────────────────────────────────────────────────────
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    repo_name = file.filename.replace(".zip", "")

    # ── 2. Extract ZIP ────────────────────────────────────────────────────────
    repo_extract_path = os.path.join(EXTRACT_DIR, repo_name)
    if os.path.exists(repo_extract_path):
        shutil.rmtree(repo_extract_path)
    os.makedirs(repo_extract_path, exist_ok=True)

    with zipfile.ZipFile(file_path, "r") as zip_ref:
        zip_ref.extractall(repo_extract_path)

    # ── 3. Parse all languages ────────────────────────────────────────────────
    parsed = parse_all_files(repo_extract_path)

    # ── 4. Build embeddings ───────────────────────────────────────────────────
    embeddings = []
    metadata   = []

    for item in parsed:
        text_for_embedding = (
            f"Language: {item.get('language', 'unknown')}\n"
            f"File: {item['file']}\n"
            f"Function Name: {item['function_name']}\n\n"
            f"Code:\n{item['code']}"
        )

        vector = generate_embedding(text_for_embedding)
        embeddings.append(vector)

        metadata.append({
            "file":           item["file"],
            "language":       item.get("language", "unknown"),
            "function_name":  item["function_name"],
            "calls":          item.get("calls", []),
            "code":           item["code"],
            "start_line":     item["start_line"],
            "end_line":       item["end_line"],
            "complexity":     item.get("complexity", 0),    # ← complexity score
            "risk":           item.get("risk", "unknown"),  # ← risk label
            # No blame for ZIP uploads
            "author":         "",
            "author_email":   "",
            "last_modified":  "",
            "commit_message": "",
        })

    # ── 5. Store in FAISS (always fresh — no duplicates) ──────────────────────
    add_embeddings(repo_name, embeddings, metadata)

    # ── 6. Build dependency graph ─────────────────────────────────────────────
    graph = build_dependency_graph(repo_name)

    # ── 7. Language summary ───────────────────────────────────────────────────
    lang_counts: dict = {}
    for item in parsed:
        lang = item.get("language", "unknown")
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    return {
        "message":          "Upload, parsing, embedding, and graph generation completed",
        "functions_found":  len(parsed),
        "vectors_stored":   len(embeddings),
        "languages_parsed": lang_counts,
        "graph":            graph,
        "source":           "zip",
    }


# ─────────────────────────────────────────────────────────────
#  Route 2 — Git URL upload
# ─────────────────────────────────────────────────────────────

class GitUploadRequest(BaseModel):
    git_url:   str
    repo_name: str = ""   # optional override; defaults to last URL segment


@router.post("/upload-git")
async def upload_from_git(request: GitUploadRequest):
    """
    Clone a remote Git repository, parse all files, generate embeddings,
    attach git blame metadata per function, build dependency graph, and
    return rich repo info (commits, contributors, languages, stats).

    Body:
        git_url   (str) — e.g. "https://github.com/owner/repo"
        repo_name (str) — optional; inferred from URL if omitted
    """

    # ── 1. Derive repo name ───────────────────────────────────────────────────
    git_url   = request.git_url.rstrip("/")
    repo_name = request.repo_name or git_url.split("/")[-1].replace(".git", "")

    print(f"[upload-git] Cloning {git_url} as '{repo_name}'")

    # ── 2. Clone ──────────────────────────────────────────────────────────────
    repo_path = clone_repo(git_url, repo_name)

    # ── 3. Rich repo metadata ─────────────────────────────────────────────────
    repo_info = get_rich_repo_info(repo_path)

    # ── 4. Parse all source files ─────────────────────────────────────────────
    parsed = parse_all_files(repo_path)

    # ── 5. Build git path maps for blame resolution ───────────────────────────
    relpath_set, basename_to_relpath = _build_path_maps(repo_path)

    blame_cache: dict = {}   # git_relpath -> blame_map (computed once per file)

    # ── 6. Embeddings + blame per function ────────────────────────────────────
    embeddings = []
    metadata   = []

    for item in parsed:
        item_file = item["file"]   # relative path like "src/App.js"

        # Resolve the git-relative path for this file
        git_rel = _resolve_git_relpath(item_file, relpath_set, basename_to_relpath)

        # Compute blame map for this file (once, then cache)
        if git_rel and git_rel not in blame_cache:
            blame_cache[git_rel] = get_blame_for_file(repo_path, git_rel)

        blame_map   = blame_cache.get(git_rel, {}) if git_rel else {}
        blame_entry = get_blame_for_function(
            blame_map,
            item["start_line"],
            item["end_line"],
        )

        author_str = blame_entry.get("author", "")
        date_str   = blame_entry.get("committed_date", "")

        text_for_embedding = (
            f"Language: {item.get('language', 'unknown')}\n"
            f"File: {item_file}\n"
            f"Function Name: {item['function_name']}\n"
            f"Author: {author_str}\n"
            f"Last Modified: {date_str}\n\n"
            f"Code:\n{item['code']}"
        )

        vector = generate_embedding(text_for_embedding)
        embeddings.append(vector)

        metadata.append({
            "file":           item_file,
            "language":       item.get("language", "unknown"),
            "function_name":  item["function_name"],
            "calls":          item.get("calls", []),
            "code":           item["code"],
            "start_line":     item["start_line"],
            "end_line":       item["end_line"],
            "complexity":     item.get("complexity", 0),    # ← complexity score
            "risk":           item.get("risk", "unknown"),  # ← risk label
            # Blame fields
            "author":         blame_entry.get("author", ""),
            "author_email":   blame_entry.get("email", ""),
            "last_modified":  blame_entry.get("committed_date", ""),
            "commit_message": blame_entry.get("message", ""),
        })

    # ── 7. Store in FAISS (always fresh) ──────────────────────────────────────
    add_embeddings(repo_name, embeddings, metadata)

    # ── 8. Dependency graph ───────────────────────────────────────────────────
    graph = build_dependency_graph(repo_name)

    # ── 9. Cache rich repo info to disk ──────────────────────────────────────
    cached_path = os.path.join(REPO_INFO_DIR, f"{repo_name}.json")
    with open(cached_path, "w") as f:
        json.dump(repo_info, f)

    # ── 10. Language summary ──────────────────────────────────────────────────
    lang_counts: dict = {}
    for item in parsed:
        lang = item.get("language", "unknown")
        lang_counts[lang] = lang_counts.get(lang, 0) + 1

    return {
        "message":          "Git clone, parsing, embedding, and graph generation completed",
        "repo_name":        repo_name,
        "functions_found":  len(parsed),
        "vectors_stored":   len(embeddings),
        "languages_parsed": lang_counts,
        "graph":            graph,
        "source":           "git",
        # Rich info for frontend dashboard
        "commit_log":       repo_info["commit_log"],
        "collaborators":    repo_info["collaborators"],
        "top_contributors": repo_info["top_contributors"],
        "languages":        repo_info["languages"],
        "stats":            repo_info["stats"],
        "latest_commit":    repo_info["latest_commit"],
        "branches":         repo_info["branches"],
    }