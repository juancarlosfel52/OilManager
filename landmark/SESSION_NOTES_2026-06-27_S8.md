# OilManager — Session Notes 2026-06-27 (S8)

## Files Changed
| File | Changes |
|---|---|
| `dashboard-boss.html` | Texas payroll system, worker W2 fields, timecard live render, Mapbox Directions routing, desktop sidebar fix |
| `dashboard-worker.html` | Route Recorder integrated into map, 4 Firebase listeners, clock persistence, GPS heartbeat |

---

## Texas Payroll System

### Worker Modal — New Payroll Fields
- **Hourly Rate** ($/hr)
- **W2 Filing Status** — Single / Married Filing Jointly / Head of Household
- **Federal Allowances** — W4 line 5 value
- **SSN Last 4** — stored for records only
- All fields save to Firebase with worker record
- Pre-filled when editing existing worker

### Time Cards Panel — Live from Firebase
- Summary bar: pending count · total hours · estimated gross pay
- Each card: worker initials, name, job, date, hours, gross at their rate
- OT highlighted in gold when hours > 40
- Approve/Deny writes status to Firebase instantly
- Approved history section below pending
- `approveAllTC()` writes all pending → approved in Firebase

### Payroll Panel — 2024 Texas Calculations
| Deduction | Rate | Notes |
|---|---|---|
| Federal Income Tax | Per bracket | 2024 IRS Pub 15-T, 3 filing statuses |
| Social Security | 6.2% | Employee portion |
| Medicare | 1.45% | Employee portion |
| Texas State Tax | **$0.00** | Texas has no state income tax |
| Overtime | 1.5x | After 40 hrs/week |

- Columns: Worker, Filing, Rate/hr, Reg Hrs, OT Hrs, Gross, Fed Tax, SS, Med, TX State ($0), Net Pay
- Totals footer row
- CSV Export: all columns + `NOTE: Texas has no state income tax` + timestamp
- Pay period selector: This Week / Last 2 Weeks / This Month
- Re-renders when worker rates or timecards change in Firebase

---

## Route Recorder — Worker Dashboard

### Built into Field Map section (no separate page)
- **⏺ Record Route** button above map
- Starts `watchPosition` — draws live red dashed line on Mapbox map
- Stats bar while recording: pts · distance (mi) · elapsed time
- **⏹ Stop** → prompts for route name → saves to `localStorage`
- Saved routes listed above map with name, distance, date
- **Show** → draws gold line, auto-fits map bounds
- **✕** deletes route
- Up to 20 saved routes per worker per boss

### Nav label updated
- "Map" → "Lease Roads" with 🛣 icon
- Tooltip updated to explain route recording

---

## Mapbox Directions — Boss Dashboard

### Predictive routing on job/worker selection
- Job detail panel: **🗺 Get Route** button
- Worker detail panel: **🗺 Route Here** button
- Calls `mapbox/driving` directions API
- Origin: live worker GPS position if available, else map center
- Draws green route line on boss map
- Auto-fits bounds to show full route
- Toast notification: `"Job Name — X.X mi · ~XX min"`
- `clearRoute()` helper for cleanup

---

## Desktop Sidebar Fix
- Sidebar always 240px visible on desktop — never collapses
- No hamburger button on desktop (`display:none!important`)
- `overflow:visible` on `.main` — no inner scroll trap
- Nav items: 48px min-height, 0.9rem font, 3px left gold border on active
- Mobile: hamburger + slide-in still works under 768px

---

## Pending
- Geofencing: boss sets shop/job site coords in Settings → worker clock-in unlocks on arrival
- Incoming SMS webhook (`/api/sms/incoming`) in server.js
- Textbelt/Vonage SMS fallback
- Worker phone numbers in data/workers.json
- Homepage: testimonials, FAQ, demo video section
- Equipment + Field Reports panels build out
- Worker profile full view page
- Live callout bar on boss map (connection status)
- Route recorder: save routes to Firebase so boss can see worker-recorded lease roads
