from app.services.embedding import generate_embedding
from app.services.vector_store import search


def retrieve_code(repo_name: str, query: str, top_k: int = 3):
    """
    Retrieve relevant code chunks from FAISS vector store
    """

    # Convert query → embedding
    query_vector = generate_embedding(query)

    # Search FAISS index
    results = search(repo_name, query_vector, top_k)

    formatted = []

    for r in results:
        formatted.append({
            "code": r.get("code"),
            "file": r.get("file"),
            "start_line": r.get("start_line", 1),
            "end_line": r.get("end_line", 1)
        })

    return formatted