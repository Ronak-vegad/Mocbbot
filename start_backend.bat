@echo off
echo ================================================
echo  AI Chatbot - Starting Backend
echo ================================================
cd /d "%~dp0backend"

if not exist ".venv" (
    echo Creating virtual environment...
    python -m venv .venv
)

call .venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Fill in your .env file before proceeding!
echo   OLLAMA_BASE_URL=https://your-cloud-host
echo   OLLAMA_API_KEY=your_key
echo.

echo Starting FastAPI server on http://localhost:8000
uvicorn main:app --reload --host 0.0.0.0 --port 8000
