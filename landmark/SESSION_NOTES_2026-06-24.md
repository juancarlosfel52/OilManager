# OilManager — Session Notes 2026-06-24

## Session Summary

Full feature day on OilManager. No backend work — all map/viewer enhancements.

---

## Files Changed

| File | Changes |
|---|---|
| `dashboard-boss.html` | GLO layer wiring, Focus Mode, GLO toggle button, CSS additions |
| `glo-service.js` | **Created** — Texas GLO ArcGIS REST service module |
| `oilstack-3d.html` | 60fps optimization pass, FXAA, geometry upgrade, camera view switcher, Focus Mode (wrong location — see note) |
| `plss-service.js` | No changes (already complete from previous session) |

---

## Features Built

### 1. Texas GLO Live Layer (dashboard-boss.html)
Three live ArcGIS FeatureServer layers from Texas General Land Office:

| Layer | Color | Endpoint |
|---|---|---|
| Active O&G Leases | Orange `#FF6B35` | `Oil_and_Gas_Leases_Active/FeatureServer/0` |
| Active O&G Units | Blue dashed | `Oil_and_Gas_Units_Active/FeatureServer/0` |
| PSF Lands | Green dashed | `Permanent_School_Fund_Lands/FeatureServer/0` |

- All on `services1.arcgis.com/YWG34dhJxrbxQWdF/arcgis/rest/services/`
- Toggled via `🛢 GLO Leases` button next to Land Grid
- Viewport bbox query, 8-min cache, 600ms debounce on pan/zoom
- Click any polygon → detail popup (lease#, lessee, acreage, royalty%, depth)
- Survives map style swaps via `_reAddGLOLayers()`
- Legend items appear/hide with toggle

**Key research finding:** Texas GLO data confirmed live for Andrews County via:
```
?where=COUNTY='ANDREWS'&outFields=LEASE_NUMBER,ORIGINAL_LESSEE...
```
Returned MF016355 (Hill, Geo P), MF016356 (Hill, Geo P), MF018300 (The Texas Co, 560ac)

### 2. oilstack-3d.html — 60fps Optimization
- `scene.traverse()` removed from render loop → one-time cache at init (`pulseRings[]`, `clockHands[]`, `barMeshes[]`, `beamMesh`, `headMesh`)
- Fixed `clock.getDelta()` bug (ternary always returned 0.016)
- Bloom dropped to half resolution (`W*0.5, H*0.5`) — ~4x GPU cost reduction
- Label DOM updates throttled to every 3rd frame (20fps)
- `forEach` → `for` loops on hot particle path

### 3. oilstack-3d.html — Graphics Quality
- FXAA added via `ShaderPass(FXAAShader)` after OutputPass — re-enables AA broken by EffectComposer
- Geometry segment counts increased: sphere 12→32, ring 24→48, torus 8×24→16×64, clock cylinder 24→48, pump post 6→16
- Map pin + clock upgraded to `MeshPhysicalMaterial` with `clearcoat:1.0`
- 3 close-range point lights added (gold/blue/green) for surface detail when zoomed in

### 4. oilstack-3d.html — Camera View Switcher
4 preset buttons bottom-right:
- **⬡ Iso** — default 45° diagonal, auto-rotates
- **⬆ Top** — bird's eye
- **▣ Front** — straight on
- **◧ Side** — profile view

Cubic ease-in-out tween (900ms). Auto-rotate only on iso view. Active button glows gold.

### 5. Focus Mode (dashboard-boss.html MAP)
> Note: User initially clarified this belongs on the Mapbox map, not oilstack-3d.html. Focus Mode was built in both but the intended location is dashboard-boss.html.

**Behavior:**
- `👁 Focus` button in map toolbar → button pulses cyan
- Cursor replaced with SVG eye crosshair
- Banner: "👁 Focus Mode — Click anywhere on the map to lock orbit"
- Click map → cyan dot with `✕` + pulsing ring planted at lngLat
- 16 CSS burst particles animate outward from click point
- `map.flyTo()` centers on point (zoom in if Auto Zoom ON)
- After fly completes → `setInterval` rotates `bearing += 0.25°` every 100ms locked to focus point (true orbit)
- Bottom-left controls: Auto Zoom toggle, Exit Focus
- Only 1 focus dot at a time — new click replaces previous
- Exit clears marker, stops orbit interval, restores normal interaction

---

## GLO Research Path

Pages checked before finding live endpoints:
- `glo.texas.gov/land/gis-maps-and-data` — viewers only, no REST
- `gisweb.glo.texas.gov/arcgis/rest/services` — folders: BW, EnergyMapofTexas, GLOBaseLayers, glomapjs, Parcels, etc.
- `Parcels/2024_Parcels_Transpecos` — confirmed: does NOT cover Andrews County
- `glomapjs/ArchivesJS` — historical sketch documents (Andrews Co. Rolled Sketch 37, 1958, Lotus Oil Co, Blks A-47/A-48 PSL)
- **Winner:** `arcgis.com/sharing/rest/content/items/e91d83946d88463b9485e4658df92866?f=json` → revealed `services1.arcgis.com/YWG34dhJxrbxQWdF` as the live host

---

## Mapbox Tilesets — Discussion
User asked about Mapbox Studio → Tilesets page. Explained:
- For private/custom data (client shapefiles, private lease roads) upload as tileset → loads instantly
- For public live data (GLO, BLM) the live REST API approach already built is better — always current, free
- Tileset route becomes useful when a client hands you a shapefile of their specific block

---

## Pending / Not Built
- Texas Abstract/Block/Survey grid as a drawable layer — GLO does not publish public REST API for survey boundaries. Options: Andrews CAD shapefile download, or email Geospatial@glo.texas.gov
- Focus Mode in oilstack-3d.html was built but user clarified it belongs on the map — the oilstack version remains but may not be the intended use
- Backend: Node.js + MySQL + Railway (auth, jobs API, timecards) — not started
- Twilio SMS job dispatch — not started
- Meshy GLB models for oilstack layers — waiting on user to generate

---

## Active File Map

```
C:\Users\juanc\Desktop\OilManager\
├── index.html              — landing page (hero, pricing, iframe oilstack)
├── login.html              — boss/worker role toggle, demo credentials
├── dashboard-boss.html     — main app (map + GLO + PLSS + Focus Mode)
├── dashboard-worker.html   — mobile worker view
├── route-recorder.html     — GPS route recording with landmarks
├── oilstack-3d.html        — Three.js 3D platform stack (iframe embed)
├── plss-service.js         — BLM PLSS + Census TIGER service module
├── glo-service.js          — Texas GLO ArcGIS REST service module
└── MapBox_Key/Token.txt    — Mapbox public token
```

---

## Demo Credentials
- Boss: `boss@oilmanager.com` / `demo1234`
- Worker: `JR-4821`
