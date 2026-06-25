# OilManager — Session Notes 2026-06-25 (S2)

## Files Changed
| File | Changes |
|---|---|
| `index.html` | Major hero, sections, cards, backgrounds, nav, GLB playlist |

---

## Summary

### GLB Playlist Hero
- Battery.glb added as first model in playlist — two-tone blueprint (cyan wireframe + gold edges)
- Float bob removed from animation loop
- Gold metallic + scanner attempted → reverted back to blueprint on user request
- `applyBlueprint` defers `EdgesGeometry` via `setTimeout` — no GPU crash
- EdgesGeometry skipped on meshes >8000 tris

### iPhone Mockup
- Added `iphone.png` to hero section — bottom center, `height:28%` / `max-height:240px`
- Contained inside hero, no bleed into stats section

### Section Backgrounds
- **Stats** → `Global network.png` (62% dark overlay) + expanded to 6 stat cards: GPS, GLO, SMS, 100%, 0 paper, 24/7
- **What It Does (stack-section)** → `Flare.png` (78% overlay)
- **Features** → `4_Scenes.png` (78% overlay)

### Platform Cards (What It Does section)
- 6 vertical rectangle cards with chasing border particle animation (`@property --p1/--p2` conic gradient)
- Gold background, white Bebas Neue label, emoji icon
- Click toggles `.active` — dark overlay popup fills card with feature description
- AI photos generated via Replicate flux-schnell for each card:
  - 01_worker_tracking, 02_job_dispatch, 03_sms_workers, 04_glo_leases, 05_approve_hours, 06_route_recorder
- GLO card replaced with user's own `GLO.png`
- Worker tracking card regenerated (original had headless figure)
- Cards sized: `max-width:235px` / `min-height:370px`, grid 6 columns forced

### Dot Navigation
- 8 gold dots fixed right side, vertically centered
- `IntersectionObserver` (threshold 0.5) highlights active section dot
- Hover shows section name label to left of dot
- Click scrolls to section

### Scroll
- Attempted `scroll-snap-type:y mandatory` — caused sluggish scrolling
- Reverted to normal scroll + `scroll-behavior:smooth`

### Pricing Section
- OILBOSS promo code (35% off) banner above cards
- All 3 tiers updated with feature groups per plan
- Promo prices shown in red with pulsing animation + SAVE 35% badge
- Features properly split: Starter=base, Pro=SMS+GLO+routes, Enterprise=unlimited

### Map Removed
- All Mapbox/WebGL map code removed from index.html
- No more WebGL context conflicts

---

## Active File Map
```
C:\Users\juanc\Desktop\OilManager\
├── index.html              — full homepage (hero + GLB + all sections)
├── dashboard-boss.html     — main app — DO NOT TOUCH
├── dashboard-worker.html   — mobile worker view
├── oilstack-3d.html        — standalone Three.js stack (not used on homepage)
├── glo-service.js          — Texas GLO REST module
├── plss-service.js         — BLM PLSS module
├── OilStack/               — GLB models
│   ├── Battery.glb         ← MAIN hero model (first in playlist)
│   ├── aria-build (7).glb
│   ├── aria-build (8).glb
│   ├── Meshy_AI_Industrial_Tank_Farm...glb
│   ├── Meshy_AI_Petrochemical_Process...glb
│   └── model.glb
└── Card Photos/
    ├── iphone.png           ← hero bottom center
    ├── Global network.png   ← stats background
    ├── Flare.png            ← what-it-does background
    ├── 4_Scenes.png         ← features background
    ├── GLO.png              ← GLO leases card
    ├── Hero Background.png  ← hero (DO NOT TOUCH)
    └── 01–06 card jpgs
```

---

## Pending
- Stats section photo still being sourced by user
- Nav bar wiring to each page/system
- Backend: Node.js + MySQL + Railway
- Twilio SMS dispatch
