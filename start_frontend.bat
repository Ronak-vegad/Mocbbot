@echo off
echo ================================================
echo  AI Chatbot - Starting Frontend
echo ================================================
cd /d "%~dp0frontend"
echo Starting Vite dev server on http://localhost:5173
npm run dev
