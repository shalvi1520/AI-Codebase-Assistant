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
                        if isinstance(node, ast.FunctionDef):
                            parsed_data.append({
                                "file": file,
                                "function_name": node.name,
                                "code": ast.get_source_segment(source_code, node)
                            })

                except Exception as e:
                    print(f"Error parsing {file}: {e}")

    return parsed_data