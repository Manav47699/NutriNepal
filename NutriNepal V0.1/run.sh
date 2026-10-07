#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "Activating virtual environment..."

source .venv/bin/activate

echo "Starting Nepali Diet Advisory System..."

cleanup() {
    echo ""
    echo "Stopping all services..."

    kill "$BACKEND_PID" "$AI_PID" "$FRONTEND_PID" 2>/dev/null || true

    wait "$BACKEND_PID" "$AI_PID" "$FRONTEND_PID" 2>/dev/null || true

    echo "All services stopped."
}

trap cleanup SIGINT SIGTERM EXIT

# Django Backend
echo "Starting Django backend..."
python backend/manage.py runserver 127.0.0.1:8000 &
BACKEND_PID=$!

# FastAPI AI Service
echo "Starting FastAPI AI service..."
uvicorn app.main:app \
    --app-dir ai-service \
    --host 127.0.0.1 \
    --port 8001 \
    --reload &
AI_PID=$!

# React Frontend
echo "Starting React frontend..."
(
    cd frontend
    npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "=========================================="
echo " Nepali Diet Advisory System"
echo "=========================================="
echo " Django:  http://127.0.0.1:8000"
echo " FastAPI: http://127.0.0.1:8001"
echo " React:   http://localhost:5173"
echo "=========================================="
echo "Press Ctrl+C to stop all services."
echo ""

wait