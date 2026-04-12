import ast
import os


# ═════════════════════════════════════════════════════════════
#  PYTHON parser  (uses built-in ast — no extra library needed)
# ═════════════════════════════════════════════════════════════

def parse_python_files(directory: str) -> list:
    parsed_data = []

    SKIP_DIRS = {".git", "__pycache__", ".venv", "venv", "node_modules", "dist", "build"}

    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for file in files:
            if not file.endswith(".py"):
                continue

            file_path = os.path.join(root, file)

            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
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
                            "file":          os.path.relpath(file_path, directory),  # relative path
                            "language":      "python",
                            "function_name": node.name,
                            "calls":         list(set(calls)),
                            "code":          code_segment,
                            "start_line":    node.lineno,
                            "end_line":      node.end_lineno,
                        })

            except Exception as e:
                print(f"[parser] Error parsing {file}: {e}")

    return parsed_data


# ═════════════════════════════════════════════════════════════
#  JS / TS  (delegates to js_parser.py)
# ═════════════════════════════════════════════════════════════

def _parse_js_ts(directory: str) -> list:
    try:
        from app.services.js_parser import parse_js_ts_files
        return parse_js_ts_files(directory)
    except ImportError:
        print("[parser] tree-sitter JS/TS not installed — skipping .js/.ts files.")
        print("         Run: pip install tree-sitter tree-sitter-javascript tree-sitter-typescript")
        return []
    except Exception as exc:
        print(f"[parser] JS/TS parsing error: {exc}")
        return []


# ═════════════════════════════════════════════════════════════
#  JAVA  (delegates to java_parser.py)
# ═════════════════════════════════════════════════════════════

def _parse_java(directory: str) -> list:
    try:
        from app.services.java_parser import parse_java_files
        return parse_java_files(directory)
    except ImportError:
        print("[parser] tree-sitter Java not installed — skipping .java files.")
        print("         Run: pip install tree-sitter tree-sitter-java")
        return []
    except Exception as exc:
        print(f"[parser] Java parsing error: {exc}")
        return []


# ═════════════════════════════════════════════════════════════
#  PUBLIC ENTRY POINT
# ═════════════════════════════════════════════════════════════

def parse_all_files(directory: str) -> list:
    """
    Parse ALL supported source files in *directory* recursively.
    Supported: .py  .js  .jsx  .mjs  .cjs  .ts  .tsx  .java

    Every returned dict has these keys:
        file, language, function_name, calls, code, start_line, end_line

    'file' is always a relative path from the repo root, e.g.
        src/auth/service.py
        frontend/src/components/App.jsx
    """
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