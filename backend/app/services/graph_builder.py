import os
import ast


def extract_imports(file_path):
    """
    Extract imported modules from a Python file.
    """

    imports = []

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            tree = ast.parse(f.read())

        for node in ast.walk(tree):

            # import numpy
            if isinstance(node, ast.Import):
                for n in node.names:
                    imports.append(n.name.split(".")[0])

            # from numpy import array
            if isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module.split(".")[0])

    except Exception:
        # Ignore files that fail to parse
        pass

    return imports


def build_dependency_graph(repo_name):
    """
    Build dependency graph of Python files in extracted repo.
    """

    repo_path = "extracted"

    nodes = set()
    edges = []

    python_files = []

    # ---------- FIND ALL PY FILES ----------
    for root, _, files in os.walk(repo_path):
        for file in files:
            if file.endswith(".py"):
                python_files.append(os.path.join(root, file))

    # ---------- BUILD GRAPH ----------
    for file_path in python_files:

        file_name = os.path.basename(file_path)

        nodes.add(file_name)

        imports = extract_imports(file_path)

        for imp in imports:
            edges.append({
                "source": file_name,
                "target": imp
            })

    return {
        "nodes": list(nodes),
        "edges": edges
    }