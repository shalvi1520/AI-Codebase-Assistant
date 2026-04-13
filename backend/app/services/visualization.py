import os
import pickle
from collections import defaultdict

VECTOR_DB_DIR = "vector_dbs"


def _load_metadata(repo_name: str) -> list:
    """
    Load pickled metadata saved by vector_store.add_embeddings().
    Tries both the exact repo_name and common variants (with/without .zip).
    Returns empty list if nothing found.
    """
    # Try exact name first
    candidates = [
        repo_name,
        repo_name.replace(".zip", ""),
        repo_name + ".zip",
    ]

    for name in candidates:
        meta_path = os.path.join(VECTOR_DB_DIR, f"{name}.pkl")
        if os.path.exists(meta_path):
            print(f"[visualization] Loading metadata from: {meta_path}")
            try:
                with open(meta_path, "rb") as f:
                    data = pickle.load(f)
                print(f"[visualization] Loaded {len(data)} entries")
                return data
            except Exception as e:
                print(f"[visualization] Failed to load {meta_path}: {e}")

    # List what IS available so we can debug
    if os.path.exists(VECTOR_DB_DIR):
        available = [f for f in os.listdir(VECTOR_DB_DIR) if f.endswith(".pkl")]
        print(f"[visualization] No pkl found for '{repo_name}'. Available: {available}")
    else:
        print(f"[visualization] vector_dbs/ directory does not exist")

    return []


def _risk_label(score: int) -> str:
    if score <= 5:
        return "low"
    elif score <= 10:
        return "medium"
    elif score <= 20:
        return "high"
    else:
        return "critical"


def build_heatmap(repo_name: str) -> dict:
    """
    Build the full complexity heatmap dataset for a repo.
    Reads from the pickled FAISS metadata — no re-parsing needed.
    """
    metadata = _load_metadata(repo_name)

    if not metadata:
        return {"functions": [], "by_file": [], "summary": {}}

    # ── Per-function list ─────────────────────────────────────────────────────
    functions = []
    skipped   = 0

    for item in metadata:
        raw_score = item.get("complexity", None)

        if raw_score is None:
            # This entry was indexed before complexity was added — skip it
            skipped += 1
            continue

        score = int(raw_score)
        start = item.get("start_line", 1)
        end   = item.get("end_line",   1)

        functions.append({
            "file":          item.get("file", "unknown"),
            "function_name": item.get("function_name", "unknown"),
            "complexity":    score,
            "risk":          _risk_label(score),
            "start_line":    start,
            "end_line":      end,
            "lines":         max(end - start + 1, 1),
            "language":      item.get("language", "unknown"),
        })

    if skipped > 0:
        print(f"[visualization] Skipped {skipped} entries with no complexity score (old index)")

    print(f"[visualization] Built heatmap with {len(functions)} scored functions")

    if not functions:
        return {"functions": [], "by_file": [], "summary": {}}

    # Sort worst first
    functions.sort(key=lambda x: x["complexity"], reverse=True)

    # ── Per-file aggregation ──────────────────────────────────────────────────
    file_groups: dict = defaultdict(list)
    for fn in functions:
        file_groups[fn["file"]].append(fn["complexity"])

    by_file = []
    for file_path, scores in file_groups.items():
        avg = round(sum(scores) / len(scores), 1)
        mx  = max(scores)
        by_file.append({
            "file":           file_path,
            "avg_complexity": avg,
            "max_complexity": mx,
            "risk":           _risk_label(mx),
            "function_count": len(scores),
        })

    by_file.sort(key=lambda x: x["max_complexity"], reverse=True)

    # ── Summary stats ─────────────────────────────────────────────────────────
    all_scores = [f["complexity"] for f in functions]
    total      = len(functions)

    summary = {
        "total_functions":    total,
        "low_count":          sum(1 for s in all_scores if s <= 5),
        "medium_count":       sum(1 for s in all_scores if 6  <= s <= 10),
        "high_count":         sum(1 for s in all_scores if 11 <= s <= 20),
        "critical_count":     sum(1 for s in all_scores if s > 20),
        "avg_complexity":     round(sum(all_scores) / total, 1),
        "max_complexity":     max(all_scores),
        "most_complex_fn":    functions[0]["function_name"],
        "most_complex_file":  functions[0]["file"],
    }

    return {
        "functions": functions,
        "by_file":   by_file,
        "summary":   summary,
    }