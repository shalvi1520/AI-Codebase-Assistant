"""
session_store.py
────────────────
In-memory session store for conversation history.

Each session stores a list of messages in the shape:
    [
        {"role": "user",      "content": "..."},
        {"role": "assistant", "content": "..."},
        ...
    ]

Sessions auto-expire after MAX_AGE_MINUTES of inactivity.
MAX_MESSAGES caps how many turns are kept per session (older ones drop off).
"""

from datetime import datetime, timedelta

# ── Config ────────────────────────────────────────────────────────────────────
MAX_MESSAGES    = 20          # max messages kept per session (10 turns)
MAX_AGE_MINUTES = 60          # sessions expire after 60 min of inactivity

# ── Storage ───────────────────────────────────────────────────────────────────
# Structure:
#   _sessions = {
#       "session_id": {
#           "messages":   [{"role": ..., "content": ...}, ...],
#           "last_active": datetime
#       }
#   }
_sessions: dict = {}


# ── Public API ────────────────────────────────────────────────────────────────

def get_history(session_id: str) -> list[dict]:
    """
    Return the message history for a session.
    Returns an empty list if the session does not exist or has expired.
    """
    _evict_expired()

    session = _sessions.get(session_id)
    if not session:
        return []

    session["last_active"] = datetime.utcnow()
    return session["messages"]


def add_message(session_id: str, role: str, content: str) -> None:
    """
    Append one message to a session's history.
    Creates the session if it does not exist.
    Trims to MAX_MESSAGES if needed (drops oldest messages).

    role must be "user" or "assistant".
    """
    _evict_expired()

    if session_id not in _sessions:
        _sessions[session_id] = {
            "messages":    [],
            "last_active": datetime.utcnow()
        }

    _sessions[session_id]["messages"].append({
        "role":    role,
        "content": content
    })

    _sessions[session_id]["last_active"] = datetime.utcnow()

    # trim oldest messages if over limit
    if len(_sessions[session_id]["messages"]) > MAX_MESSAGES:
        _sessions[session_id]["messages"] = (
            _sessions[session_id]["messages"][-MAX_MESSAGES:]
        )


def clear_session(session_id: str) -> None:
    """Delete all history for a session."""
    _sessions.pop(session_id, None)


def get_all_sessions() -> list[dict]:
    """
    Return a summary of all active sessions.
    Useful for debugging / admin.
    """
    _evict_expired()
    return [
        {
            "session_id":   sid,
            "message_count": len(data["messages"]),
            "last_active":  data["last_active"].isoformat()
        }
        for sid, data in _sessions.items()
    ]


# ── Internal ──────────────────────────────────────────────────────────────────

def _evict_expired() -> None:
    """Remove sessions that have been inactive longer than MAX_AGE_MINUTES."""
    cutoff = datetime.utcnow() - timedelta(minutes=MAX_AGE_MINUTES)
    expired = [
        sid for sid, data in _sessions.items()
        if data["last_active"] < cutoff
    ]
    for sid in expired:
        del _sessions[sid]