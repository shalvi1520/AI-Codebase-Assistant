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

    # Convert question → embedding
    query_vector = generate_embedding(request.question)

    # Retrieve relevant functions
    retrieved = search(query_vector, request.top_k)

    # Generate explanation using LLM
    answer = generate_response(request.question, retrieved)

    return {
        "question": request.question,
        "retrieved_functions": retrieved,
        "answer": answer
    }