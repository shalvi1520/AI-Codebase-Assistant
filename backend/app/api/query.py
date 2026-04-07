from fastapi import APIRouter
from pydantic import BaseModel

from app.services.retrieval import retrieve_code, get_all_functions
from app.services.llm_service import generate_response
from app.services.query_classifier import detect_query_type
from app.services.graph_builder import build_dependency_graph


router = APIRouter()


class QueryRequest(BaseModel):
    repo_name: str
    question: str
    top_k: int = 3


@router.post("/query")
async def query_codebase(request: QueryRequest):

    # -----------------------------
    # DETECT QUERY TYPE
    # -----------------------------
    query_type = detect_query_type(request.question)

    # -----------------------------
    # GRAPH MODE
    # -----------------------------
    if query_type == "graph":

        graph = build_dependency_graph(request.repo_name)

        return {
            "mode": "graph",
            "graph": graph,
            "answer": "Here is the dependency graph of the codebase."
        }

    # -----------------------------
    # 🔥 SMART FUNCTION MATCH (FIXED)
    # -----------------------------
    query_lower = request.question.lower()

    all_functions = get_all_functions(request.repo_name)

    for item in all_functions:

        function_name = (item.get("function_name") or "").lower()

        if not function_name:
            continue

        # convert snake_case → normal text
        fn_clean = function_name.replace("_", " ").strip()

        # clean user query
        query_clean = query_lower.replace("_", " ")

        # remove useless words
        for word in ["where", "is", "function", "show", "find", "the"]:
            query_clean = query_clean.replace(word, "")

        query_clean = query_clean.strip()

        # match words
        if query_clean and all(word in fn_clean for word in query_clean.split()):

            return {
                "mode": "finder",
                "answer": f"Exact match found for function '{function_name}' in {item['file']}",
                "file": item["file"],
                "start_line": item.get("start_line", 1),
                "end_line": item.get("end_line", 1),
                "code": item["code"]
            }

    # -----------------------------
    # FAISS SEARCH (fallback)
    # -----------------------------
    retrieved = retrieve_code(
        request.repo_name,
        request.question,
        request.top_k
    )

    # -----------------------------
    # NO CODE FOUND
    # -----------------------------
    if not retrieved:
        return {
            "mode": "chat",
            "answer": "No relevant code found in the repository.",
            "file": None
        }

    # -----------------------------
    # CODE FINDER MODE (fallback)
    # -----------------------------
    if query_type == "code_finder":

        top = retrieved[0]

        return {
            "mode": "finder",
            "answer": f"Relevant code found in {top['file']}",
            "file": top["file"],
            "start_line": top.get("start_line", 1),
            "end_line": top.get("end_line", 1),
            "code": top["code"]
        }

    # -----------------------------
    # NORMAL CHAT MODE
    # -----------------------------
    answer = generate_response(request.question, retrieved)

    return {
        "mode": "chat",
        "question": request.question,
        "retrieved_functions": retrieved,
        "answer": answer,
        "file": retrieved[0]["file"]
    }