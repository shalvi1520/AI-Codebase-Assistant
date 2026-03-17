def detect_query_type(query: str) -> str:
    """
    Detect what type of query the user is asking.

    Returns:
        "graph"        -> dependency graph visualization
        "code_finder"  -> locate specific function/file
        "chat"         -> normal AI explanation
    """

    if not query:
        return "chat"

    q = query.lower().strip()

    # ---------- KEYWORDS FOR DEPENDENCY GRAPH ----------
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

    # ---------- KEYWORDS FOR CODE FINDER ----------
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

    # ---------- CHECK GRAPH ----------
    for word in graph_keywords:
        if word in q:
            return "graph"

    # ---------- CHECK FINDER ----------
    for word in finder_keywords:
        if word in q:
            return "code_finder"

    # ---------- DEFAULT ----------
    return "chat"