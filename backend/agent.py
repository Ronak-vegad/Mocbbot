import os
import asyncio
from typing import AsyncIterator, List
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-oss:20b")

from langchain_ollama import ChatOllama
from langchain_core.tools import Tool
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent

import vector_store as vs
import file_processor as fp
import memory as mem

# ─────────────────────────────────────────────
# LLM factory
# ─────────────────────────────────────────────
def _make_llm(model: str) -> ChatOllama:
    extra_kwargs = {}
    if OLLAMA_API_KEY:
        extra_kwargs["headers"] = {"Authorization": f"Bearer {OLLAMA_API_KEY}"}

    return ChatOllama(
        model=model,
        base_url=OLLAMA_BASE_URL,
        temperature=0.7,
        **extra_kwargs,
    )

# ─────────────────────────────────────────────
# Tool definitions
# ─────────────────────────────────────────────
def make_rag_tool(conversation_id: str):
    def rag_query(query: str) -> str:
        chunks = vs.query_store(conversation_id, query)
        if not chunks:
            return "No relevant document context found."
        return "\n\n---\n\n".join(chunks)

    return Tool(
        name="RAGTool",
        func=rag_query,
        description="Search uploaded documents. Input: a search query.",
    )

def make_calculator_tool():
    def calculate(expr: str) -> str:
        try:
            import numexpr
            result = numexpr.evaluate(expr.strip())
            return str(float(result))
        except Exception as e:
            try:
                return str(eval(expr.strip(), {"__builtins__": {}}, {}))
            except Exception:
                return f"Could not evaluate: {expr}. Error: {str(e)}"

    return Tool(
        name="CalculatorTool",
        func=calculate,
        description="Evaluate math expressions. Input: math expression like '2 * (3 + 4)'.",
    )

def make_summary_tool(conversation_id: str, model: str):
    def summarize(text: str) -> str:
        llm = _make_llm(model)
        chunks = vs.query_store(conversation_id, "summary overview main topics", k=6)
        if chunks:
            text = "\n".join(chunks)
        prompt = f"Please provide a concise summary of the following content:\n\n{text[:4000]}"
        response = llm.invoke(prompt)
        return response.content

    return Tool(
        name="SummaryTool",
        func=summarize,
        description="Summarize uploaded documents.",
    )

def make_image_tool(conversation_id: str, model: str, file_ids: List[str]):
    def describe_image(query: str) -> str:
        for fid in file_ids:
            file_data = fp.get_file(fid)
            if file_data and file_data.get("file_type") == "image" and file_data.get("base64"):
                llm = _make_llm(model)
                msg = HumanMessage(
                    content=[
                        {"type": "text", "text": query},
                        {
                            "type": "image_url",
                            "image_url": f"data:image/jpeg;base64,{file_data['base64']}",
                        },
                    ]
                )
                response = llm.invoke([msg])
                return response.content
        return "No image found in uploaded files."

    return Tool(
        name="ImageDescriptionTool",
        func=describe_image,
        description="Describe an uploaded image. Input: question about the image.",
    )


# ─────────────────────────────────────────────
# Message conversions
# ─────────────────────────────────────────────
def _get_history_messages(conversation_id: str, new_message: str) -> List:
    raw_history = mem.get_chat_history_messages(conversation_id)
    messages = []
    # System message to define behavior
    messages.append(AIMessage(content="You are a helpful AI assistant. You have tools to search documents and do math."))
    for m in raw_history:
        if m["role"] == "user":
            messages.append(HumanMessage(content=m["content"]))
        else:
            messages.append(AIMessage(content=m["content"]))
    messages.append(HumanMessage(content=new_message))
    return messages


# ─────────────────────────────────────────────
# Simple chain (no tools)
# ─────────────────────────────────────────────
async def simple_chat_stream(
    message: str,
    conversation_id: str,
    model: str,
    file_context: str = "",
) -> AsyncIterator[str]:
    llm = _make_llm(model)
    context_block = f"\n\nContext from files:\n{file_context}" if file_context else ""
    messages = _get_history_messages(conversation_id, message + context_block)
    
    async for chunk in llm.astream(messages):
        if chunk.content:
            yield chunk.content


# ─────────────────────────────────────────────
# Agent-based stream (with LangGraph tools)
# ─────────────────────────────────────────────
async def agent_chat_stream(
    message: str,
    conversation_id: str,
    model: str,
    file_ids: List[str],
    file_context: str = "",
) -> AsyncIterator[str]:
    llm = _make_llm(model)
    tools = [make_calculator_tool()]
    
    if vs.collection_has_documents(conversation_id):
        tools.append(make_rag_tool(conversation_id))
        tools.append(make_summary_tool(conversation_id, model))

    has_images = any(fp.get_file(fid) and fp.get_file(fid).get("file_type") == "image" for fid in file_ids)
    if has_images:
        tools.append(make_image_tool(conversation_id, model, file_ids))

    app = create_react_agent(llm, tools)
    
    enriched_message = message
    if file_context and not vs.collection_has_documents(conversation_id):
        enriched_message += f"\n\nContext from file:\n{file_context[:2000]}"

    messages = _get_history_messages(conversation_id, enriched_message)

    # LangGraph streaming
    async for msg, metadata in app.astream({"messages": messages}, stream_mode="messages"):
        if msg.content and metadata.get("langgraph_node") == "agent":
            yield msg.content


# ─────────────────────────────────────────────
# Main entrypoint
# ─────────────────────────────────────────────
async def run_chat(
    message: str,
    conversation_id: str,
    model: str,
    file_ids: List[str],
) -> AsyncIterator[str]:
    file_context = ""
    for fid in file_ids:
        file_data = fp.get_file(fid)
        if file_data and file_data.get("content") and file_data.get("file_type") != "image":
            file_context += f"[{file_data['filename']}]:\n{file_data['content'][:1500]}\n\n"

    use_agent = vs.collection_has_documents(conversation_id) or bool(file_ids)

    if use_agent:
        return agent_chat_stream(message, conversation_id, model, file_ids, file_context)
    else:
        return simple_chat_stream(message, conversation_id, model, file_context)
