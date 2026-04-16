#!/bin/bash
set -e

echo ""
echo "  EventPulse Venue Intelligence"
echo "  ─────────────────────────────"

# Load env
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
  echo "  ✓ Environment loaded"
else
  echo "  ✗ No .env file found — copy .env.example and fill in tokens"
  exit 1
fi

# Check Modal
if ! command -v modal &> /dev/null; then
  echo "  ⚠ Modal not installed. Demo mode will be used."
  echo "    To enable GPU: pip install modal && modal token new"
else
  echo "  ✓ Modal CLI found"
fi

# Check fallback PLY
if [ ! -f sample_scenes/concession_fallback.ply ]; then
  echo "  Generating fallback scene..."
  python scripts/generate_fallback_ply.py
fi
echo "  ✓ Fallback scene ready"

# Install frontend deps if needed
if [ ! -d node_modules ]; then
  echo "  Installing frontend dependencies..."
  npm install
fi
echo "  ✓ Frontend dependencies ready"

# Install backend deps
pip install -r backend/requirements.txt --quiet
echo "  ✓ Backend dependencies ready"

# Build frontend
npm run build
echo "  ✓ Frontend built"

# Deploy Modal endpoint (if available)
if command -v modal &> /dev/null; then
  echo "  Deploying Lyra endpoint to Modal..."
  modal deploy modal_app/lyra_endpoint.py && echo "  ✓ Modal endpoint deployed" || echo "  ⚠ Modal deploy failed — demo mode will be used"
fi

# Start backend (serves frontend static files too)
echo ""
echo "  Starting server..."
echo ""

cd backend && uvicorn main:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} &
BACKEND_PID=$!

sleep 2

echo "  ┌─────────────────────────────────────────┐"
echo "  │  EventPulse is running                  │"
echo "  │                                         │"
echo "  │  App:  http://localhost:${PORT:-8000}             │"
echo "  │  API:  http://localhost:${PORT:-8000}/docs        │"
echo "  └─────────────────────────────────────────┘"
echo ""
echo "  Drag a venue photo onto the app to start."
echo "  First run warms up GPU on Modal (~60s)."
echo ""
echo "  Ctrl+C to stop."

trap "kill $BACKEND_PID 2>/dev/null" EXIT
wait
