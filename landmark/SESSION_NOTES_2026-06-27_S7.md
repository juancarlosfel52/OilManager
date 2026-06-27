# OilManager — Session Notes 2026-06-27 (S7)

## Files Changed
| File | Changes |
|---|---|
| `dashboard-boss.html` | Worker management modal, remove/regen/login link, mobile polish, desktop sidebar fix, connection issue status, GPS heartbeat awareness |
| `dashboard-worker.html` | 4 Firebase listeners, onDisconnect connection_issue, clock state persistence, GPS heartbeat 5min, _stopGPS(clockOut) flag |
| `index.html` | OM sphere v3 (GLSL+curl+sparks), 3D GLB nav logo, concrete+lava shader, dashboard screenshot cards, magnifier lens, hero layout fixes, word cycle repositioned |
| `server.js` | Mapbox token injected into dashboard-worker.html |
| `glo-service.js` | Inactive leases, inactive units, nominated tracts endpoints |
| `login.html` | Worker code login fix — dash normalization, Firebase ready wait |
| `sw.js` + `manifest.json` | PWA service worker |

---

## Worker Dashboard — Real-Time Listeners (4)

| Listener | Path | Fires When |
|---|---|---|
| Jobs | `bosses/{uid}/jobs` | Boss assigns/updates any job |
| Worker Profile | `bosses/{uid}/workers/{wid}` | Boss edits name, role, jobsite, shopCoords |
| GPS Record | `bosses/{uid}/gps/{wid}` | Own GPS updates — shows "Boss can see you · Live" |
| Timecards | `bosses/{uid}/timecards` | Boss approves hours |

### Clock State Persistence
- `clockedIn` + `clockInTime` saved to Firebase on clock-in
- On re-login: Listener 3 reads state → restores clock UI + restarts GPS
- Worker closes tab → `connectionStatus: 'connection_issue'` (not clockedIn:false)
- Explicit Clock Out → only time `clockedIn:false` writes

### GPS Heartbeat
- Every 5 minutes: re-pings Firebase with last known coords + fresh timestamp
- Keeps boss map GREEN when worker is stationary
- Stops cleanly on clock-out or GPS stop
- `isHeartbeat:true` flag distinguishes from real GPS fix

### onDisconnect
- Sets `connectionStatus:'connection_issue'` on unexpected close
- Never touches `clockedIn` — clock survives page refresh/logout

---

## Boss Dashboard — Worker Management

### Add Worker Modal (upgraded)
- **Tap any worker card** → opens Manage Worker modal pre-filled
- **Save Changes** — updates Firebase live
- **🗑 Remove** — deletes worker + GPS from Firebase (confirm dialog)
- **🔄 New Code** — regenerates unique JF-2026 code
- **🔗 Copy Login Link** — copies `yoursite.com/login.html?role=worker`
- **Connection Issue** status shown on worker card rows

### Firebase
- `remove()` imported — cleans worker + GPS node on delete
- `_removeWorkerFromFB(wid)` exposed to non-module JS

---

## Boss Dashboard — Desktop Layout Fix
- Sidebar always 240px visible on desktop — never collapses
- No hamburger on desktop
- `overflow:visible` on main — no inner scroll trap
- Nav items 48px min-height, 0.9rem font, 3px left border
- Mobile: hamburger + slide-in still works under 768px

## Boss Dashboard — Mobile Polish
- Stats 2×2 grid with proper gap
- Map toolbar horizontally scrollable
- All tap targets ≥44-48px
- Worker rows larger, easier to tap
- Modal full-width on mobile
- Detail panel = bottom sheet (50vh) on mobile

---

## GLO Service — New Layers
- `Oil_and_Gas_Leases_In_Active` → local GeoJSON (statewide)
- `Oil_and_Gas_Units_In_Active` → local GeoJSON
- `Oil_and_Gas_Lease_Sale_Nominated_Tracts` → live API
- Toggle buttons: ⬜ Inactive, 🏷 For Sale
- Inactive layers: grey dashed (leases), purple dashed (units)
- Nominated tracts: gold solid

---

## Homepage — index.html

### OM Sphere v3 (nav left)
- Custom GLSL ShaderMaterial: equator size boost, depth fade, chromatic aberration
- Curl noise flow field: divergence-free swirl, particles orbit sphere organically
- Electric arc sparks: 120 line segments jump between nearby particles
- Dark background (#060810) — gold particles glow properly

### 3D OIL MANAGER GLB (nav right)
- `OilStack/oil-manager-logo.glb` — renamed from spaces/parens filename
- 640×90px canvas, continuous Y rotation
- Concrete + lava GLSL shader: Voronoi cracks, animated lava flow, subsurface glow
- Lava color: white-hot → amber → orange → deep red

### Dashboard Screenshot Section
- 6 cards (3×2 grid): BDashboard, BGOOGLE, BNIGHT, BSATELLITE, BTERRAIN, BWIDE
- iOS-style magnifier lens on hover (2.8x zoom, 160px circle, gold ring)
- Gold label under each card, hover lift + zoom

### Hero Layout
- Content shifted down 14px
- "Permian Basin Field Operations" badge → absolute bottom-center
- Word cycle → top-right under nav, smaller font, gold text only (no background)
- GLB playlist: overflow:clip (no cutoff)

### Server
- `dashboard-worker.html` now gets Mapbox token injected (same as boss)

---

## Pending
- Geofencing: boss sets shop/job site coords in Settings → worker clock-in unlocks on arrival
- Routing (boss): Mapbox Directions between worker and job site
- "Get Directions" (worker): Google Maps link to assigned job site
- Twilio/SMS verification or fallback
- Incoming SMS webhook
- Payroll panel → pull from Firebase approved timecards
- Equipment + Field Reports panels
- Worker profile page full view
- Testimonials, FAQ, demo video on homepage
- Live callout bar on boss map (connection status indicator)
