from fastapi import APIRouter
from pydantic import BaseModel
import os
import json

from app.services.retrieval import retrieve_code, get_all_functions
from app.services.llm_service import (
    generate_response,
    generate_response_with_history,
    generate_git_response,           # NEW
)
from app.services.query_classifier import detect_query_type
from app.services.graph_builder import build_dependency_graph
from app.services.session_store import get_history, add_message, clear_session


router = APIRouter()

REPO_INFO_DIR = "repo_info"
os.makedirs(REPO_INFO_DIR, exist_ok=True)


class QueryRequest(BaseModel):
    repo_name:  str
    question:   str
    top_k:      int = 8
    session_id: str = ""    # optional — empty string = stateless (old behaviour)


def _load_repo_info(repo_name: str) -> dict:
    """
    Load the rich git metadata JSON saved at clone time.
    Returns empty dict if the repo was a ZIP upload (no git history).
    """
    path = os.path.join(REPO_INFO_DIR, f"{repo_name}.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return {}


@router.post("/query")
async def query_codebase(request: QueryRequest):

    query_type = detect_query_type(request.question)

    # ── 1. Dependency graph ───────────────────────────────────────────────────
    if query_type == "graph":

        graph = build_dependency_graph(request.repo_name)

        return {
            "mode":   "graph",
            "graph":  graph,
            "answer": "Here is the dependency graph of the codebase."
        }

    # ── 2. Git / repo metadata questions (NEW) ────────────────────────────────
    # Handles: "who made last commit", "summarize repo", "what languages",
    #          "show contributors", "how many commits", etc.
    if query_type == "git_info":

        repo_info = _load_repo_info(request.repo_name)

        if not repo_info:
            # Try computing live if .git folder exists (edge case)
            repo_path = os.path.join("extracted", request.repo_name)
            if os.path.exists(os.path.join(repo_path, ".git")):
                try:
                    from app.utils.helpers import get_rich_repo_info
                    repo_info = get_rich_repo_info(repo_path)
                except Exception:
                    pass

        if repo_info:
            answer = generate_git_response(request.question, repo_info)
            return {
                "mode":       "git_info",
                "answer":     answer,
                "repo_stats": repo_info.get("stats", {}),
                "file":       None,
                "session_id": request.session_id,
            }
        else:
            return {
                "mode":   "chat",
                "answer": (
                    "This repository was uploaded as a ZIP file — no git history is available. "
                    "To get commit history, contributor info, author blame data, and language stats, "
                    "try cloning it via the Git URL tab instead."
                ),
                "file":       None,
                "session_id": request.session_id,
            }

    # ── 3. Exact function name finder ─────────────────────────────────────────
    query_lower   = request.question.lower()
    all_functions = get_all_functions(request.repo_name)

    for item in all_functions:

        function_name = (item.get("function_name") or "").lower()

        if not function_name:
            continue

        fn_clean    = function_name.replace("_", " ").strip()
        query_clean = query_lower.replace("_", " ")

        for word in ["where", "is", "function", "show", "find", "the"]:
            query_clean = query_clean.replace(word, "")

        query_clean = query_clean.strip()

        if query_clean and all(word in fn_clean for word in query_clean.split()):

            return {
                "mode":       "finder",
                "answer":     f"Exact match found for function '{function_name}' in {item['file']}",
                "file":       item["file"],
                "start_line": item.get("start_line", 1),
                "end_line":   item.get("end_line", 1),
                "code":       item["code"]
            }

    # ── 4. Semantic retrieval ─────────────────────────────────────────────────
    retrieved = retrieve_code(
        request.repo_name,
        request.question,
        request.top_k
    )

    if not retrieved:
        return {
            "mode":   "chat",
            "answer": "No relevant code found in the repository.",
            "file":   None
        }

    if query_type == "code_finder":

        top = retrieved[0]

        return {
            "mode":       "finder",
            "answer":     f"Relevant code found in {top['file']}",
            "file":       top["file"],
            "start_line": top.get("start_line", 1),
            "end_line":   top.get("end_line", 1),
            "code":       top["code"]
        }

    # ── 5. Chat mode — use session history if session_id provided ────────────
    session_id = request.session_id.strip()

    if session_id:

        history = get_history(session_id)

        add_message(session_id, "user", request.question)

        answer = generate_response_with_history(
            request.question,
            retrieved,
            history
        )

        add_message(session_id, "assistant", answer)

    else:

        # no session_id — original stateless behaviour, untouched
        answer = generate_response(request.question, retrieved)

    return {
        "mode":                "chat",
        "question":            request.question,
        "retrieved_functions": retrieved,
        "answer":              answer,
        "file":                retrieved[0]["file"],
        "session_id":          session_id
    }


# ── Session management endpoints — UNCHANGED ─────────────────────────────────

class ClearSessionRequest(BaseModel):
    session_id: str


@router.post("/session/clear")
async def clear_session_endpoint(request: ClearSessionRequest):
    """Clear conversation history for a given session."""
    clear_session(request.session_id)
    return {
        "message": f"Session {request.session_id} cleared successfully."
    }


@router.get("/session/history")
async def get_session_history(session_id: str):
    """Return the full conversation history for a session."""
    history = get_history(session_id)
    return {
        "session_id":    session_id,
        "message_count": len(history),
        "messages":      history
    }