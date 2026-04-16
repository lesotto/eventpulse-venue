"""
EventPulse — FastAPI Backend

Handles venue photo uploads, orchestrates Lyra GPU processing via Modal,
and serves generated 3D scenes. Falls back to demo mode with a sample
scene if Modal is unavailable.
"""

import asyncio
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

load_dotenv()

app = FastAPI(title="EventPulse Venue Intelligence API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Job store (in-memory for demo; swap for Redis/DB in production) ──
jobs: dict[str, dict] = {}

FALLBACK_PLY = Path(__file__).parent.parent / "sample_scenes" / "concession_fallback.ply"
OUTPUT_DIR = Path("/tmp/eventpulse_scenes")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ── API Routes ──


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.post("/api/process-venue")
async def process_venue(file: UploadFile = File(...)):
    """Upload a venue photo and start 3D scene generation."""
    job_id = str(uuid.uuid4())
    image_bytes = await file.read()

    jobs[job_id] = {
        "status": "queued",
        "filename": file.filename,
        "demo_mode": False,
        "point_count": None,
        "elapsed": None,
    }

    asyncio.create_task(_process_job(job_id, image_bytes, file.filename))

    return {"job_id": job_id}


@app.get("/api/job/{job_id}")
async def get_job(job_id: str):
    """Check job status."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    # Never expose filesystem paths
    return {
        "job_id": job_id,
        "status": job["status"],
        "demo_mode": job.get("demo_mode", False),
        "point_count": job.get("point_count"),
        "elapsed": job.get("elapsed"),
    }


@app.get("/api/scene/{job_id}/scene.ply")
async def get_scene(job_id: str):
    """Serve the generated .ply scene file."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    job = jobs[job_id]
    if job["status"] != "complete":
        raise HTTPException(status_code=409, detail="Scene not ready yet")

    # Serve fallback or generated PLY
    if job.get("demo_mode"):
        if not FALLBACK_PLY.exists():
            raise HTTPException(status_code=500, detail="Fallback scene missing")
        return FileResponse(
            FALLBACK_PLY,
            media_type="application/octet-stream",
            filename="scene.ply",
        )

    ply_path = OUTPUT_DIR / f"{job_id}.ply"
    if not ply_path.exists():
        raise HTTPException(status_code=500, detail="Scene file missing")
    return FileResponse(
        ply_path,
        media_type="application/octet-stream",
        filename="scene.ply",
    )


async def _process_job(job_id: str, image_bytes: bytes, filename: str):
    """Background task: call Modal for Lyra inference, fall back to demo mode."""
    jobs[job_id]["status"] = "processing"

    try:
        import modal

        lyra_fn = modal.Function.lookup("eventpulse-lyra", "run_lyra")
        result = await asyncio.to_thread(lyra_fn.remote, image_bytes, filename)

        # Save PLY to disk
        ply_path = OUTPUT_DIR / f"{job_id}.ply"
        ply_path.write_bytes(result["ply_bytes"])

        jobs[job_id].update({
            "status": "complete",
            "demo_mode": False,
            "point_count": result["point_count"],
            "elapsed": result["elapsed"],
        })

    except Exception as e:
        print(f"[EventPulse] Modal/Lyra error for job {job_id}: {e}")
        print("[EventPulse] Falling back to demo mode with sample scene.")

        jobs[job_id].update({
            "status": "complete",
            "demo_mode": True,
            "point_count": 50000,
            "elapsed": 0.0,
        })


# ── Serve frontend static files (mount LAST, after all API routes) ──
frontend_dir = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    # Dev fallback: serve from frontend/ directly
    frontend_dev = Path(__file__).parent.parent / "frontend"
    if frontend_dev.exists():
        app.mount("/", StaticFiles(directory=str(frontend_dev), html=True), name="frontend")
