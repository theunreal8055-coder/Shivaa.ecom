# NEXT CHAT HEAD — read this first

> **CURRENT STATE — v249 “Steady” PACKAGED, AWAITING THE OWNER'S YES (12 Nov 2026).**
> The only zip to install: **`shivaa-update-v249.zip`** — **767 files · 45,302,852 B ·
> `b165432761e840e7b9d4e76dfcb56e0d2a76b983c9923ef67905efdb0cb6a365`**.
> It contains v237–v248, so **one upload brings the shop fully up to date.**
> **Next release number: v250.** Branch: `arena/95be65a4-shivaa-ecom`.
> Raw link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/95be65a4-shivaa-ecom/shivaa-update-v249.zip`

> **BRANCH WARNING.** Work on `arena/95be65a4-shivaa-ecom` only. The `release_branch` field inside
> `docs/release-ledger.json` still says `arena/e8a470c6-shivaa-ecom` for the twin tree — do **not** switch
> to it, do not create a branch, do not force-push. Forward-only.

> **Before anything else:** `bash qa/where-am-i.sh` → exit 0 FORWARD (exit 3 = this tree is behind; stop and
> move to the release branch it names), then `python3 qa/check-handoff.py` and
> `node qa/browser/t-v249-steady.mjs` (36).

---

## 1 · What the owner asked for, in his words

> *“Screen blinks and still slow loading, fix this in the next update.”*

Two symptoms, two unrelated causes. Both were answered by **removing** something, not by tuning it:

| symptom | cause | gone in v249 |
|---|---|---|
| the screen blinks | content that starts at `opacity: 0` and fades in | `css/v249.css` — entrance motion travels 6 px, it never fades up from nothing (route rise, `.rv`, `.rv-in`, picture fade) |
| the screen blinks | a **second full render**: the late boot batch ran `calmBoot(0)` and rewrote `#view` | `adoptLateBatch()` — state + `.js-price` patch + `rates` event, no repaint; `js/v166.js` uses `Shivaa.softCatalogue()` instead of `redraw()` |
| the screen blinks | a full-screen maroon splash painted on every reload | `html.shv-warm`, set by an inline script in `index.html` **before the first frame**; the splash is never painted for a device that already holds the catalogue |
| slow loading | 1.28 MB of unminified JavaScript to download and parse | `tools/build-min.mjs` — **1,282,512 B → 787,267 B raw (−39 %)**, 383 → 243 KB gzip, ~40 % less parse, behind a verified sha256 fingerprint |

## 2 · Never do these again

- **Nothing that is content may animate in from `opacity: 0`.** A fade-up is a blank frame on a phone.
  If a transition needs to hide content to look good, delete the transition.
- **A data refresh may not repaint the page.** Every price is a `.js-price[data-pid]` slot; patch it.
  `redraw()` is for an empty grid, not for fresh numbers.
- **Never paint a curtain over a page that is already there.**
- **Never hand-edit `app.min.js` / `rel.min.js`.** Run `node tools/build-min.mjs`. The banner carries the
  sha256 of the source; `qa/check-handoff.py` fails the handover if it disagrees, so a stale min cannot ship.
- If terser is missing: `npm i --no-save terser@5` in a directory node can see (this build resolves it from
  `/tmp/mindeps` or the cwd — the repository deliberately has no `node_modules`).

## 3 · The instruments

| what | how |
|---|---|
| how long a tap took (press → hash → page → paint) + long tasks | `Shivaa.v248.report()` |
| how many times the page redrew itself, and whether it was asked for | `Shivaa.v249.report()` |
| the same, on screen, for a screenshot | open the site with `?tapdiag=1` |
| kill every decorative behaviour | `?nofx=1` |
| previous audits | `Shivaa.v245.audit()`, `Shivaa.v247.audit()` |

## 4 · Honest limits — say this to him

