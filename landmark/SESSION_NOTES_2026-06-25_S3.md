# OilManager — Session Notes 2026-06-25 (S3)

## Files Changed
| File | Changes |
|---|---|
| `index.html` | Maximum Voltage font, nav auth buttons, hero text lowered, hover magnify effects, phone expand modal, command center stats section, platform badges |
| `login.html` | Full redesign — black/orange theme, hard hat background, wider card, mode toggle, Google sign-in |
| `server.js` | NEW — Express backend, Twilio SMS routes, boss phone config, dispatch log |
| `sms-dispatch.html` | NEW — Full SMS boss dispatch UI |
| `package.json` | NEW — Node dependencies |
| `.env` | NEW — Twilio credentials wired |
| `.gitignore` | Keys excluded: TWILIO/, MapBox_Key/, google/, githubToken/ |
| `data/workers.json` | NEW — 5 worker roster |
| `data/config.json` | NEW — Boss config file |
| `Card Photos/login-bg.jpg` | NEW — AI generated hard hat background (Replicate flux-schnell) |
| `start.bat` | Updated — now runs node server.js, auto npm install |
| `Fonts/maximum_voltage/` | NEW — Maximum Voltage font files |

---

## Summary

### Font Swap — Maximum Voltage
- Loaded via `@font-face` from local `Fonts/maximum_voltage/` folder
- Replaced all `Bebas Neue` across `index.html` — headers, logo, stats, section titles, buttons
- Applied to login.html logo as well

### Hero Section
- iPhone hover: CSS `scale(1.18)` + gold drop shadow
- GLB hover: camera FOV lerps 42° → 28° on mouseenter, eases back on leave
- iPhone click: expands to full-screen overlay, 3D tilt follows mouse (±18° Y, ±14° X), ESC or click to close
- Platform badges: "SUPPORTS ANDROID" + "IOS" with SVG icons, positioned right of iPhone
- Hero text "Run Your Crew" lowered 50px (transform Y set to 0)

### Command Center Stats Section
- Replaced old bare stats row with full HUD layout
- 6 glass cards in 2×3 grid, max-width 1100px
- Card features: dark glass, blue-tinted border, inner top glow line, `@keyframes card-pulse` blue edge breathe, `@keyframes gold-shine` shimmer sweep on stat values
- Staggered fade-up on scroll (100ms delay between cards)
- Hover: card lifts -5px, border brightens, blue shadow
- Mobile: collapses to 1-col (768px) and 2-col (tablet)
- Section title: "Field Operations, Connected in Real Time"

### Twilio SMS Dispatch — Full Stack
- **server.js**: Express + Twilio SDK
  - `GET /api/workers` — worker list
  - `POST /api/config/boss-phone` — save company phone (masked on response)
  - `POST /api/sms/send` — send to selected workers
  - `POST /api/sms/broadcast` — send to all
  - `GET /api/sms/log` — last 200 dispatches
- **sms-dispatch.html**: Premium dark UI
  - Privacy warning: recommends work phone only, data never shared
  - Boss company phone input with save
  - Worker checklist (Select All / Clear)
  - Message composer with 5 quick templates + char counter
  - Send Selected + Broadcast All buttons
  - Right sidebar: Twilio setup guide (6 steps) + dispatch history log
- **Twilio credentials**: SID + Auth Token saved to `.env`
- **Phone number**: still needed — buy from console.twilio.com (432 area code)

### GitHub + Railway Deploy
- Git repo initialized, pushed to github.com/juancarlosfel52/OilManager
- Sensitive files excluded: TWILIO/, MapBox_Key/, google/, githubToken/, .env
- Mapbox token replaced with `MAPBOX_TOKEN_HERE` placeholder in dashboard-boss.html + route-recorder.html
- Railway connected to repo — env vars to add: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
- Railway domain needed for Twilio toll-free verification form

### Login Page — Full Redesign
- **Background**: AI-generated hard hat (matte black, "OM" embossed, orange LED glow, scuff marks, oil stains, 85mm bokeh) via Replicate flux-schnell → `Card Photos/login-bg.jpg`
- **Theme**: Black + orange/gold (matches homepage)
- **Card**: 560px wide, dark glass, gold shimmer border, backdrop blur
- **Mode toggle**: Log In / Sign Up — gold active state
- **Role toggle**: Supervisor / Worker — pill buttons
- **Google Sign-In**: Real Google logo SVG button on both boss login + sign up
- **Firebase SDK**: Wired via module import — awaiting user's Firebase config (6 values to paste)
- **Mobile**: Full-width card, reduced padding, scrollable

### Nav — Auth Buttons
- "Log In" (ghost) + "Sign Up" (gold border) added to nav
- Log In → `login.html`
- Sign Up → `login.html?signup=1` (auto-switches to signup tab)

---

## Active File Map
```
C:\Users\juanc\Desktop\OilManager\
├── index.html              — homepage (all sections)
├── login.html              — redesigned login/signup — FIREBASE CONFIG NEEDED
├── dashboard-boss.html     — main app — DO NOT TOUCH
├── dashboard-worker.html   — mobile worker view
├── server.js               — Express backend + Twilio API
├── package.json            — dependencies
├── .env                    — Twilio SID + token (gitignored)
├── .env.example            — template
├── .gitignore              — keys excluded
├── sms-dispatch.html       — boss SMS dispatch panel
├── start.bat               — runs node server.js
├── data/
│   ├── workers.json        — 5 workers (phone fields empty)
│   ├── config.json         — boss phone config
│   └── sms-log.json        — dispatch history (auto-created)
├── Fonts/maximum_voltage/  — Maximum Voltage .ttf/.otf files
├── Card Photos/
│   ├── login-bg.jpg        ← NEW hard hat background
│   └── [existing cards]
├── OilStack/               — GLB playlist models
├── TWILIO/                 — credentials (gitignored, local only)
└── githubToken/            — PAT (gitignored, local only)
```

---

## Pending
- **Firebase config** — paste 6 values into login.html for Google sign-in to work
- **Twilio phone number** — buy 432 area code number → add to .env + Railway vars
- **Railway domain** — generate URL → paste into Twilio toll-free verification form
- **Worker phone numbers** — fill in `data/workers.json` phone fields
- **Nav bar wiring** — wire nav links to dashboard pages
- **Mapbox token** — set `MAPBOX_TOKEN_HERE` back in dashboard-boss.html for production
- **Backend deploy** — push node server to Railway for live SMS
