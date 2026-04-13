"""
doc_generator.py
────────────────
Auto Documentation Generator service.

Generates three types of documentation from indexed code:
  1. README.md         — high-level project overview
  2. Function docs     — per-function explanations with params/returns/examples
  3. API docs          — endpoint documentation (FastAPI / Express style)

All generation is powered by the same Groq LLM client already wired
into the project — no new dependencies needed.
"""

from groq import Groq
import os
import json
import pickle
from dotenv import load_dotenv
from collections import defaultdict

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VECTOR_DB_DIR = "vector_dbs"
DOCS_DIR      = "generated_docs"
os.makedirs(DOCS_DIR, exist_ok=True)


# ─────────────────────────────────────────────────────────────
#  Internal helpers
# ─────────────────────────────────────────────────────────────

def _load_metadata(repo_name: str) -> list:
    """Load FAISS metadata (pickled list of function dicts)."""
    candidates = [
        repo_name,
        repo_name.replace(".zip", ""),
        repo_name + ".zip",
    ]
    for name in candidates:
        path = os.path.join(VECTOR_DB_DIR, f"{name}.pkl")
        if os.path.exists(path):
            with open(path, "rb") as f:
                return pickle.load(f)
    return []


def _load_repo_info(repo_name: str) -> dict:
    """Load cached git metadata JSON (may not exist for ZIP uploads)."""
    path = os.path.join("repo_info", f"{repo_name}.json")
    if os.path.exists(path):
        try:
            with open(path, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _group_by_file(metadata: list) -> dict:
    """Group function metadata dicts by their file path."""
    grouped = defaultdict(list)
    for item in metadata:
        grouped[item.get("file", "unknown")].append(item)
    return dict(grouped)


def _detect_api_endpoints(metadata: list) -> list:
    """
    Heuristically detect API endpoint functions.
    Matches FastAPI (@router.get/post/put/delete), Express (app.get/post),
    Flask (@app.route), and similar patterns by checking function names
    and code content.
    """
    api_keywords = [
        "@router.", "@app.route", "app.get(", "app.post(", "app.put(", "app.delete(",
        "@get(", "@post(", "@put(", "@delete(", "@patch(",
        "router.get(", "router.post(", "router.put(", "router.delete(",
        "res.json(", "res.send(", "return JSONResponse", "return Response",
    ]
    endpoints = []
    for item in metadata:
        code = item.get("code", "")
        if any(kw in code for kw in api_keywords):
            endpoints.append(item)
    return endpoints


def _call_llm(prompt: str, model: str = "llama-3.3-70b-versatile", temperature: float = 0.3) -> str:
    """Thin wrapper around Groq completion."""
    completion = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=4096,
    )
    return completion.choices[0].message.content.strip()


# ─────────────────────────────────────────────────────────────
#  1. README Generator
# ─────────────────────────────────────────────────────────────

