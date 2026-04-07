import ast
import os


def parse_python_files(directory):
    parsed_data = []

    for root, dirs, files in os.walk(directory):

        dirs[:] = [d for d in dirs if d not in (".git", "__pycache__", ".venv", "venv", "node_modules")]

        for file in files:

            if file.endswith(".py"):

                file_path = os.path.join(root, file)

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        source_code = f.read()

                    tree = ast.parse(source_code)

                    for node in ast.walk(tree):

                        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):

                            code_segment = ast.get_source_segment(source_code, node)

                            calls = []

                            for child in ast.walk(node):

                                if isinstance(child, ast.Call):

                                    if isinstance(child.func, ast.Name):
                                        calls.append(child.func.id)

                                    elif isinstance(child.func, ast.Attribute):
                                        calls.append(child.func.attr)

                            parsed_data.append({
                                "file": os.path.basename(file_path),
                                "language": "python",
                                "function_name": node.name,
                                "calls": list(set(calls)),
                                "code": code_segment,
                                "start_line": node.lineno,
                                "end_line": node.end_lineno
                            })

                except Exception as e:
                    print(f"Error parsing {file}: {e}")

    return parsed_data


def _parse_js_ts(directory):
    try:
        from app.services.js_parser import parse_js_ts_files
        return parse_js_ts_files(directory)
    except ImportError:
        print("[parser] tree-sitter JS/TS not installed - skipping .js/.ts files.")
        print("         Run: pip install tree-sitter tree-sitter-javascript tree-sitter-typescript")
        return []
    except Exception as exc:
        print(f"[parser] JS/TS parsing error: {exc}")
        return []


def _parse_java(directory):
    try:
        from app.services.java_parser import parse_java_files
        return parse_java_files(directory)
    except ImportError:
        print("[parser] tree-sitter Java not installed - skipping .java files.")
        print("         Run: pip install tree-sitter tree-sitter-java")
        return []
    except Exception as exc:
        print(f"[parser] Java parsing error: {exc}")
        return []


def parse_all_files(directory):
    results = []

    python_items = parse_python_files(directory)
    results.extend(python_items)
    print(f"[parser] Python  -> {len(python_items)} functions")

    js_items = _parse_js_ts(directory)
    results.extend(js_items)
    print(f"[parser] JS/TS   -> {len(js_items)} functions")

    java_items = _parse_java(directory)
    results.extend(java_items)
    print(f"[parser] Java    -> {len(java_items)} functions")

    print(f"[parser] Total   -> {len(results)} functions across all languages")
    return results