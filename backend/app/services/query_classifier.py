def detect_query_type(query: str) -> str:
    """
    Detect what type of query the user is asking.

    Returns:
        "graph"       -> dependency graph visualization
        "git_info"    -> questions about commits, authors, contributors, languages (NEW)
        "code_finder" -> locate specific function/file
        "chat"        -> normal AI explanation
    """

    if not query:
        return "chat"

    q = query.lower().strip()

    # ── Git / repo metadata questions ─────────────────────────────────────────
    # MUST be checked BEFORE graph and finder to avoid misrouting.
    # These are questions about repo history, not code structure.
    git_keywords = [
        "who wrote",
        "who made",
        "who did",
        "who committed",
        "who created",
        "who built",
        "last commit",
        "latest commit",
        "recent commit",
        "commit history",
        "commit log",
        "collaborator",
        "contributor",
        "authored by",
        "when was",
        "when did",
        "languages used",
        "what language",
        "tech stack",
        "summarize the repo",
        "summarize this repo",
        "summarize the repository",
        "repo summary",
        "repository summary",
        "overview of the repo",
        "tell me about the repo",
        "about this repo",
        "what is this repo",
        "what does this repo",
        "how many commits",
        "how many contributors",
        "how many files",
        "how many branches",
        "list branches",
        "show branches",
        "show contributors",
        "list contributors",
    ]

    for kw in git_keywords:
        if kw in q:
            return "git_info"

    # ── Dependency graph ──────────────────────────────────────────────────────
    graph_keywords = [
        "dependency",
        "dependencies",
        "graph",
        "structure",
        "architecture",
        "visualize",
        "diagram",
        "code structure",
        "module structure"
    ]

    for word in graph_keywords:
        if word in q:
            return "graph"

    # ── Code finder ───────────────────────────────────────────────────────────
    finder_keywords = [
        "find",
        "locate",
        "where is",
        "where does",
        "which file",
        "show me",
        "open file",
        "go to",
        "search function"
    ]

    for word in finder_keywords:
        if word in q:
            return "code_finder"

    return "chat"