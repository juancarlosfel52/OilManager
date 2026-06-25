# OilManager — Session Notes 2026-06-25

## Files Changed
| File | Changes |
|---|---|
| `index.html` | All hero 3D + particle work, GLO map, GLB playlist |

---

## What Was Built

### 1. GLB Playlist (Hero Section)
- Replaced stacked multi-model scene with a clean **solo GLB autoplay playlist**
- 5 models cycle: `aria-build(7)` → `Industrial Tank Farm` → `model.glb (semi)` → `aria-build(8)` → `Petrochemical Process`
- Each model: **fade in + scale grow (cubic ease-out)** → full orbit → **scale shrink (quadratic ease-in) + fade out** → next model
- One load at a time — `_loading` flag prevents overlap, 2s delay before preloading next
- `EdgesGeometry` deferred via `setTimeout(fn,0)` — yields to browser between each mesh, never drops frames
- Skips edges on meshes with >8000 triangles to protect GPU

### 2. Blueprint / Wireframe Mode
- Went through several shader iterations: UV grid → circuit board (GLSL errors) → thermal → reverted to clean wireframe
- Final: `MeshBasicMaterial wireframe:true` blue + cyan `EdgesGeometry` lines
- `_baseOpacity` stored on each material so fade animation scales correctly

### 3. Camera
- `position.set(-1.4, 1.2, 5.5)` / `lookAt(-1.4, 0, 0)` — shifted right to give GLBs more right-side screen real estate

### 4. GLO Preview Map (How It Works section)
- Replaced mock dashboard box with live **Mapbox dark map** centered on Andrews County TX
- 3 live GLO layers: Active O&G Leases (orange), O&G Units (blue dashed), PSF Lands (green dashed)
- Query: `COUNTY='ANDREWS'` — confirmed live endpoint from previous session
- `IntersectionObserver` triggers `map.resize()` + `fetchGLO()` only when section scrolls into view
- Badge + legend overlay, `interactive:false` — preview only, not draggable

### 5. Particle Text — Iteration Log
Went through many approaches finding what works:
1. WebGPU compute + render (separate BGLs) — shader errors, Windows adapter warnings
2. 2D Canvas pipeline flow — rejected (2D, not GPU)
3. WebGPU magnetic pull — WGSL compilation issues on Windows
4. Three.js Points + CPU spring physics — worked but complex
5. **Final: plain CSS div** — gold gradient text, 4-layer fake depth shadow, fade cycle

### 6. Final Text Effect
- `<div>` overlay at `bottom:8%`, centered
- Gold gradient fill via `webkit-background-clip:text`
- 4 stacked `text-shadow` layers `4px→1px` diagonal = extruded 3D depth illusion
- Outer bloom at 40px + 80px spread
- Fades in/out every 3.2s cycling: GPS → LIVE ROUTES → GLO → RRC → OILFIELD → WORKER CLOCK IN → BOSS DASHBOARD
- Zero canvas, zero GPU — no interference with GLB renderer

---

## Crash Note
- Computer hard crashed during session (Event ID 41, BugcheckCode=0)
- Cause: two heavy WebGL tabs open simultaneously (OilManager 3D + ARIA generating mesh)
- No hardware damage, no BSOD — GPU driver overload
- Fix: don't run both simultaneously

---

## Current Active File Map
```
C:\Users\juanc\Desktop\OilManager\
├── index.html              — hero GLB playlist + GLO map preview + CSS word cycle
├── dashboard-boss.html     — main app (map + GLO + PLSS + Focus Mode) — DO NOT TOUCH
├── dashboard-worker.html   — mobile worker view
├── oilstack-3d.html        — standalone Three.js platform stack (iframe)
├── login.html              — boss/worker role toggle
├── route-recorder.html     — GPS route recording
├── glo-service.js          — Texas GLO ArcGIS REST module
├── plss-service.js         — BLM PLSS + Census TIGER module
└── OilStack/               — GLB models for hero playlist
    ├── aria-build (7).glb
    ├── aria-build (8).glb
    ├── Meshy_AI_Industrial_Tank_Farm_0624214552_generate.glb
    ├── Meshy_AI_Petrochemical_Process_0624214540_generate.glb
    └── model.glb (semi truck)
```

---

## Pending
- Nav bar wiring to each page/system
- Backend: Node.js + MySQL + Railway (auth, jobs API, timecards)
- Twilio SMS job dispatch
- Better GLB — use Meshy image prompt from this session (stacked 5-level oil platform)
