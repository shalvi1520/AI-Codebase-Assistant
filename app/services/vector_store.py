import faiss
import numpy as np
import os
import pickle

DIMENSION = 768

INDEX_FILE = "vector_index.faiss"
METADATA_FILE = "metadata.pkl"

# Load index if it exists
if os.path.exists(INDEX_FILE):
    index = faiss.read_index(INDEX_FILE)
else:
    index = faiss.IndexFlatL2(DIMENSION)

# Load metadata if it exists
if os.path.exists(METADATA_FILE):
    with open(METADATA_FILE, "rb") as f:
        metadata_store = pickle.load(f)
else:
    metadata_store = []


def add_embeddings(embeddings, metadata):

    vectors = np.array(embeddings).astype("float32")

    if len(vectors) == 0:
        return

    index.add(vectors)

    metadata_store.extend(metadata)

    # Save FAISS index
    faiss.write_index(index, INDEX_FILE)

    # Save metadata
    with open(METADATA_FILE, "wb") as f:
        pickle.dump(metadata_store, f)


def search(query_vector, top_k=3):

    if index.ntotal == 0:
        return []

    query = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query, top_k)

    results = []

    for idx in indices[0]:
        if idx != -1 and idx < len(metadata_store):
            results.append(metadata_store[idx])

    return results