def generate_readme(repo_name: str) -> dict:
    """
    Generate a comprehensive README.md for the repository.

    Returns:
        {
            "content": str,          # full markdown text
            "sections": list[str],   # section titles detected
            "word_count": int,
        }
    """
    metadata  = _load_metadata(repo_name)
    repo_info = _load_repo_info(repo_name)

    if not metadata:
        return {"content": "# Error\n\nNo indexed code found for this repository.", "sections": [], "word_count": 0}

    # Build a compact code summary (avoid blowing the context window)
    grouped   = _group_by_file(metadata)
    file_list = list(grouped.keys())[:30]   # cap at 30 files

    file_summaries = []
    for fpath in file_list:
        fns = [item["function_name"] for item in grouped[fpath] if item.get("function_name")]
        file_summaries.append(f"  - {fpath}: {', '.join(fns[:8])}")

    # Language breakdown
    lang_counts: dict = defaultdict(int)
    for item in metadata:
        lang_counts[item.get("language", "unknown")] += 1
    lang_str = ", ".join(f"{lang} ({cnt} fns)" for lang, cnt in sorted(lang_counts.items(), key=lambda x: -x[1]))

    # Git stats (optional)
    git_block = ""
    if repo_info:
        stats       = repo_info.get("stats", {})
        contributors = repo_info.get("top_contributors", [])[:5]
        contrib_str = ", ".join(c["name"] for c in contributors)
        git_block = f"""
Git Stats:
  - Total commits: {stats.get('total_commits', 'N/A')}
  - Contributors: {contrib_str or 'N/A'}
  - Branches: {', '.join(repo_info.get('branches', [])) or 'N/A'}
"""

    prompt = f"""You are a technical writer generating a professional README.md for a software project.

Repository name: {repo_name}
Languages: {lang_str}
Total functions indexed: {len(metadata)}
{git_block}
File structure (sample):
{chr(10).join(file_summaries)}

Generate a COMPLETE, PROFESSIONAL README.md with these sections:
1. # Project Title (infer a good name from the repo name and files)
2. ## Overview — what this project does in 2–3 sentences
3. ## Features — bullet list of key features inferred from the code
4. ## Tech Stack — languages, frameworks, libraries detected
5. ## Project Structure — describe the folder/file layout
6. ## Getting Started — installation and setup steps (infer from files)
7. ## API Reference — brief overview of endpoints if detected
8. ## Architecture — how the main components connect
9. ## Contributing — standard contributing guide
10. ## License — placeholder

Rules:
- Use real markdown formatting with proper headers, code blocks, badges
- Infer SPECIFIC details from the actual file names and function names provided
- Do NOT write generic placeholder text — make it specific to THIS project
- Add relevant badges (language, license) using shields.io markdown syntax
- Keep it professional and concise (400–700 words)
- Output ONLY the markdown, no preamble or explanation
"""

    content = _call_llm(prompt)

    # Extract section titles
    sections = [line.lstrip("#").strip() for line in content.split("\n") if line.startswith("#")]

    return {
        "content":    content,
        "sections":   sections,
        "word_count": len(content.split()),
    }


# ─────────────────────────────────────────────────────────────
#  2. Function Documentation Generator
# ─────────────────────────────────────────────────────────────

def generate_function_docs(repo_name: str, file_filter: str = "") -> dict:
    """
    Generate JSDoc / docstring-style documentation for every function.

    Parameters:
        repo_name   — repo identifier
        file_filter — optional; only document functions in files whose
                      path contains this string (e.g. "services/auth")

    Returns:
        {
            "docs": list[{
                "file": str,
                "function_name": str,
                "language": str,
                "documentation": str,   # generated doc comment
                "complexity": int,
                "risk": str,
            }],
            "total": int,
            "markdown": str,            # full markdown document
        }
    """
    metadata = _load_metadata(repo_name)
    if not metadata:
        return {"docs": [], "total": 0, "markdown": ""}

    # Apply file filter
    if file_filter:
        metadata = [m for m in metadata if file_filter.lower() in m.get("file", "").lower()]

    # Cap to avoid rate limits (100 functions max per call — batch if needed)
    metadata = metadata[:100]

    docs = []
    grouped = _group_by_file(metadata)

    markdown_parts = [f"# Function Documentation\n\n*Auto-generated for `{repo_name}`*\n"]

    for file_path, items in grouped.items():
        markdown_parts.append(f"\n---\n\n## 📄 `{file_path}`\n")

        for item in items:
            fn_name    = item.get("function_name", "unknown")
            code       = item.get("code", "")
            language   = item.get("language", "unknown")
            complexity = item.get("complexity", 0)
            risk       = item.get("risk", "unknown")

            if not code or len(code.strip()) < 10:
                continue

            # Trim very long functions to save tokens
            code_preview = code[:1500] + ("\n... (truncated)" if len(code) > 1500 else "")

            prompt = f"""You are a documentation expert. Generate concise, accurate documentation for this function.

Language: {language}
File: {file_path}
Function: {fn_name}
Cyclomatic Complexity: {complexity} ({risk} risk)

Code:
```{language}
{code_preview}
```

Generate documentation in this EXACT format (no extra text):

**Purpose:** One sentence describing what this function does.

**Parameters:**
- `param_name` (type): description
(list all parameters, or write "None" if no parameters)

**Returns:** What the function returns, or "None" for void functions.

**Side Effects:** Any I/O, database calls, mutations, or "None".

**Complexity Note:** Brief note about complexity score {complexity} and what it means for testing/maintenance.

**Example Usage:**
```{language}
# Brief example showing how to call this function
```
"""

            try:
                doc = _call_llm(prompt, model="llama-3.1-8b-instant", temperature=0.2)
            except Exception as e:
                doc = f"*Documentation generation failed: {e}*"

            docs.append({
                "file":          file_path,
                "function_name": fn_name,
                "language":      language,
                "documentation": doc,
                "complexity":    complexity,
                "risk":          risk,
                "start_line":    item.get("start_line", 1),
                "end_line":      item.get("end_line", 1),
            })

            # Risk badge
            risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴", "critical": "💀"}.get(risk, "⚪")

            markdown_parts.append(
                f"\n### `{fn_name}` {risk_emoji} complexity: {complexity}\n\n{doc}\n"
            )

    markdown = "\n".join(markdown_parts)

    return {
        "docs":     docs,
        "total":    len(docs),
        "markdown": markdown,
    }


