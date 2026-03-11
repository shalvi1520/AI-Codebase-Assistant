from fastapi import APIRouter
from pydantic import BaseModel

from app.services.embedding import generate_embedding
from app.services.vector_store import search
from app.services.llm_service import generate_response

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    top_k: int = 3


@router.post("/query")
async def query_codebase(request: QueryRequest):

    # Convert user question → embedding
    query_vector = generate_embedding(
        f"Explain the following function: {request.question}"
    )

    # Retrieve relevant functions from FAISS
    retrieved = search(query_vector, request.top_k)

    # Safety check if nothing found
    if not retrieved:
        return {
            "question": request.question,
            "retrieved_functions": [],
            "answer": "No relevant code found in the uploaded codebase."
        }

    # Generate explanation using LLM
    answer = generate_response(request.question, retrieved)

    return {
        "question": request.question,
        "retrieved_functions": retrieved,
        "answer": answer
    }