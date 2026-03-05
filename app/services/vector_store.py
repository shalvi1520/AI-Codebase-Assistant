import faiss
import numpy as np

# CodeBERT embedding dimension
DIMENSION = 768

# Create FAISS index
index = faiss.IndexFlatL2(DIMENSION)

# Store metadata for each vector
metadata_store = []

def add_embeddings(embeddings, metadata):
    """
    embeddings: list of embedding vectors
    metadata: list of metadata (file name, function name, code)
    """

    vectors = np.array(embeddings).astype("float32")

    # Add to FAISS index
    index.add(vectors)

    # Store metadata
    metadata_store.extend(metadata)


def search(query_vector, top_k=3):

    import numpy as np

    if index.ntotal == 0:
        return []

    query = np.array([query_vector]).astype("float32")

    distances, indices = index.search(query, top_k)

    results = []

    for idx in indices[0]:
        if idx != -1 and idx < len(metadata_store):
            results.append(metadata_store[idx])

    return results