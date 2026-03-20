import os
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

import chromadb
from langchain_ollama import OllamaEmbeddings
from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Persistent ChromaDB client
_chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Cache of collection-level Chroma instances: conversation_id -> Chroma
_stores = {}


def _get_embeddings():
    return OllamaEmbeddings(
        model=EMBED_MODEL,
        base_url=OLLAMA_BASE_URL,
    )


def _get_store(conversation_id: str) -> Chroma:
    if conversation_id not in _stores:
        _stores[conversation_id] = Chroma(
            client=_chroma_client,
            collection_name=f"conv_{conversation_id.replace('-', '_')}",
            embedding_function=_get_embeddings(),
        )
    return _stores[conversation_id]


def embed_document(conversation_id: str, text: str, filename: str, file_id: str):
    """Chunk, embed, and store document text into ChromaDB for the conversation."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    if not chunks:
        return 0

    store = _get_store(conversation_id)
    metadatas = [{"filename": filename, "file_id": file_id, "chunk_index": i} for i in range(len(chunks))]
    ids = [f"{file_id}_chunk_{i}" for i in range(len(chunks))]

    store.add_texts(texts=chunks, metadatas=metadatas, ids=ids)
    return len(chunks)


def query_store(conversation_id: str, query: str, k: int = 4) -> List[str]:
    """Retrieve the top-k relevant chunks from the conversation's ChromaDB collection."""
    try:
        store = _get_store(conversation_id)
        results = store.similarity_search(query, k=k)
        return [doc.page_content for doc in results]
    except Exception as e:
        return [f"[RAG error: {str(e)}]"]


def delete_collection(conversation_id: str):
    """Remove the ChromaDB collection for a conversation."""
    try:
        col_name = f"conv_{conversation_id.replace('-', '_')}"
        _chroma_client.delete_collection(col_name)
        _stores.pop(conversation_id, None)
    except Exception:
        pass


def collection_has_documents(conversation_id: str) -> bool:
    """Check if there are any documents embedded for this conversation."""
    try:
        store = _get_store(conversation_id)
        return store._collection.count() > 0
    except Exception:
        return False
