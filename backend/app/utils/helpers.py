import os
import shutil
import git  # pip install gitpython
from collections import defaultdict
import stat

EXTRACT_DIR = "extracted"


def clone_repo(git_url: str, repo_name: str) -> str:
    """
    Clone a remote Git repo into extracted/<repo_name>.
    Returns the local path.
    depth=50 keeps the clone fast while still giving enough history for blame.
    """
    repo_path = os.path.join(EXTRACT_DIR, repo_name)

    def _remove_readonly(func, path, _):
        """Clear read-only flag on Windows and retry deletion."""
        os.chmod(path, stat.S_IWRITE)
        func(path)
    

    if os.path.exists(repo_path):
        shutil.rmtree(repo_path, onexc=_remove_readonly)

    os.makedirs(repo_path, exist_ok=True)

    git.Repo.clone_from(git_url, repo_path, depth=50)

    return repo_path


def get_blame_for_file(repo_path: str, relative_file_path: str) -> dict:
    """
    Returns a dict mapping line_number -> { author, email, committed_date, message }
    for a single file inside the repo.

    relative_file_path must be relative to repo root, e.g. "src/auth/service.py"
    """
    blame_map = {}

    try:
        repo = git.Repo(repo_path)
        blame = repo.blame("HEAD", relative_file_path)

        line_number = 1

        for commit, lines in blame:
            for _ in lines:
                blame_map[line_number] = {
                    "author":         commit.author.name,
                    "email":          commit.author.email,
                    "committed_date": commit.committed_datetime.strftime("%Y-%m-%d"),
                    "message":        commit.message.strip().splitlines()[0]
                }
                line_number += 1

    except Exception as e:
        print(f"[blame] Failed for {relative_file_path}: {e}")

    return blame_map


def get_blame_for_function(blame_map: dict, start_line: int, end_line: int) -> dict:
    """
    Given a full file blame_map and a function's line range,
    returns the blame info for the first line of the function.
    This is what gets stored in metadata per function.
    """
    return blame_map.get(start_line, {
        "author":         "unknown",
        "email":          "",
        "committed_date": "",
        "message":        ""
    })


def get_commit_log(repo_path: str, max_commits: int = 20) -> list:
    """
    Returns the last N commits as a list of dicts.
    Stored as repo-level metadata.
    """
    commits = []

    try:
        repo = git.Repo(repo_path)

        for commit in list(repo.iter_commits("HEAD", max_count=max_commits)):
            commits.append({
                "sha":     commit.hexsha[:7],
                "author":  commit.author.name,
                "email":   commit.author.email,
                "date":    commit.committed_datetime.strftime("%Y-%m-%d"),
                "message": commit.message.strip().splitlines()[0]
            })

    except Exception as e:
        print(f"[commit-log] Failed: {e}")

    return commits


def get_rich_repo_info(repo_path: str) -> dict:
    """
    Returns comprehensive repo metadata in one call:
      - commit_log       : last 20 commits
      - collaborators    : all unique authors with commit counts
      - top_contributors : top 5 by commit count
      - languages        : file counts + percentages per language
      - branches         : list of branch names
      - latest_commit    : full detail of HEAD commit
      - stats            : total_commits, total_files, total_contributors, total_branches
    """
    info = {
        "commit_log":       [],
        "collaborators":    [],
        "top_contributors": [],
        "languages":        [],
        "branches":         [],
        "latest_commit":    {},
        "stats":            {},
    }

    try:
        repo = git.Repo(repo_path)

        # ── Commits ──────────────────────────────────────────────────────────
        all_commits = list(repo.iter_commits("HEAD", max_count=50))

        info["commit_log"] = [
            {
                "sha":     c.hexsha[:7],
                "author":  c.author.name,
                "email":   c.author.email,
                "date":    c.committed_datetime.strftime("%Y-%m-%d"),
                "message": c.message.strip().splitlines()[0]
            }
            for c in all_commits[:20]
        ]

        # ── Collaborators / contributors ──────────────────────────────────────
        author_counts: dict = defaultdict(lambda: {"commits": 0, "email": ""})

        for c in all_commits:
            name = c.author.name
            author_counts[name]["commits"] += 1
            author_counts[name]["email"]    = c.author.email

        collaborators = [
            {"name": name, "email": d["email"], "commits": d["commits"]}
            for name, d in author_counts.items()
        ]
        collaborators.sort(key=lambda x: x["commits"], reverse=True)

        info["collaborators"]    = collaborators
        info["top_contributors"] = collaborators[:5]

        # ── Language breakdown from file extensions ───────────────────────────
        ext_map = {
            ".py":   "Python",
            ".js":   "JavaScript",
            ".ts":   "TypeScript",
            ".tsx":  "TypeScript/React",
            ".jsx":  "JavaScript/React",
            ".java": "Java",
            ".go":   "Go",
            ".rs":   "Rust",
            ".cpp":  "C++",
            ".c":    "C",
            ".cs":   "C#",
            ".rb":   "Ruby",
            ".php":  "PHP",
            ".swift":"Swift",
            ".kt":   "Kotlin",
            ".html": "HTML",
            ".css":  "CSS",
            ".scss": "SCSS",
            ".md":   "Markdown",
            ".json": "JSON",
            ".yaml": "YAML",
            ".yml":  "YAML",
        }

        lang_counts: dict = defaultdict(int)
        total_files = 0

        for blob in repo.tree().traverse():
            if hasattr(blob, "path") and "." in blob.name:
                ext  = os.path.splitext(blob.name)[1].lower()
                lang = ext_map.get(ext)
                if lang:
                    lang_counts[lang] += 1
                    total_files += 1

        info["languages"] = [
            {
                "language": lang,
                "files":    count,
                "percent":  round(count / total_files * 100, 1) if total_files else 0
            }
            for lang, count in sorted(lang_counts.items(), key=lambda x: x[1], reverse=True)
        ]

        # ── Branches ─────────────────────────────────────────────────────────
        try:
            info["branches"] = [str(b) for b in repo.branches]
        except Exception:
            info["branches"] = []

        # ── Latest commit ─────────────────────────────────────────────────────
        if all_commits:
            lc = all_commits[0]
            info["latest_commit"] = {
                "sha":     lc.hexsha[:7],
                "author":  lc.author.name,
                "email":   lc.author.email,
                "date":    lc.committed_datetime.strftime("%Y-%m-%d %H:%M"),
                "message": lc.message.strip().splitlines()[0]
            }

        # ── Stats ─────────────────────────────────────────────────────────────
        info["stats"] = {
            "total_commits":      len(all_commits),
            "total_files":        total_files,
            "total_contributors": len(collaborators),
            "total_branches":     len(info["branches"]),
        }

    except Exception as e:
        print(f"[repo-info] Failed: {e}")

    return info