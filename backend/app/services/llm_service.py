from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── Original function — unchanged, still works exactly as before ──────────────

def generate_response(question, retrieved_code):

    if not retrieved_code:
        return "No relevant code was found in the repository."

    context_parts = []

    for item in retrieved_code:

        file = item.get("file", "unknown_file")
        code = item.get("code", "")

        context_parts.append(
            f"File: {file}\nCode:\n{code}"
        )

    context = "\n\n".join(context_parts)

    prompt = f"""
You are an expert software engineer helping a developer understand a codebase.

User Question:
{question}

Relevant Code Snippets:
{context}

Explain clearly how the code relates to the user's question.
If possible, reference the file names and functions in your explanation.
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {"role": "user", "content": prompt}
        ],
        temperature=0.2
    )

    return completion.choices[0].message.content


# ── New function — same as above but accepts conversation history ──────────────

def generate_response_with_history(question, retrieved_code, history):
    """
    Generate a response using both retrieved code context AND
    the full prior conversation history for this session.

    Parameters:
        question       (str)        current user question
        retrieved_code (list[dict]) relevant code chunks from FAISS
        history        (list[dict]) prior messages:
                                    [{"role": "user"|"assistant", "content": "..."}, ...]

    Returns:
        str — the AI answer
    """

    if not retrieved_code:
        return "No relevant code was found in the repository."

    # ── Build code context string ─────────────────────────────────────────────
    context_parts = []

    for item in retrieved_code:
        file = item.get("file", "unknown_file")
        code = item.get("code", "")
        context_parts.append(f"File: {file}\nCode:\n{code}")

    context = "\n\n".join(context_parts)

    # ── System prompt ─────────────────────────────────────────────────────────
    system_prompt = """You are an expert software engineer helping a developer understand a codebase.
You have memory of the full conversation so far.
When the user asks follow-up questions like "what does that function call?" or "explain that further",
use the conversation history to understand what they are referring to.
Always reference file names and function names in your answers where possible."""

    # ── Build messages list for Groq ──────────────────────────────────────────
    # Structure:
    #   1. system message
    #   2. all prior conversation turns (user + assistant alternating)
    #   3. current user question with fresh code context injected

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # inject prior turns (skip the very last user message — we re-add it below
    # with fresh code context so the model always has relevant snippets)
    for msg in history:
        messages.append({
            "role":    msg["role"],
            "content": msg["content"]
        })

    # current question with code context attached
    current_message = f"""Question: {question}

Relevant Code Snippets for this question:
{context}

Explain clearly how the code relates to the question.
If this is a follow-up, use the conversation history above to understand the context."""

    messages.append({"role": "user", "content": current_message})

    # ── Call Groq ─────────────────────────────────────────────────────────────
    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.2
    )

    return completion.choices[0].message.content