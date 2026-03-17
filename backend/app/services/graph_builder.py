import os
from app.services.parser import parse_python_files


def build_dependency_graph(repo_name):
    """
    Build FUNCTION-LEVEL dependency graph (who calls whom)
    """

    # ✅ correct repo path
    repo_path = os.path.join("extracted", repo_name)

    nodes = set()
    edges = []

    # 🔥 parse all functions (with calls)
    parsed = parse_python_files(repo_path)

    # 🔥 collect all function names
    all_functions = set()

    for item in parsed:
        fn = item.get("function_name")
        if fn:
            all_functions.add(fn)

    # 🔥 ignore common built-in / useless calls
    ignore_calls = {
        "print", "len", "range", "str", "int", "float",
        "list", "dict", "set", "open", "input", "type",
        "super"
    }

    # 🔥 build function → function dependencies
    for item in parsed:

        source = item.get("function_name")
        if not source:
            continue

        nodes.add(source)

        for call in item.get("calls", []):

            # ✅ conditions for clean graph
            if (
                call in all_functions              # only internal functions
                and call != source                 # avoid self-loop
                and call not in ignore_calls       # ignore built-ins
            ):
                edges.append({
                    "source": source,
                    "target": call
                })

    return {
        "nodes": list(nodes),
        "edges": edges
    }