# ─────────────────────────────────────────────────────────────
#  3. API Documentation Generator
# ─────────────────────────────────────────────────────────────

def generate_api_docs(repo_name: str) -> dict:
    """
    Generate OpenAPI-style documentation for detected API endpoints.

    Returns:
        {
            "endpoints": list[{
                "function_name": str,
                "file": str,
                "documentation": str,
            }],
            "total": int,
            "markdown": str,
            "has_endpoints": bool,
        }
    """
    metadata  = _load_metadata(repo_name)
    repo_info = _load_repo_info(repo_name)

    if not metadata:
        return {"endpoints": [], "total": 0, "markdown": "", "has_endpoints": False}

    endpoints = _detect_api_endpoints(metadata)

    if not endpoints:
        return {
            "endpoints":    [],
            "total":        0,
            "markdown":     "# API Documentation\n\nNo API endpoints detected in this repository.",
            "has_endpoints": False,
        }

    repo_display = repo_name.replace("-", " ").replace("_", " ").title()

    markdown_parts = [
        f"# API Documentation\n\n*Auto-generated for `{repo_name}`*\n\n"
        f"> **Base URL:** `http://localhost:8000` *(update as needed)*\n\n"
        f"---\n"
    ]

    documented_endpoints = []

    for item in endpoints[:50]:   # cap at 50 endpoints
        fn_name  = item.get("function_name", "unknown")
        code     = item.get("code", "")
        language = item.get("language", "unknown")
        file_path = item.get("file", "")

        code_preview = code[:1200] + ("\n... (truncated)" if len(code) > 1200 else "")

        prompt = f"""You are an API documentation expert writing OpenAPI/REST docs.

Analyze this endpoint function and generate documentation.

Language: {language}
File: {file_path}
Function: {fn_name}

Code:
```{language}
{code_preview}
```

Generate documentation in this EXACT format:

**Endpoint:** `METHOD /path` (infer from decorators or function name)

**Description:** One sentence describing what this endpoint does.

**Authentication:** Required / Not required (infer from code)

**Request Body / Parameters:**
```json
{{
  "field": "type — description"
}}
```
(or "None" if no body)

**Response (200 OK):**
```json
{{
  "field": "type — description"
}}
```

**Error Responses:**
- `400` — description
- `401` — description
(list likely errors based on code)

**Notes:** Any important implementation details (rate limits, side effects, etc.)
"""

        try:
            doc = _call_llm(prompt, model="llama-3.1-8b-instant", temperature=0.2)
        except Exception as e:
            doc = f"*Documentation generation failed: {e}*"

        documented_endpoints.append({
            "function_name": fn_name,
            "file":          file_path,
            "documentation": doc,
        })

        markdown_parts.append(f"\n## `{fn_name}`\n\n*File: `{file_path}`*\n\n{doc}\n\n---\n")

    markdown = "\n".join(markdown_parts)

    return {
        "endpoints":     documented_endpoints,
        "total":         len(documented_endpoints),
        "markdown":      markdown,
        "has_endpoints": True,
    }


# ─────────────────────────────────────────────────────────────
#  4. Save docs to disk (optional persistence)
# ─────────────────────────────────────────────────────────────

def save_docs_to_disk(repo_name: str, doc_type: str, content: str) -> str:
    """
    Save generated documentation markdown to DOCS_DIR.
    Returns the saved file path.
    """
    safe_name = repo_name.replace("/", "_").replace("\\", "_")
    filename  = f"{safe_name}_{doc_type}.md"
    path      = os.path.join(DOCS_DIR, filename)

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[doc_generator] Saved {doc_type} docs to {path}")
    return path