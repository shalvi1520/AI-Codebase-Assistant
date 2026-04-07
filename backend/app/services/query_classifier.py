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

    
    for word in graph_keywords:
        if word in q:
            return "graph"

    
    for word in finder_keywords:
        if word in q:
            return "code_finder"

    
    return "chat"