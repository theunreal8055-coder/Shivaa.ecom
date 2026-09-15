# SHIVAA v115 — deploy note (categories back · phone self-heal · quick view · RTGS units)

Upload the contents of `shivaa-update-v115.zip` into your `public_html` web
root (the folder that holds `index.html` and `api.php`). Overwrite when asked.
Files sit at the **root of the zip** — no `cms/` folder to move.

## First — nothing was deleted

Extracting v113 did **not** remove your product categories. I read the live
`/api/products` after your upload: all 65 pieces are there, images and all.
What happened: v113's `app.js` carried forward a v111 rule — *"hide every
category that has no products"*. Your live catalogue is rings-only, so every
menu, grid and filter collapsed to a single "Rings" tile. It looked like
deletion; it was a display filter. v115 turns that filter off — all 17 house
categories show again, and an empty one lands on the shop's honest
"This category is being catalogued" screen instead of vanishing.

## What this release fixes

| # | Complaint | What changed |
|---|---|---|
| 1 | "v113 removed all my product categories" | `LIVE_CATS()` no longer filters — every category tile, menu row, filter checkbox and search suggestion shows again. No data was touched. |
| 2 | "the update changed nothing on my phone" | Your phone can pair a **fresh page with a stale script** held in a cache layer — that combination shows the new category grid but the old bugs. v115 adds a release handshake: `index.html` stamps its version before any script loads, and `app.js` reloads itself **once** if the script it was paired with is older. A device can no longer sit on mismatched code. The service-worker shell is also bumped to `shivaa-shell-v115`. |
| 3 | Quick view still bounces to the product page | If the single-piece fetch fails (flaky mobile network), the sheet now retries via the catalogue list endpoint — the very response the service worker keeps for offline shoppers. Only if both fail does it give up, and it **stays put** with a clear toast. A quick view never navigates away again. |
| 4 | Hero banner swipes still ignored (Android Chrome) | The carousel container itself now pins `touch-action: pan-y` (slides already had it; a finger landing on the arrows/dots/seams was still free for Android to claim as a scroll, cancelling the swipe). Banner images are no longer natively draggable (long-press used to cancel the gesture), and the vertical-vs-swipe classifier is less eager — real thumbs drift. |
| 5 | Bonus — RTGS cells were 10× off | The v113 rate strip printed "RTGS Gold 9999 ₹15,491 / 10 g" — that is the **per-gram** number under a per-10 g label. `api.php` now quotes the strip in true display units (gold ₹/10 g, silver ₹/kg), the same units the partner desk renders. Expect ~₹1,54,910 and ~₹2,34,900 style figures. |

## Files in the zip

| Path | Change |
|---|---|
| `index.html` | release stamp `window.__SHIVAA_REL=115`; loads `css/v115.css`; `app.js` buster → `?v=115` |
| `js/app.js` | handshake guard; `LIVE_CATS()` unfiltered; quick-view offline fallback; carousel touch hardening |
| `css/v115.css` | new layer: carousel `touch-action:pan-y` + no native image drag |
| `sw.js` | shell cache → `shivaa-shell-v115`; precache list matches `index.html` exactly (21/21) |
| `api.php` | `rtgs_strip()` returns display units (v114's invoice fix is included) |
| `DEPLOY-v115.md` | this note |

## After upload — the phone step matters

1. On the Android phone: **close every Chrome tab** showing shivaa.in, then
   open the site fresh (or pull-to-refresh twice on an open tab). The first
   fresh load pairs the new shell with the new script; the handshake guard
   now makes this automatic, but the tab must reload once.
2. If anything still looks old: Chrome → **shivaa.in → Site settings →
   Clear & reset** (or Settings → Site data → shivaa.in → Clear), then
   reopen. One time is enough.
3. Sanity check: the homepage shows all 17 category faces; the rate strip's
   two RTGS cells read in lakhs (₹/10 g gold, ₹/kg silver); tapping
   ✦ Quick view opens the sheet where you are; the banner deck swipes after
   you've scrolled the page.

## Verify before you upload (optional, 30 seconds)

```bash
node tools/mega/smoke/v113b-check.js     # 32/32 checks (incl. the 17 tiles)
node --check cms/js/app.js               # JS syntax
node tools/mega/php-sweep/sweep.mjs      # 211 routes · 0 exceptions
```

## Rollback

File-level and additive, like every release. Re-upload `index.html`,
`js/app.js`, `css/v113.css`, `sw.js` and `api.php` from
`shivaa-update-v113.zip` and hard-refresh. No database or data change is
involved in any of this.
