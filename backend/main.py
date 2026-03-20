import os
import json
import httpx
import asyncio
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

import database
import memory as mem
import file_processor as fp
import vector_store as vs
import agent as ag
from models import ChatRequest, ConversationCreate

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")


# ─────────────────────────────────────────────
# Lifespan
# ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.create_tables()
    yield


app = FastAPI(title="AI Chatbot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Chat Endpoint (Streaming SSE)
# ─────────────────────────────────────────────
@app.post("/chat")
async def chat(request: ChatRequest):
    conversation_id = request.conversation_id
    message = request.message
    file_ids = request.file_ids or []
    model = request.model or os.getenv("DEFAULT_MODEL", "gpt-oss:20b")

    # Load memory from DB if this is the first time
    await mem.load_memory_from_db(conversation_id)

    # Save user message to DB
    await database.save_message(conversation_id, "user", message, file_ids)

    async def event_generator():
        full_response = ""
        try:
            stream = await ag.run_chat(
                message=message,
                conversation_id=conversation_id,
                model=model,
                file_ids=file_ids,
            )
            async for token in stream:
                full_response += token
                data = json.dumps({"token": token, "done": False})
                yield f"data: {data}\n\n"

        except Exception as e:
            error_msg = f"Error: {str(e)}"
            full_response = error_msg
            yield f"data: {json.dumps({'token': error_msg, 'done': False, 'error': True})}\n\n"

        finally:
            # Save assistant message + update memory
            if full_response:
                await database.save_message(conversation_id, "assistant", full_response)
                mem.add_to_memory(conversation_id, message, full_response)

            yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ─────────────────────────────────────────────
# File Upload
# ─────────────────────────────────────────────
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
):
    file_bytes = await file.read()
    content_type = file.content_type or ""

    result = await fp.process_file(file_bytes, file.filename, content_type)

    # If it's a text-based document, embed into ChromaDB for RAG
    if result.get("file_type") in ("pdf", "docx", "text", "csv", "excel") and result.get("content"):
        try:
            chunk_count = vs.embed_document(
                conversation_id=conversation_id,
                text=result["content"],
                filename=file.filename,
                file_id=result["file_id"],
            )
            result["chunks_embedded"] = chunk_count
        except Exception as e:
            result["embed_error"] = str(e)

    return {
        "file_id": result["file_id"],
        "filename": result["filename"],
        "file_type": result["file_type"],
        "content_preview": result.get("content", "")[:200] if result.get("content") else None,
        "chunks_embedded": result.get("chunks_embedded", 0),
    }


# ─────────────────────────────────────────────
# Conversations
# ─────────────────────────────────────────────
@app.get("/conversations")
async def list_conversations():
    return await database.get_conversations()


@app.post("/conversations")
async def create_conversation(body: ConversationCreate):
    return await database.create_conversation(body.title)


@app.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    await database.delete_conversation(conversation_id)
    mem.clear_memory(conversation_id)
    vs.delete_collection(conversation_id)
    return {"status": "deleted", "id": conversation_id}


@app.patch("/conversations/{conversation_id}")
async def rename_conversation(conversation_id: str, request: Request):
    body = await request.json()
    title = body.get("title", "")
    if not title:
        raise HTTPException(status_code=400, detail="Title is required")
    await database.update_conversation_title(conversation_id, title)
    return {"status": "updated", "id": conversation_id, "title": title}


@app.delete("/conversations/{conversation_id}/memory")
async def clear_conversation_memory(conversation_id: str):
    mem.clear_memory(conversation_id)
    return {"status": "memory_cleared", "id": conversation_id}


@app.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: str):
    await mem.load_memory_from_db(conversation_id)
    return await database.get_messages(conversation_id)


# ─────────────────────────────────────────────
# Models (proxy to Ollama cloud)
# ─────────────────────────────────────────────
@app.get("/models")
async def list_models():
    try:
        headers = {}
        if OLLAMA_API_KEY:
            headers["Authorization"] = f"Bearer {OLLAMA_API_KEY}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags", headers=headers)
            data = response.json()

        models = data.get("models", [])
        return {
            "models": [
                {
                    "name": m.get("name", m.get("model", "")),
                    "size": m.get("size", ""),
                    "modified_at": m.get("modified_at", ""),
                }
                for m in models
            ]
        }
    except Exception as e:
        # Return at least the default model if we can't reach the cloud
        return {
            "models": [
                {"name": os.getenv("DEFAULT_MODEL", "gpt-oss:20b"), "size": "", "modified_at": ""}
            ],
            "error": str(e),
        }


# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "model": os.getenv("DEFAULT_MODEL", "gpt-oss:20b")}
