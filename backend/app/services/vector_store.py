import faiss
import numpy as np
import os
import pickle

DIMENSION = 768
VECTOR_DB_DIR = "vector_dbs"

os.makedirs(VECTOR_DB_DIR, exist_ok=True)


def get_paths(repo_name):
    index_path = os.path.join(VECTOR_DB_DIR, f"{repo_name}.faiss")
    meta_path  = os.path.join(VECTOR_DB_DIR, f"{repo_name}.pkl")
    return index_path, meta_path


def add_embeddings(repo_name, embeddings, metadata):
    index_path, meta_path = get_paths(repo_name)

    # ── ALWAYS start fresh on re-upload ──────────────────────────────────────
    # The old code appended to existing data which caused stale metadata
    # (missing complexity fields) to mix with new metadata.
    # We now always create a brand-new index and metadata list.
    index = faiss.IndexFlatL2(DIMENSION)
    metadata_store = []

    vectors = np.array(embeddings).astype("float32")

    if len(vectors) == 0:
        return

    index.add(vectors)
    metadata_store.extend(metadata)

    faiss.write_index(index, index_path)

    with open(meta_path, "wb") as f:
        pickle.dump(metadata_store, f)


def search(repo_name, query_vector, top_k=3):
    index_path, meta_path = get_paths(repo_name)

    if not os.path.exists(index_path):
        return []

    index = faiss.read_index(index_path)

    with open(meta_path, "rb") as f:
        metadata_store = pickle.load(f)

    query = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query, top_k)

    results = []

    for idx in indices[0]:
        if idx != -1 and idx < len(metadata_store):
            results.append(metadata_store[idx])

    return results