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
    if node.type in ("function_declaration", "generator_function_declaration"):
        name_node = node.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    if node.type == "method_definition":
        name_node = node.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    parent = node.parent
    if parent and parent.type == "variable_declarator":
        name_node = parent.child_by_field_name("name")
        if name_node:
            return _node_text(name_node, source_bytes)

    if parent and parent.type == "assignment_expression":
        left = parent.child_by_field_name("left")
        if left:
            return _node_text(left, source_bytes)

    return "<anonymous>"


def _collect_calls(node, source_bytes):
    calls = []
    visited = set()
    stack = [node]

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


def _collect_functions(node, source_bytes, filename, language_label, result, visited=None):
    if visited is None:
        visited = set()

    if id(node) in visited:
        return
    visited.add(id(node))

    if node.type in FUNCTION_NODE_TYPES:
        name       = _extract_function_name(node, source_bytes)
        code       = _node_text(node, source_bytes)
        calls      = _collect_calls(node, source_bytes)
        start_line = node.start_point[0] + 1
        end_line   = node.end_point[0]   + 1

        result.append({
            "file":          filename,
            "language":      language_label,
            "function_name": name,
            "calls":         calls,
            "code":          code,
            "start_line":    start_line,
            "end_line":      end_line,
        })

    for child in node.children:
        _collect_functions(child, source_bytes, filename, language_label, result, visited)


def parse_js_ts_files(directory):
    SUPPORTED_EXTS = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"}
    parsed_data = []

    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", ".next", "build", ".git")]

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext not in SUPPORTED_EXTS:
                continue

            file_path      = os.path.join(root, filename)
            language_label = "typescript" if ext in (".ts", ".tsx") else "javascript"

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
                    filename,
                    language_label,
                    parsed_data,
                )

            except Exception as exc:
                print(f"[js_parser] Error parsing {filename}: {exc}")

    return parsed_data