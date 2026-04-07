import ast
import os


def parse_python_files(directory):
    parsed_data = []

    for root, dirs, files in os.walk(directory):

        for file in files:

            if file.endswith(".py"):

                file_path = os.path.join(root, file)

                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        source_code = f.read()

                    tree = ast.parse(source_code)

                    for node in ast.walk(tree):

                        # ✅ ONLY FUNCTIONS
                        if isinstance(node, ast.FunctionDef):

                            code_segment = ast.get_source_segment(source_code, node)

                            # 🔥 NEW: FIND FUNCTION CALLS INSIDE THIS FUNCTION
                            calls = []

                            for child in ast.walk(node):

                                # Detect function calls like: func()
                                if isinstance(child, ast.Call):

                                    # Case 1: simple function call → func()
                                    if isinstance(child.func, ast.Name):
                                        calls.append(child.func.id)

                                    # Case 2: object.method()
                                    elif isinstance(child.func, ast.Attribute):
                                        calls.append(child.func.attr)

                            parsed_data.append({
                                "file": os.path.basename(file_path),
                                "function_name": node.name,
                                "calls": list(set(calls)),  # 🔥 REMOVE DUPLICATES
                                "code": code_segment,
                                "start_line": node.lineno,
                                "end_line": node.end_lineno
                            })

                except Exception as e:
                    print(f"Error parsing {file}: {e}")

    return parsed_data