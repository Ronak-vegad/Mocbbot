# AI Chatbot Project

A full-stack AI chatbot application featuring a modern React frontend and a powerful Python FastAPI backend. The chatbot leverages LangChain and ChromaDB for Retrieval-Augmented Generation (RAG) capabilities, allowing users to converse with an AI while referencing uploaded documents. It connects to Ollama for LLMs and embeddings.

## Key Features

- **Streaming Chat Interface**: Fast, real-time responses from the LLM via server-sent events.
- **Retrieval-Augmented Generation (RAG)**: Upload documents (PDF, DOCX, CSV/Excel, Text) to provide context to the AI. Documents are processed and embedded into a local ChromaDB instance.
- **Conversation Memory**: Per-conversation chat history stored in an SQLite database, giving the AI context for multi-turn conversations.
- **Ollama Integration**: Seamless integration with Ollama (cloud or local) for providing language models.
- **Dynamic Model Selection**: Supports generating responses from various models available on the connected Ollama instance.

## Tech Stack

### Frontend
- **Framework**: React with Vite
- **Styling**: TailwindCSS
- **Key Libraries**: `axios` for API calls, `react-markdown` for rendering formatted text, `lucide-react` for icons.

### Backend
- **Framework**: FastAPI (Python)
- **AI/LLM toolkit**: LangChain, LangChain-Chroma
- **Database**: 
  - SQLite (with `aiosqlite`) for conversation history and metadata.
  - ChromaDB for vector storage and document embeddings.
- **Document Processing**: `PyMuPDF` (PDFs), `python-docx` (Word documents), `pandas`, `openpyxl` (CSV/Excel data).

## Prerequisites

- Node.js (for the frontend)
- Python 3.8+ (for the backend)
- Access to an Ollama server (local or cloud-hosted)

## Getting Started

### 1. Configure the Backend Environment
Navigate to the `backend/` directory and configure the environment variables via `.env`. A complete configuration requires you to point to your Ollama remote/local URL and optionally provide an API Key.

Example `.env` in `backend/.env`:
```ini
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_API_KEY=your_optional_key_here
DEFAULT_MODEL=gpt-oss:20b
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Start the Backend Worker
You can quickly run the backend using the provided batch script. Note: This will automatically set up the Python `.venv`, install the dependencies from `requirements.txt`, and start the FastAPI web server.

From the root directory:
```bash
start_backend.bat
```

Alternatively, you can manually run:
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The FastAPI application will be served at `http://localhost:8000`.

### 3. Start the Frontend Application
You can quickly run the frontend using the provided batch script.

From the root directory:
```bash
start_frontend.bat
```

Alternatively, you can manually run:
```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on `http://localhost:5173`. You can view the application in your browser.

## Directory Structure

- **/backend**: Python FastAPI server, database logic, document processing, and LangChain integration.
- **/frontend**: React + Vite UI components and static assets.
- **/start_backend.bat**: Helper script to initialize and run the Python backend.
- **/start_frontend.bat**: Helper script to run the Vite frontend development server.
