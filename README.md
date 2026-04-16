# EventPulse — Venue Intelligence Platform

EventPulse transforms a single venue photograph into an interactive 3D world using NVIDIA Lyra 2.0 for 3D scene generation. The platform provides cinematic drone-style flyovers and first-person walkthroughs of any venue, powered by AI.

---

## Prerequisites

| Requirement | Version | Purpose |
|---|---|---|
| Python | 3.10+ | Backend server |
| Node.js | 18+ | Frontend build |
| Modal account | — | GPU compute (optional for demo mode) |
| HuggingFace account | — | Lyra model weights (optional for demo mode) |

## Quick Start

```bash
# 1. Clone
git clone <your-repo-url> eventpulse-venue
cd eventpulse-venue

# 2. Configure
cp .env.example .env
# Edit .env with your Modal and HuggingFace tokens

# 3. Run
chmod +x start.sh
bash start.sh
```

The app starts at `http://localhost:8000`.

## How to Use

1. **Upload** — Drag a venue photo onto the drop zone (or click to browse)
2. **Wait** — The system uploads the photo, runs Lyra 2.0 on a Modal A100 GPU (~3 min), and generates a 3D point cloud
3. **Explore** — The viewer launches with three camera phases:

| Phase | Duration | Description |
|---|---|---|
| Drop In | 8s | Cinematic satellite descent with spiral |
| Flyover | 12s | Low sweep across the venue |
| Walkthrough | Manual | WASD + mouse first-person navigation |

## Demo Mode

Demo mode activates automatically when:
- Modal is not configured or unavailable
- Lyra inference fails for any reason
- The backend cannot connect to Modal

In demo mode, a pre-generated sample golf course scene loads instead. An amber "DEMO MODE" badge appears at the top of the viewer. The full camera animation system works identically.

## Camera Controls

| Control | Action |
|---|---|
| W / Arrow Up | Move forward |
| A / Arrow Left | Strafe left |
| S / Arrow Down | Move backward |
| D / Arrow Right | Strafe right |
| Mouse (pointer locked) | Look around |
| Click canvas | Lock pointer (walkthrough mode) |
| ESC | Release pointer lock |
| Phase buttons (bottom-right) | Switch camera mode |

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check — returns `{"status": "ok"}` |
| `/api/process-venue` | POST | Upload venue photo (multipart file), returns `{"job_id": "..."}` |
| `/api/job/{job_id}` | GET | Poll job status: `queued` → `processing` → `complete` or `error` |
| `/api/scene/{job_id}/scene.ply` | GET | Download generated .ply scene file |

## Lyra Tuning

The `total_movement_distance_factor` parameter in the Lyra inference controls how far the virtual camera moves when generating the 3D scene. Higher values produce wider scenes but may reduce detail density. Default works well for most venues.

## Upgrading to Full 3DGS Rendering

The current viewer renders point clouds. For photorealistic Gaussian Splatting:

1. Use [antimatter15/splat](https://github.com/antimatter15/splat) or [GaussianSplats3D](https://github.com/mkkellogg/GaussianSplats3D)
2. Both integrate with Three.js scenes
3. Replace the `PLYLoader` section in `viewer.js` with the splat loader

## Cost Estimate

| Item | Cost |
|---|---|
| Modal A100 (~3 min per run) | ~$0.20/demo |
| Railway hosting (backend) | ~$5/month |
| Vercel hosting (frontend) | Free tier |

## Project Structure

```
eventpulse-venue/
├── backend/
│   ├── main.py              # FastAPI server
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── index.html           # Main app page
│   ├── style.css            # Design system
│   ├── viewer.js            # Three.js 3D viewer
│   └── hud.js               # HUD overlay module
├── modal_app/
│   └── lyra_endpoint.py     # GPU worker (Modal)
├── scripts/
│   └── generate_fallback_ply.py  # Fallback scene generator
├── sample_scenes/            # Generated fallback .ply files
├── deploy/
│   ├── railway.toml          # Railway config
│   └── vercel.json           # Vercel config
├── Dockerfile                # Production container
├── package.json              # Node dependencies
├── vite.config.js            # Vite build config
├── start.sh                  # Local dev launcher
└── .env.example              # Environment template
```
