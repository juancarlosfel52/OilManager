# OilManager — Session Notes 2026-06-27 (S9)

## Files Changed
| File | Changes |
|---|---|
| `index.html` | Removed "Built For The Field" section, tighter spacing, scroll reveals, section blends, GLB zoom radius fix, 3D text removed from nav |
| `dashboard-boss.html` | Android scroll freeze fix, desktop sidebar always visible |
| `login.html` | Google sign-in mobile fix — redirect race condition resolved |

---

## Homepage Cleanup & Polish

### Removed
- "Built For The Field" features section (was duplicate content)
- Dot nav entry for features
- Nav link for Features
- 3D OIL MANAGER GLB text canvas from nav

### Spacing Tightened
- `section` padding: `6rem 5%` → `4.5rem 5%`
- Stats section: `7rem` → `5rem`
- CTA banner: `6rem` → `4rem`
- Stack section: `6rem` → `4.5rem`

### Scroll-Driven Reveals (4 variants)
- `.reveal` — fade up (default, was already there, improved)
- `.reveal-left` — slide in from left
- `.reveal-right` — slide in from right
- `.reveal-scale` — scale up from 0.92
- Stagger delays `.reveal-delay-1` through `.reveal-delay-6`
- How It Works: left col = reveal-left, right visual = reveal-right
- Grid children (stats, dashboard screenshots) auto-staggered with reveal-scale
- Observer threshold 0.1 + rootMargin `-40px` for earlier trigger

### Section Gradient Blends
- `#stats`, `#stack-section`: 80px dark fade at top
- `#how`, `#who`, `#pricing`, `#cta-banner`: 60px dark2 fade
- Smooth visual flow between sections, no hard cuts

### GLB Playlist Hover Zoom
- Was: triggers on entire 55% wide container
- Now: triggers only within **200px radius** of model center
- FOV: `42→28` reduced to `42→32` (less aggressive)
- Uses `mousemove` + distance check instead of `mouseenter`

---

## Android Boss Dashboard Scroll Fix

### Root Cause
`body{overflow:hidden}` + `.layout{height:calc(100vh-60px)}` locked the viewport completely on Android — no scroll possible at all.

### Fix
- `body`: `overflow:hidden` → `overflow-x:hidden; overflow-y:auto`
- `.layout`: `height:calc(100vh-60px)` → `height:auto; min-height:calc(100vh-60px); overflow:visible`
- `.main`: `overflow:visible; height:auto`
- Sidebar stays `position:fixed` — overlays without affecting scroll

---

## Google Sign-In Mobile Fix

### Root Cause
Race condition on mobile:
1. User taps Google → `signInWithRedirect` → Google → comes back
2. `onAuthStateChanged` fires immediately with existing session
3. Redirects to dashboard BEFORE `getRedirectResult` runs
4. For existing users: popup flashes white, closes, nothing happens

### Fix
- `_handlingRedirect` flag set to `true` when `getRedirectResult` detects an active redirect
- `onAuthStateChanged` checks flag — only redirects if `!_handlingRedirect`
- `getRedirectResult` handles the full flow: save profile if new user → redirect
- Catches `auth/cancelled-popup-request` silently alongside `auth/popup-closed-by-user`

---

## Pending
- Geofencing: boss sets shop coords in Settings → worker clock-in unlocks on arrival
- Route recorder: sync saved routes to Firebase so boss can see worker-recorded lease roads
- Incoming SMS webhook
- Equipment + Field Reports panels
- Live callout bar on boss map (connection status)
- Testimonials, FAQ, demo video on homepage
