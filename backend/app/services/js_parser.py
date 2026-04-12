import os
from tree_sitter import Language, Parser
import tree_sitter_javascript as tjs
import tree_sitter_typescript as tts


JS_LANGUAGE  = Language(tjs.language())
TS_LANGUAGE  = Language(tts.language_typescript())
TSX_LANGUAGE = Language(tts.language_tsx())


def _get_language(file_ext):
    if file_ext in (".ts",):
        return TS_LANGUAGE
    if file_ext in (".tsx",):
        return TSX_LANGUAGE
    return JS_LANGUAGE


FUNCTION_NODE_TYPES = {
    "function_declaration",
    "function",
    "arrow_function",
    "method_definition",
    "generator_function_declaration",
    "generator_function",
}

CALL_NODE_TYPES = {
    "call_expression",
    "new_expression",
}


def _node_text(node, source_bytes):
    return source_bytes[node.start_byte: node.end_byte].decode("utf-8", errors="replace")


def _extract_function_name(node, source_bytes):
    # Named function declarations: function foo() {}
    if node.type in ("function_declaration", "generator_function_declaration"):
        name_node = node.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    # Class method definitions: foo() {}
    if node.type == "method_definition":
        name_node = node.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    # Arrow / anonymous assigned to variable: const foo = () => {}
    parent = node.parent
    if parent and parent.type == "variable_declarator":
        name_node = parent.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    # Assigned to existing variable: foo = function() {}
    if parent and parent.type == "assignment_expression":
        left = parent.child_by_field_name("left")
        if left:
            return _node_text(left, source_bytes)

    return "<anonymous>"


def _collect_calls(node, source_bytes):
    calls   = []
    visited = set()
    stack   = [node]

    while stack:
        current = stack.pop()
        if id(current) in visited:
            continue
        visited.add(id(current))

        if current.type in CALL_NODE_TYPES:
            func_node = current.child_by_field_name("function")
            if func_node:
                if func_node.type == "identifier":
                    calls.append(_node_text(func_node, source_bytes))
                elif func_node.type == "member_expression":
                    prop = func_node.child_by_field_name("property")
                    if prop:
                        calls.append(_node_text(prop, source_bytes))

        stack.extend(current.children)

    return list(set(calls))


def _collect_functions(node, source_bytes, relative_path, language_label, result, visited=None):
    if visited is None:
        visited = set()

    if id(node) in visited:
        return
    visited.add(id(node))

    if node.type in FUNCTION_NODE_TYPES:
        name       = _extract_function_name(node, source_bytes)
        code       = _node_text(node, source_bytes)
        start_line = node.start_point[0] + 1
        end_line   = node.end_point[0]   + 1

        # ── Garbage filter ────────────────────────────────────────────────────
        # Skip one-liners and tiny anonymous callbacks — they are noise,
        # not meaningful code chunks for RAG retrieval.
        #
        # Rule 1: skip anything shorter than 30 characters
        if len(code.strip()) < 30:
            for child in node.children:
                _collect_functions(child, source_bytes, relative_path, language_label, result, visited)
            return

        # Rule 2: skip single-line anonymous functions (inline callbacks)
        if name == "<anonymous>" and "\n" not in code:
            for child in node.children:
                _collect_functions(child, source_bytes, relative_path, language_label, result, visited)
            return

        # Rule 3: skip anonymous functions shorter than 3 lines
        if name == "<anonymous>" and code.count("\n") < 3:
            for child in node.children:
                _collect_functions(child, source_bytes, relative_path, language_label, result, visited)
            return
        # ─────────────────────────────────────────────────────────────────────

        calls = _collect_calls(node, source_bytes)

        result.append({
            "file":          relative_path,   # ← full relative path, not just basename
            "language":      language_label,
            "function_name": name,
            "calls":         calls,
            "code":          code,
            "start_line":    start_line,
            "end_line":      end_line,
        })

    for child in node.children:
        _collect_functions(child, source_bytes, relative_path, language_label, result, visited)


def parse_js_ts_files(directory):
    SUPPORTED_EXTS = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"}
    parsed_data    = []

    for root, dirs, files in os.walk(directory):
        # Skip folders that are never user code
        dirs[:] = [
            d for d in dirs
            if d not in ("node_modules", "dist", ".next", "build", ".git", "__pycache__")
        ]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTS:
                continue

            file_path      = os.path.join(root, filename)
            language_label = "typescript" if ext in (".ts", ".tsx") else "javascript"

            # ── FIX: store relative path, not just basename ───────────────────
            relative_path = os.path.relpath(file_path, directory)

            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    source_code = f.read()

                source_bytes = source_code.encode("utf-8")
                lang         = _get_language(ext)
                parser       = Parser(lang)
                tree         = parser.parse(source_bytes)

                _collect_functions(
                    tree.root_node,
                    source_bytes,
                    relative_path,   # ← was: filename (basename only)
                    language_label,
                    parsed_data,
                )

            except Exception as exc:
                print(f"[js_parser] Error parsing {filename}: {exc}")

    return parsed_data