jsdom has no compositor, no rasteriser and no scroll engine. This release's claims are of two kinds:
**structural** (nothing starts at `opacity: 0`; the warm path renders `#view` exactly once, proven with a
seeded catalogue and a deliberately slow 1.2 s API; the splash is `display:none` on a warm boot) and
**measured bytes** (39 % smaller). Whether his phone *feels* steady is his call, and the two `report()` lines
are how he can show it.

## 5 · HARD RULES (do not re-learn these the hard way)

- **Never `content-visibility`.** v244 froze a phone with it.
- **Never `overflow-x: hidden` on `html, body`** — use `overflow-x: clip`.
- **Never `preventDefault()` a navigation link** (only `?vt=1` may, and it is off).
- **Never leave `scroll-behavior: smooth` on `html`** — a route change must be a jump.
- **Never write `images[0]` into `src=`** — every picture goes through `thumbAttrs()` / `thumbUrl()`.
- **Bundles are generated**: `python3 tools/build-js-bundle.py --write`, `python3 tools/build-css-bundle.py --write`,
  then **always** `node tools/build-min.mjs` (and commit `app.min.js` + `rel.min.js`).
- **Never ship** `.htaccess`, `config.php`, `cms/data/db.json`; no credentials in chat.
- **Never guess a number into a handover.** If it is not measured, say it is not measured.

## 6 · If he says it still blinks or still loads slowly

1. Ask for two lines: `Shivaa.v249.report()` and `Shivaa.v248.report()`.
2. `unasked repaints > 0` → something is still calling `Shivaa.redraw()` after a data change. Find the caller
   (grep `redraw` in the layers) and give it a `softCatalogue()`-shaped path.
3. `press → hash` large → a click is being intercepted again.
4. `long tasks` large → look for a 100 KB+ parse, a big image decode (`thumbAttrs` bypassed), or a layout read
   in a scroll handler.
5. Still slow on the *first* byte → it is the host, not the code: check whether his server is sending
   `Content-Encoding: gzip` and `Cache-Control` for `/js/*.js`, `/css/*.css`, `/images/*`. `.htaccess` is
   never shipped, so this may be the first time anyone looked. Ask him for the response headers of
   `…/js/app.min.js` (browser devtools → Network → Headers).

## 7 · Verification state at packaging

- `python3 qa/check-handoff.py` → **239 checks, 0 red** (after this file and the zip are committed).
- **413 browser checks, 0 red**: `t-v249-steady` 36, `t-v248-instant` 37, `t-v247-premium` 53,
  `t-v246-light` 58, `t-v245-scroll` 39, `t-v244-butter` 54, `t-v242-taps` 41, `t-v241-perf` 43,
  `t-v243-header` 36, `t-v240-rip` 16.
- `build-js-bundle.py` → 35 layers, one request · `build-css-bundle.py` → 76 layers, one request ·
  `build-min.mjs` → 582,378 B + 204,889 B.
- Stamps at 249: `index.html` (`__SHIVAA_REL`, every `?v=`), `app.js` `APP_REL`, `sw.js` `REL` +
  `shivaa-shell-v249` + the precache list (the `.min` pair), `api.php` `'rel' => 249`.

## 8 · Paste block for a fresh chat

```
Repo     theunreal8055-coder/Shivaa.ecom   branch arena/95be65a4-shivaa-ecom (do not switch, do not force-push)
Live     v249 “Steady” — packaged 12 Nov 2026, awaiting the owner's yes (deployed build on his host: 244)
Package  shivaa-update-v249.zip · 767 files · 45,302,852 B
         sha256 b165432761e840e7b9d4e76dfcb56e0d2a76b983c9923ef67905efdb0cb6a365
Contains v237–v248
Next     v250 — start from Shivaa.v249.report() + Shivaa.v248.report(), never from a guess
Gates    node qa/browser/t-v249-steady.mjs (36) · python3 qa/check-handoff.py (239) · node tools/build-min.mjs --check
Rules    no content-visibility · no overflow-x:hidden on html/body · never preventDefault a nav link
         no scroll-behavior:smooth on html · no content that fades up from opacity 0 · bundles + min are generated
         .htaccess / config.php / db.json never ship
```
