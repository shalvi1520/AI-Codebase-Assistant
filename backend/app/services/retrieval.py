from app.services.embedding import generate_embedding
from app.services.vector_store import search

import os
import pickle


def retrieve_code(repo_name: str, query: str, top_k: int = 8):
    query_vector = generate_embedding(query)
    results = search(repo_name, query_vector, top_k * 2)  # fetch more, then filter

    # Deduplicate — max 2 chunks per file
    seen_files = {}
    filtered = []
    for r in results:
        fname = r.get("file", "")
        count = seen_files.get(fname, 0)
        if count < 2:
            filtered.append(r)
            seen_files[fname] = count + 1
        if len(filtered) >= top_k:
            break

    formatted = []
    for r in filtered:
        formatted.append({
            "code":          r.get("code"),
            "file":          r.get("file"),
            "function_name": r.get("function_name"),
            "start_line":    r.get("start_line", 1),
            "end_line":      r.get("end_line", 1),
            "author":         r.get("author", ""),
            "author_email":   r.get("author_email", ""),
            "last_modified":  r.get("last_modified", ""),
            "commit_message": r.get("commit_message", ""),


        })

    return formatted


def get_all_functions(repo_name: str):
    """
    Get ALL functions from metadata (not FAISS)
    """

    meta_path = os.path.join("vector_dbs", f"{repo_name}.pkl")

    if not os.path.exists(meta_path):
        return []

    with open(meta_path, "rb") as f:
        metadata_store = pickle.load(f)

    return metadata_store