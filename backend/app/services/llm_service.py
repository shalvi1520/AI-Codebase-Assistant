from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── Helper — build a rich context string from retrieved chunks ────────────────

def _build_context(retrieved_code: list) -> str:
    """
    Formats retrieved code chunks into a context string for the LLM.
    Includes blame metadata (author, date, commit) when available.
    This makes the AI able to answer "who wrote X?" and "when was this changed?"
    """
    parts = []

    for item in retrieved_code:
        file    = item.get("file", "unknown_file")
        code    = item.get("code", "")
        author  = item.get("author", "")
        date    = item.get("last_modified", "")
        commit  = item.get("commit_message", "")
        email   = item.get("author_email", "")

        # Build blame line only if we actually have the data (Git repos only)
        blame_line = ""
        if author and author != "unknown":
            blame_line = (
                f"Author: {author}"
                + (f" <{email}>" if email else "")
                + (f"  |  Last modified: {date}" if date else "")
                + (f'  |  Commit: "{commit}"' if commit else "")
            )

        block = f"File: {file}\n"
        if blame_line:
            block += f"{blame_line}\n"
        block += f"Code:\n{code}"

        parts.append(block)

    return "\n\n".join(parts)


# ── Original function — stateless, no history — UNCHANGED ────────────────────

def generate_response(question: str, retrieved_code: list) -> str:

    if not retrieved_code:
        return "No relevant code was found in the repository."

    context = _build_context(retrieved_code)

    prompt = f"""
You are an expert software engineer helping a developer understand a codebase.

User Question:
{question}

Relevant Code Snippets:
{context}

Explain clearly how the code relates to the user's question.
If possible, reference the file names and functions in your explanation.
If author or date information is shown above a snippet, use it to answer
questions about who wrote the code or when it was last changed.
"""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    return completion.choices[0].message.content


# ── Function with conversation history — UNCHANGED ────────────────────────────

def generate_response_with_history(question: str, retrieved_code: list, history: list) -> str:
    """
    Generate a response using retrieved code context AND full conversation history.

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

    context = _build_context(retrieved_code)

    system_prompt = """You are an expert software engineer helping a developer understand a codebase.
You have memory of the full conversation so far.
When the user asks follow-up questions like "what does that function call?" or "explain that further",
use the conversation history to understand what they are referring to.
Always reference file names and function names in your answers where possible.
If author or date metadata is present in the code snippets, use it to answer
authorship and recency questions accurately."""

    messages = [{"role": "system", "content": system_prompt}]

    for msg in history:
        messages.append({"role": msg["role"], "content": msg["content"]})

    current_message = f"""Question: {question}

Relevant Code Snippets for this question:
{context}

Explain clearly how the code relates to the question.
If this is a follow-up, use the conversation history above to understand the context."""

    messages.append({"role": "user", "content": current_message})

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.2
    )

    return completion.choices[0].message.content


# ── NEW: answer git/repo metadata questions directly ─────────────────────────

def generate_git_response(question: str, repo_info: dict) -> str:
    """
    Answer questions about repo history, contributors, languages etc.
    repo_info comes directly from the stored git metadata JSON — NOT from FAISS.
    This ensures the AI always has real data and never says
    "I need access to the version control system".

    Parameters:
        question  (str)  — the user's question
        repo_info (dict) — output of get_rich_repo_info(), loaded from disk
    """

    stats        = repo_info.get("stats", {})
    latest       = repo_info.get("latest_commit", {})
    contributors = repo_info.get("top_contributors", [])
    commits      = repo_info.get("commit_log", [])
    languages    = repo_info.get("languages", [])
    branches     = repo_info.get("branches", [])

    # Build structured text blocks for the prompt
    contrib_str = "\n".join(
        f"  - {c['name']} <{c['email']}> ({c['commits']} commits)"
        for c in contributors
    ) or "  No contributor data available."

    commit_str = "\n".join(
        f"  [{c['sha']}] {c['date']} — {c['author']}: {c['message']}"
        for c in commits[:10]
    ) or "  No commit history available."

    lang_str = "\n".join(
        f"  - {l['language']}: {l['files']} files ({l['percent']}%)"
        for l in languages
    ) or "  No language data available."

    latest_str = (
        f"SHA {latest.get('sha','?')} | "
        f"Author: {latest.get('author','?')} <{latest.get('email','')}>  | "
        f"Date: {latest.get('date','?')} | "
        f"Message: \"{latest.get('message','?')}\""
    ) if latest else "No latest commit data available."

    context = f"""REPOSITORY METADATA (real data — use this to answer the question):

General Stats:
  - Total commits tracked : {stats.get('total_commits', 'N/A')}
  - Total indexed files   : {stats.get('total_files', 'N/A')}
  - Total contributors    : {stats.get('total_contributors', 'N/A')}
  - Total branches        : {stats.get('total_branches', 'N/A')}

Latest (most recent) commit:
  {latest_str}

Top contributors (by commit count):
{contrib_str}

Languages used:
{lang_str}

Branches: {', '.join(branches) if branches else 'N/A'}

Recent commit history (last 10):
{commit_str}
"""

    prompt = f"""You are an expert software engineer helping a developer understand a Git repository.

User Question:
{question}

{context}

Instructions:
- Answer the question DIRECTLY using only the metadata provided above.
- Do NOT say you need access to a version control system — you already have the data above.
- Do NOT say you cannot access git history — the history is provided above.
- If asked who made the last commit, state the exact author name and commit message from "Latest commit" above.
- If asked to summarize the repo, describe its contributors, languages, activity, and branches.
- If asked about languages, list them with file counts and percentages.
- If asked about contributors, list the names and commit counts.
- Be specific, concise, and reference the actual names/values from the data above.
"""

    completion = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    return completion.choices[0].message.content