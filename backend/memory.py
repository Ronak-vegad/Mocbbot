"""
Memory management for conversations.
Uses a simple list-based window memory to avoid deprecated LangChain imports.
Compatible with LangChain 0.2+
"""
from typing import Dict, List
import database

# In-memory store: conversation_id -> list of {"role": "user"|"assistant", "content": str}
_memory_store: Dict[str, List[dict]] = {}

WINDOW_SIZE = 10  # Keep last 10 messages (5 exchanges)


def get_memory(conversation_id: str) -> List[dict]:
    """Get the in-memory message history for a conversation."""
    if conversation_id not in _memory_store:
        _memory_store[conversation_id] = []
    return _memory_store[conversation_id]


async def load_memory_from_db(conversation_id: str):
    """Populate in-memory store from SQLite on first access (supports page reload)."""
    if conversation_id in _memory_store:
        return  # Already loaded

    messages = await database.get_messages(conversation_id)
    _memory_store[conversation_id] = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
    ]


def add_to_memory(conversation_id: str, human_message: str, ai_message: str):
    """Add a human/AI exchange to conversation memory (windowed)."""
    history = get_memory(conversation_id)
    history.append({"role": "user", "content": human_message})
    history.append({"role": "assistant", "content": ai_message})

    # Keep only the last WINDOW_SIZE messages
    if len(history) > WINDOW_SIZE * 2:
        _memory_store[conversation_id] = history[-(WINDOW_SIZE * 2):]


def clear_memory(conversation_id: str):
    """Clear in-memory state for a conversation."""
    _memory_store.pop(conversation_id, None)


def get_chat_history_string(conversation_id: str) -> str:
    """Return chat history as a formatted string for LangChain prompts."""
    history = get_memory(conversation_id)
    lines = []
    for msg in history[-(WINDOW_SIZE * 2):]:
        role = "Human" if msg["role"] == "user" else "Assistant"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def get_chat_history_messages(conversation_id: str) -> List[dict]:
    """Return raw list of {"role", "content"} dicts."""
    return get_memory(conversation_id)[-(WINDOW_SIZE * 2):]
