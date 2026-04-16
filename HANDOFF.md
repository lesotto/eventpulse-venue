# EventPulse — Engineering Handoff & Deployment Guide

This document is for the engineer(s) standing up EventPulse for production/demo deployment.

---

## Architecture Overview

```
                  ┌──────────────┐
                  │   Browser    │
                  │  (Three.js)  │
                  └──────┬───────┘
                         │ HTTPS
                         ▼
              ┌─────────────────────┐
              │   FastAPI Backend   │  ← Railway / Render / Fly.io
              │   (serves static   │
              │    frontend too)    │
              └─────────┬──────────┘
                        │ Modal RPC
                        ▼
              ┌─────────────────────┐
              │   Modal A100 GPU    │  ← Serverless, pay-per-use
              │   (Lyra 2.0)        │
              └─────────────────────┘
```

**Single-service deployment**: The FastAPI backend serves both the API and the built frontend static files. One container, one URL, one deploy.

---

## Deployment Option A: Railway (Recommended)

Railway is the fastest path to a live demo URL.

### Steps

1. **Create Railway project**
   - Go to [railway.app](https://railway.app) and create a new project
   - Connect your GitHub repo (or use `railway up` CLI)

2. **Set environment variables** in Railway dashboard:
   ```
   MODAL_TOKEN_ID=...
   MODAL_TOKEN_SECRET=...
   HF_TOKEN=...
   PORT=8000
   HOST=0.0.0.0
   ```
   > Note: Railway auto-sets `PORT`. The Dockerfile uses `$PORT` so it adapts automatically.

3. **Deploy**
   ```bash
   # Option A: Push to connected GitHub repo
   git push origin main

   # Option B: CLI deploy
   npm install -g @railway/cli
   railway login
   railway up
   ```

4. **Verify**
   - Railway gives you a `*.up.railway.app` URL
   - Hit `<url>/api/health` — should return `{"status": "ok"}`
   - Load the app URL — upload screen should appear

### Railway Config
The `deploy/railway.toml` is already configured. Copy it to root if Railway doesn't pick it up:
```bash
cp deploy/railway.toml railway.toml
```

---

## Deployment Option B: Vercel (Frontend) + Railway (Backend)

Split deployment for CDN-edge frontend performance.

### Backend (Railway)
Same as Option A above.

### Frontend (Vercel)

1. Edit `deploy/vercel.json` — replace `YOUR_RAILWAY_BACKEND_URL` with the actual Railway URL
2. Copy to project root:
   ```bash
   cp deploy/vercel.json vercel.json
   ```
3. Deploy:
   ```bash
   npm install -g vercel
   vercel --prod
   ```

The `vercel.json` rewrites `/api/*` requests to your Railway backend.

---

## Deployment Option C: Docker (Any Host)

```bash
# Build
docker build -t eventpulse-venue .

# Run
docker run -p 8000:8000 \
  -e MODAL_TOKEN_ID=... \
  -e MODAL_TOKEN_SECRET=... \
  -e HF_TOKEN=... \
  eventpulse-venue
```

Works on Fly.io, Render, DigitalOcean App Platform, AWS ECS, Google Cloud Run, etc.

---

## Demo Mode (No GPU Required)

**For a quick demo without Modal/GPU setup**, the app works out of the box:

1. The fallback PLY is generated at build time (Dockerfile runs the script)
2. When a user uploads a photo and Modal fails, the backend returns `demo_mode: true`
3. The frontend shows the sample golf course scene with full camera animations
4. An amber "DEMO MODE" badge appears

**This means you can deploy and demo immediately without any Modal or HuggingFace setup.**

---

## Enabling Full Lyra GPU Pipeline

When you're ready for real AI-generated scenes:

### 1. Modal Account
```bash
pip install modal
modal token new
# Follow the browser auth flow
```

### 2. HuggingFace Token
- Create account at [huggingface.co](https://huggingface.co)
- Accept the Lyra model license at `huggingface.co/nvidia/Lyra`
- Generate an access token at Settings → Access Tokens

### 3. Modal Secrets
```bash
modal secret create huggingface HF_TOKEN=hf_xxxxx
```

### 4. Deploy the GPU Endpoint
```bash
modal deploy modal_app/lyra_endpoint.py
```

### 5. Set Env Vars
Add `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` to your deployment platform.

---

## Testing Checklist

| Check | Command / Action | Expected |
|---|---|---|
| Health endpoint | `curl <url>/api/health` | `{"status": "ok"}` |
| Frontend loads | Open `<url>` in browser | Upload screen with EventPulse branding |
| Demo mode works | Upload any image | Scene loads (demo badge visible) |
| Camera phases | Click phase buttons | Drop-in → Flyover → Walkthrough |
| WASD controls | In walkthrough mode | Camera moves on ground plane |
| Pointer lock | Click canvas in walkthrough | Mouse controls camera direction |

---

## Key Files for Customization

| What | File | Notes |
|---|---|---|
| Venue branding | `frontend/index.html` | Change "The Concession" to your venue |
| Color scheme | `frontend/style.css` | CSS variables at top (`:root`) |
| Camera paths | `frontend/viewer.js` | `phases` object — adjust positions/durations |
| HUD labels | `frontend/hud.js` | Panel text content |
| GPU config | `modal_app/lyra_endpoint.py` | GPU type, timeout, memory |
| API logic | `backend/main.py` | Job management, fallback behavior |

---

## Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| Blank screen after upload | Frontend dist not built | Run `npm run build` before starting backend |
| "Connection error" on upload | Backend not running | Check `uvicorn` process and PORT env var |
| Modal timeout | Cold start + large image | Increase timeout in `lyra_endpoint.py` |
| PLY won't load | CORS or path issue | Check browser console; verify `/api/scene/` route |
| No fallback scene | PLY not generated | Run `python scripts/generate_fallback_ply.py` |

---

## Cost Breakdown

| Resource | Monthly (light use) | Notes |
|---|---|---|
| Railway (Starter) | $5/mo | 512 MB RAM, 1 vCPU |
| Modal A100 | ~$0.20/run | Pay-per-second GPU |
| Vercel (optional) | Free | If splitting frontend |
| HuggingFace | Free | Model access |
| **Total for demo** | **~$5-10/mo** | Plus $0.20 per GPU run |

---

## Security Notes

- The `.env` file contains secrets — never commit it to git
- CORS is set to `allow_origins=["*"]` for demo — restrict in production
- Job data is in-memory — restarts clear all jobs (use Redis for persistence)
- File uploads are not validated beyond what FastAPI provides — add size limits for production
- The Modal endpoint accepts raw bytes — add auth for production use

---

## Next Steps After Deployment

1. **Custom venue**: Replace "The Concession" branding in HTML/CSS
2. **Real GPU runs**: Set up Modal + HuggingFace tokens
3. **Persistent storage**: Swap in-memory job store for Redis or PostgreSQL
4. **Auth**: Add API key or OAuth for upload endpoint
5. **3DGS upgrade**: Swap PLYLoader for Gaussian Splat renderer (see README)
6. **Analytics**: Add event tracking for demo engagement metrics
