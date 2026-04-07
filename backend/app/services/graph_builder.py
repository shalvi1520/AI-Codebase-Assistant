import os
from app.services.parser import parse_all_files


def build_dependency_graph(repo_name):
    """
    Build FUNCTION-LEVEL dependency graph (who calls whom)
    """


    repo_path = os.path.join("extracted", repo_name)

    nodes = set()
    edges = []


    parsed = parse_all_files(repo_path)


    all_functions = set()

    for item in parsed:
        fn = item.get("function_name")
        if fn and fn != "<anonymous>":
            all_functions.add(fn)


    ignore_calls = {
        # Python builtins
        "print", "len", "range", "str", "int", "float",
        "list", "dict", "set", "open", "input", "type",
        "super",
        # JS builtins
        "console", "log", "JSON", "Object", "Array", "Math",
        "setTimeout", "setInterval", "clearTimeout", "clearInterval",
        "parseInt", "parseFloat", "fetch", "Promise", "then", "catch",
        "forEach", "map", "filter", "reduce", "find", "push", "pop",
        "includes", "indexOf", "slice", "splice", "join", "split",
        "toString", "valueOf", "hasOwnProperty",
        # Java builtins
        "System", "out", "println", "format",
        "equals", "hashCode", "getClass",
        "add", "get", "put", "remove", "size", "isEmpty",
        "length", "charAt", "substring", "contains"
    }


    for item in parsed:

        source = item.get("function_name")
        if not source or source == "<anonymous>":
            continue

        nodes.add(source)

        for call in item.get("calls", []):

            if (
                call in all_functions
                and call != source
                and call not in ignore_calls
            ):
                edges.append({
                    "source": source,
                    "target": call
                })

    return {
        "nodes": list(nodes),
        "edges": edges
    }