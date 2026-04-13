import ast
import os


# ═════════════════════════════════════════════════════════════
#  CYCLOMATIC COMPLEXITY  (no extra library — pure ast)
#
#  Cyclomatic complexity = 1 + number of decision points.
#  Decision points are any branching node in the AST:
#    if / elif / for / while / except / with / assert /
#    conditional expression (x if y else z) / boolean ops (and / or)
#
#  Risk bands:
#    1–5   → Low      (simple, easy to test)
#    6–10  → Medium   (moderate, still manageable)
#    11–20 → High     (complex, hard to test)
#    21+   → Critical (very complex, refactor recommended)
# ═════════════════════════════════════════════════════════════

COMPLEXITY_BRANCH_NODES = (
    ast.If,
    ast.For,
    ast.AsyncFor,
    ast.While,
    ast.ExceptHandler,
    ast.With,
    ast.AsyncWith,
    ast.Assert,
    ast.comprehension,
    ast.IfExp,          # ternary: x if cond else y
)


def compute_complexity(function_node: ast.AST) -> int:
    """
    Compute the cyclomatic complexity of a single function AST node.

    Formula: 1 + count(branch nodes) + count(boolean ops)

    Boolean operators (and / or) each add a branch because they can
    short-circuit — each operand beyond the first adds 1.
    """
    complexity = 1  # base

    for node in ast.walk(function_node):
        if isinstance(node, COMPLEXITY_BRANCH_NODES):
            complexity += 1
        elif isinstance(node, ast.BoolOp):
            # BoolOp.values has N operands → N-1 extra branches
            complexity += len(node.values) - 1

    return complexity


def complexity_risk(score: int) -> str:
    """Map a numeric complexity score to a risk label."""
    if score <= 5:
        return "low"
    elif score <= 10:
        return "medium"
    elif score <= 20:
        return "high"
    else:
        return "critical"


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

                        # ── Complexity (new) ──────────────────────────────────
                        complexity = compute_complexity(node)

                        parsed_data.append({
                            "file":          os.path.relpath(file_path, directory),
                            "language":      "python",
                            "function_name": node.name,
                            "calls":         list(set(calls)),
                            "code":          code_segment,
                            "start_line":    node.lineno,
                            "end_line":      node.end_lineno,
                            "complexity":    complexity,                  # NEW
                            "risk":          complexity_risk(complexity), # NEW
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
        file, language, function_name, calls, code, start_line, end_line,
        complexity, risk    ← added by this version

    'file' is always a relative path from the repo root, e.g.
        src/auth/service.py
        frontend/src/components/App.jsx

    complexity  int   cyclomatic complexity score (Python only; 0 for JS/Java until those parsers add it)
    risk        str   "low" | "medium" | "high" | "critical"
    """
    results = []

    python_items = parse_python_files(directory)
    results.extend(python_items)
    print(f"[parser] Python  -> {len(python_items)} functions")

    js_items = _parse_js_ts(directory)
    # JS/Java parsers don't compute complexity yet — fill defaults so
    # the heatmap endpoint never crashes on missing keys
    for item in js_items:
        item.setdefault("complexity", 0)
        item.setdefault("risk", "unknown")
    results.extend(js_items)
    print(f"[parser] JS/TS   -> {len(js_items)} functions")

    java_items = _parse_java(directory)
    for item in java_items:
        item.setdefault("complexity", 0)
        item.setdefault("risk", "unknown")
    results.extend(java_items)
    print(f"[parser] Java    -> {len(java_items)} functions")

    print(f"[parser] Total   -> {len(results)} functions across all languages")
    return results