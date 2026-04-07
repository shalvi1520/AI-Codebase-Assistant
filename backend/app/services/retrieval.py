from app.services.embedding import generate_embedding
from app.services.vector_store import search

import os
import pickle


def retrieve_code(repo_name: str, query: str, top_k: int = 3):
    """
    Retrieve relevant code chunks from FAISS vector store
    """

    
    query_vector = generate_embedding(query)

    
    results = search(repo_name, query_vector, top_k)

    formatted = []

    for r in results:
        formatted.append({
            "code": r.get("code"),
            "file": r.get("file"),
            "function_name": r.get("function_name"),
            "start_line": r.get("start_line", 1),
            "end_line": r.get("end_line", 1)
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