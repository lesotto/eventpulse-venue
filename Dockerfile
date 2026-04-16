# EventPulse Venue Intelligence — Production Dockerfile
# Builds frontend + backend into a single deployable image.
# Works on Railway, Render, Fly.io, or any Docker host.

FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package.json vite.config.js ./
COPY frontend/ ./frontend/
RUN npm install && npm run build

FROM python:3.11-slim
WORKDIR /app

# Install backend dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist/

# Copy sample scenes and scripts
COPY sample_scenes/ ./sample_scenes/
COPY scripts/ ./scripts/
COPY modal_app/ ./modal_app/

# Generate fallback PLY if not present
RUN python scripts/generate_fallback_ply.py

EXPOSE 8000

ENV HOST=0.0.0.0
ENV PORT=8000

CMD ["sh", "-c", "cd backend && uvicorn main:app --host ${HOST} --port ${PORT}"]
