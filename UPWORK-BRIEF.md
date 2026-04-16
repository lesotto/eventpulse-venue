# Upwork Job Brief: Deploy EventPulse Venue Intelligence Demo App

## Job Title
Deploy Full-Stack Three.js + FastAPI Demo App to Railway (Code Complete — Deploy Only)

## Budget
Fixed price: $150–$250 USD

## Timeline
**18 hours from hire.** This is a deployment task, not a build. All code is written, tested, and committed.

---

## What This Is

EventPulse is a demo application that lets users upload a venue photograph and view it as an interactive 3D world. It features cinematic drone-style camera flyovers and first-person walkthroughs of a golf course venue.

**All code is 100% complete and committed to a private GitHub repo.** The frontend builds successfully. The backend runs. The 3D viewer works. You are deploying it, not building it.

**Live repo:** https://github.com/lesotto/eventpulse-venue

---

## Tech Stack (already built)

| Layer | Tech | Status |
|---|---|---|
| Frontend | Vite + Three.js + ES modules | ✅ Builds, 495 KB bundle |
| Backend | Python FastAPI (uvicorn) | ✅ Runs, serves API + static files |
| 3D Viewer | Three.js with PLYLoader, custom camera system | ✅ Working |
| Fallback Scene | 50k-point synthetic PLY (no GPU needed) | ✅ Included in repo |
| Container | Dockerfile (multi-stage: Node build + Python runtime) | ✅ Written |
| Deploy Config | Railway config, Vercel config | ✅ Included |

---

## What You Need To Do

### Task 1: Deploy to Railway (Primary)

Deploy the app as a single service on Railway so it's accessible via a public URL.

**Steps:**

1. Clone the repo: `git clone git@github.com:lesotto/eventpulse-venue.git`
2. Create a Railway project at [railway.app](https://railway.app)
3. Connect the GitHub repo OR use `railway up` CLI
4. Set these environment variables in Railway dashboard:
   ```
   PORT=8000
   HOST=0.0.0.0
   ```
   (Modal/HuggingFace tokens are NOT needed — demo mode works without them)
5. Railway will use the `Dockerfile` to build automatically
6. Verify the deployment:
   - `<railway-url>/api/health` returns `{"status": "ok"}`
   - `<railway-url>/` shows the EventPulse upload screen
   - Uploading any image triggers demo mode → 3D viewer launches with golf course scene
   - All three camera phases work (Drop In → Flyover → Walkthrough)
   - WASD controls work in Walkthrough mode

**Dockerfile is already written.** It:
- Builds the frontend with Node 20
- Installs Python backend deps
- Generates the fallback PLY scene
- Runs uvicorn on `$PORT`

### Task 2: Verify Full Demo Flow

Walk through the entire user experience and confirm:

| # | Check | Expected Result |
|---|---|---|
| 1 | Load the public URL | Black screen with "EventPulse" logo, green accent, drop zone |
| 2 | Drop/upload any JPG image | Status text shows "Uploading..." then "Connection error — launching demo mode..." |
| 3 | Wait ~3 seconds | Upload screen fades out, 3D viewer fades in |
| 4 | 3D viewer loads | Green golf course terrain, trees, clubhouse, water hazard visible |
| 5 | HUD visible | Top bar with logo, altitude panel (shows feet), scene mode panel |
| 6 | "DEMO MODE" badge | Amber pill badge visible at top center |
| 7 | Drop In phase | Camera spirals down from altitude, auto-advances to Flyover |
| 8 | Flyover phase | Camera sweeps low across course, auto-advances to Walkthrough |
| 9 | Walkthrough phase | Crosshair appears, click canvas to lock pointer, WASD to move |
| 10 | Phase buttons | Bottom-right buttons switch between phases |

### Task 3: (Optional Bonus) Vercel Frontend Split

If time permits, also deploy the frontend to Vercel for CDN performance:

1. Edit `deploy/vercel.json` — replace `YOUR_RAILWAY_BACKEND_URL` with the actual Railway URL
2. Copy `deploy/vercel.json` to project root
3. Run `vercel --prod`
4. Verify the Vercel URL works end-to-end

---

## What You Do NOT Need To Do

- ❌ Write any code (it's all done)
- ❌ Set up Modal or GPU compute (demo mode doesn't need it)
- ❌ Set up HuggingFace tokens
- ❌ Modify the frontend or backend
- ❌ Set up a database

---

## Repo Structure

```
eventpulse-venue/
├── backend/
│   ├── main.py              ← FastAPI server (serves API + frontend)
│   └── requirements.txt
├── frontend/
│   ├── index.html           ← Upload screen + app shell
│   ├── style.css            ← Full design system
│   ├── viewer.js            ← Three.js 3D viewer + camera system
│   └── hud.js               ← HUD overlay (altitude, mode, phase nav)
├── modal_app/
│   └── lyra_endpoint.py     ← GPU worker (NOT needed for demo deploy)
├── scripts/
│   └── generate_fallback_ply.py  ← Generates sample scene at build time
├── sample_scenes/
│   └── concession_fallback.ply   ← 50k-point golf course (733 KB)
├── deploy/
│   ├── railway.toml         ← Railway deploy config
│   └── vercel.json          ← Vercel config (optional)
├── Dockerfile               ← Multi-stage build (Node + Python)
├── package.json             ← Vite + Three.js deps
├── vite.config.js           ← Build config + API proxy
├── start.sh                 ← Local dev launcher
├── HANDOFF.md               ← Detailed engineering handoff doc
├── README.md                ← Full project README
└── .env.example             ← Environment template
```

---

## Key Documentation

**Read `HANDOFF.md` in the repo** — it has:
- Architecture diagram
- Step-by-step Railway deployment instructions
- Vercel split deployment instructions
- Docker deployment instructions
- Troubleshooting table
- Security notes

---

## Acceptance Criteria (all must pass)

- [ ] App is live on a public Railway URL
- [ ] `/api/health` returns `{"status": "ok"}`
- [ ] Upload screen renders correctly (black bg, green branding, drop zone)
- [ ] Uploading an image triggers demo mode fallback (no errors, graceful transition)
- [ ] 3D golf course scene loads with terrain, trees, clubhouse, water
- [ ] All 3 camera phases work (Drop In → Flyover → Walkthrough)
- [ ] HUD displays altitude, scene mode, phase nav buttons
- [ ] WASD + mouse controls work in Walkthrough mode
- [ ] Share the live URL and a 30-second screen recording of the demo flow
- [ ] Total deploy time: under 2 hours of actual work

---

## Deliverables

1. **Live Railway URL** — working public demo
2. **30-second screen recording** — showing the full flow (upload → 3D viewer → all 3 phases)
3. **(Optional) Vercel URL** — if frontend split was done
4. **Brief notes** — any issues encountered and how they were resolved

---

## Skills Needed

- Railway or similar PaaS deployment experience
- Basic Docker knowledge (Dockerfile is already written)
- Familiarity with FastAPI/Python backends
- Ability to verify a Three.js frontend works correctly

---

## How To Apply

Tell me:
1. Your experience deploying Docker apps to Railway (or similar: Render, Fly.io)
2. Whether you can start immediately
3. Your estimated time to complete (should be 1–2 hours of work)

This is a straightforward deployment of a fully built app. If you've deployed a Dockerized Python app to Railway before, this should take under an hour.
