from app.services.embedding import generate_embedding
from app.services.vector_store import search

query = "function that logs in user"

query_vector = generate_embedding(query)

results = search(query_vector)

print(results)