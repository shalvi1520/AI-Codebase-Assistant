import os
from tree_sitter import Language, Parser
import tree_sitter_java as tjava


JAVA_LANGUAGE = Language(tjava.language())


FUNCTION_NODE_TYPES = {
    "method_declaration",
    "constructor_declaration",
}

CALL_NODE_TYPES = {
    "method_invocation",
    "object_creation_expression",
    "explicit_generic_invocation",
}


def _node_text(node, source_bytes):
    return source_bytes[node.start_byte: node.end_byte].decode("utf-8", errors="replace")


def _extract_method_name(node, source_bytes):
    name_node = node.child_by_field_name("name")
    if name_node:
        return _node_text(name_node, source_bytes)
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
            name_node = current.child_by_field_name("name")
            if name_node:
                calls.append(_node_text(name_node, source_bytes))
            elif current.type == "object_creation_expression":
                type_node = current.child_by_field_name("type")
                if type_node:
                    calls.append(_node_text(type_node, source_bytes))

        stack.extend(current.children)

    return list(set(calls))


def _collect_methods(node, source_bytes, relative_path, result, visited=None):
    if visited is None:
        visited = set()

    if id(node) in visited:
        return
    visited.add(id(node))

    if node.type in FUNCTION_NODE_TYPES:
        name       = _extract_method_name(node, source_bytes)
        code       = _node_text(node, source_bytes)
        calls      = _collect_calls(node, source_bytes)
        start_line = node.start_point[0] + 1
        end_line   = node.end_point[0]   + 1

        result.append({
            "file":          relative_path,   # ← full relative path, not just basename
            "language":      "java",
            "function_name": name,
            "calls":         calls,
            "code":          code,
            "start_line":    start_line,
            "end_line":      end_line,
        })

    for child in node.children:
        _collect_methods(child, source_bytes, relative_path, result, visited)


def parse_java_files(directory):
    parsed_data = []

    for root, dirs, files in os.walk(directory):
        # Skip folders that are never user code
        dirs[:] = [
            d for d in dirs
            if d not in ("build", "target", ".gradle", ".git", "out", "__pycache__")
        ]

        for filename in files:
            if not filename.endswith(".java"):
                continue

            file_path = os.path.join(root, filename)

            # ── FIX: store relative path, not just basename ───────────────────
            relative_path = os.path.relpath(file_path, directory)

            try:
                with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                    source_code = f.read()

                source_bytes = source_code.encode("utf-8")
                parser       = Parser(JAVA_LANGUAGE)
                tree         = parser.parse(source_bytes)

                _collect_methods(
                    tree.root_node,
                    source_bytes,
                    relative_path,   # ← was: filename (basename only)
                    parsed_data,
                )

            except Exception as exc:
                print(f"[java_parser] Error parsing {filename}: {exc}")

    return parsed_data