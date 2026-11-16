# NEXT CHAT HEAD — read this first

> **CURRENT STATE — v251 “Alive” PACKAGED, AWAITING THE OWNER'S YES (16 Nov 2026).**
> The only zip to install: **`shivaa-update-v251.zip`** — **772 files · 45,504,067 B ·
> `c03ff713453d3d2c7c3ed2c93168419f8d6b5eb06b3927471eb22a81c4fa60fa`**.
> It contains v237–v250, so **one upload brings the shop fully up to date.**
> **Next release number: v252.** Branch: `arena/95be65a4-shivaa-ecom`.
> Raw link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/95be65a4-shivaa-ecom/shivaa-update-v251.zip`

> **v251 in one paragraph.** The owner: *“The app should feel more live and smooth and the smoothness must be on
> the next level, it should load faster and without decreasing the quality.”* v250 had taken the phone's
> continuous animation away and, with it, every sign that the shop is alive. v251 gives the sign back out of a
> budget a phone can spare — transform and opacity, answered by an event, never running on its own — and makes
> the page smaller on the way in **without touching what it looks like**: `index.html` now loads
> `css/shivaa.min.css` (965,451 → 876,841 B), written by a new `tools/build-css-min.mjs` that **refuses to write
> a sheet that is not structurally identical** to the readable bundle (8,758 effective rules compared with their
> media context, 9 `@font-face`, 264 `@keyframes`, `restructure:false` so no rule is ever merged or moved).
> Press on every tappable surface (90 ms, `scale(.977)`, `filter` removed), a pending price that breathes, a
> 6 px live dot on the utility strip, the first row settling 24 ms apart, the bag badge popping, a gold hairline
> sweeping when a fresh rate lands, and a 2 px read bar filling to the shopper's place in the page — transform
> only, one rAF per scroll frame, page height measured **off** the scroll path. `decoding="async"` on all 43
> image templates. On a settled page exactly **one** of the live signals is running. New instrument:
> `Shivaa.v251.report()` → `alive 251 · phone · live pulses 1 · pending prices 0 · sync-decode fixups 0 · page 0%`.

> **BRANCH WARNING.** Work on `arena/95be65a4-shivaa-ecom` only. The `release_branch` field inside
> `docs/release-ledger.json` still says `arena/e8a470c6-shivaa-ecom` for the twin tree — do **not** switch
> to it, do not create a branch, do not force-push. Forward-only.

> **Before anything else:** `bash qa/where-am-i.sh` → exit 0 FORWARD, then `python3 qa/check-handoff.py` and
> `node qa/browser/t-v251-alive.mjs` (46) and `node qa/browser/t-v250-still.mjs` (34).

---

## 1 · What the owner asked for, in his words

> *“The website still legs and there are flickering issues and scrolling also strucks and the page doesn't move
> anywhere sometimes, the app doesn't feel smooth and lightning fast … even if I don't have mention them find
> them and fix them and also make the app smooth the screen also should not blink always.”*

Four symptoms. v250 answers all four **with measurements taken on the real files**, not with adjectives:

| symptom | what it actually was | fix |
|---|---|---|
| lag / not fast | the phone was compositing **21 backdrop-filter passes, 6 blending groups, 4 full-surface blurs, 31 layer promotions and 25 never-ending animations** on the home screen alone | `css/v250.css` budget + `js/v250.js` quiet pass → **15 animated, 2 infinite, 0 blur, 0 blend, 0 promoted** |
| flickering | **v248's own rule**: it cut every entrance animation while `html.shv-scrolling` was on, and that class toggles at the first scroll event of every gesture — so animations were cut and restarted on every scroll | rule retired; nothing needs cutting now |
| blinking | `#view > *{animation:viewIn .45s both}` (and `#view`) faded **every page** in from `opacity: 0`; `.rv-item`, `v210Rise`, `v211Rise`, `starPop` did the same | fixed at the source in `css/styles.css`, `v210`, `v211` + a `#view,#view > *` guarantee |
| scrolling strucks | the shop page held the storefront's **only non-passive `touchmove` listener** on `#view` for its whole life (pull to refresh) — every frame of every gesture waited on the main thread | armed only while a pull is in progress; `overscroll-behavior-y: contain`; hover transforms that stick after a tap neutralised |
| the page doesn't move anywhere | `lockScroll()` is a counter; one missed release left `html.no-scroll` set with nothing open → the shop could not be scrolled at all and every tap looked dead | `js/v250.js` watchdog: lock on + **no visible** overlay + the shopper is trying to move the page → `Shivaa.forceUnlockScroll()` |

## 2 · How this was found (do it this way again)

Measure the rendered page, not the source:

```js
// in the app:  Shivaa.v250.audit()   →  { elements, blurPasses, blends, filterBlur, running, infinite, promoted, frozen }
// in a suite:  boot('#/', { mobile: true })  then getComputedStyle over #view
```

The numbers in `css/v250.css`'s header (141 animated → 15, 25 infinite → 2, 21 → 0 blur …) came from exactly
this. **No rule in this release was written before it was measured.** If the owner reports anything again, run
`Shivaa.v250.report()` first and let the numbers choose the fix.

## 3 · HARD RULES (do not re-learn these the hard way)

- **Never `content-visibility`.** v244 froze a phone with it.
- **Never `overflow-x: hidden` on `html, body`** — use `overflow-x: clip`.
- **Never `preventDefault()` a navigation link** (only `?vt=1`, which is off).
- **Never leave `scroll-behavior: smooth` on `html`** — a route change must be a jump.
- **Never a non-passive `touchmove`/`wheel` listener on a large subtree.** That single line is what “scrolling
  strucks” means on a phone.
- **Never animate content in from `opacity: 0`** (and never `animation-fill-mode: both` on content).
- **Never switch animations off inside a class that toggles with a gesture** — cutting and restarting is a flicker.
- **A phone gets no `backdrop-filter`, no `mix-blend-mode`, no `filter: blur()`, no never-ending animation.**
  Scope the look to `html.shv-mobile` (set during parsing) and let the desktop keep it.
- **The stylesheet ships minified, and only through its proof.** `cms/css/shivaa.min.css` is written by
  `node tools/build-css-min.mjs`, which compares the minified sheet with `cms/css/shivaa.css` rule by rule
  (selector **and** media context, `@font-face` count, `@keyframes` names) and exits 1 rather than write a sheet
  that differs. Never hand-edit either file, never switch csso to `restructure: true` (it merges and moves
  rules), and never delete the proof to make it pass — normalise the comparison instead (comma-space,
  attribute quoting, `*` implied before a combinator or a pseudo, empty `@media` blocks).
- **Never read `scrollHeight` inside a scroll handler.** v251's read bar measures the page on resize and after a
  route; reading layout in the scroll path is how a smoothness feature becomes the jank it answered.
- **Bundles are generated**: `build-js-bundle.py --write`, `build-css-bundle.py --write`, then **always**
  `node tools/build-min.mjs` (and commit `app.min.js` + `rel.min.js`; the sha256 banner is a gate).
- **Never write `images[0]` into `src=`** — every picture goes through `thumbAttrs()`.
- **Never ship** `.htaccess`, `config.php`, `cms/data/db.json`; no credentials in chat.
- **Never guess a number into a handover.**

## 4 · The instruments

| what | how |
|---|---|
| what the phone is compositing right now | `Shivaa.v250.report()` |
| how many times the page redrew itself | `Shivaa.v249.report()` |
| how long a tap took (press → hash → page → paint) | `Shivaa.v248.report()` |
| the same on screen, for a screenshot | `?tapdiag=1` |
| kill every decorative behaviour | `?nofx=1` |
| a page that will not scroll, on demand | `Shivaa.v250.checkFrozen()` |

## 5 · If he still says it lags

1. `Shivaa.v250.report()` — if `blur`/`blend`/`infinite` are not 0/0/≤2, the budget is not being applied:
   check that `html.shv-mobile` is present (`Shivaa.v250.mobile`).
2. `Shivaa.v248.report()` — if `press → hash` is large, a click is intercepted; if `long tasks` are large, look
   for a big parse or a layout read in a scroll handler.
3. `Shivaa.v249.report()` — if `unasked repaints` is large, something is still calling `Shivaa.redraw()`.
4. Still slow **on the first byte**: the host. Ask for the response headers of `…/js/app.min.js`
   (`Content-Encoding`, `Cache-Control`). `.htaccess` is never shipped; compression may be off.
5. Only then consider cutting payload further. Do not add animation to compensate.

## 6 · Verification state at packaging

- `python3 qa/check-handoff.py` → **247 checks, 0 red** (after this file and the zip are committed).
- **447 browser checks, 0 red**: `t-v250-still` 34, `t-v249-steady` 36, `t-v248-instant` 37, `t-v247-premium` 53,
  `t-v246-light` 58, `t-v245-scroll` 39, `t-v244-butter` 54, `t-v243-header` 36, `t-v242-taps` 41,
  `t-v241-perf` 43, `t-v240-rip` 16.
- Measured on the phone home (1284 elements): animated **141 → 15**, infinite **25 → 2**, blur **21 → 0**,
  blend **6 → 0**, filter-blur **4 → 0**, promoted **31 → 0**.
- Shipped JS: 1,282,512 B → **792,000 B** (minified, fingerprinted); CSS bundle 960,576 B.
- Stamps at 250: `index.html`, `app.js` `APP_REL`, `sw.js` `REL` + `shivaa-shell-v250` + precache, `api.php` `rel`.

## 7 · Paste block for a fresh chat

```
Repo     theunreal8055-coder/Shivaa.ecom   branch arena/95be65a4-shivaa-ecom (do not switch, do not force-push)
Live     v250 “Still” — packaged 12 Nov 2026, awaiting the owner's yes (deployed build on his host: 244)
Package  shivaa-update-v250.zip · 769 files · 45,317,152 B
         sha256 0b96fcf2d7604090fb73d3f222e381fca9ccdab8f309a7d5944d09bedc295537
Contains v237–v249
Next     v251 — start from Shivaa.v250.report() + v249 + v248, never from a guess
Gates    node qa/browser/t-v250-still.mjs (34) · python3 qa/check-handoff.py (247) · node tools/build-min.mjs --check
Rules    no content-visibility · no overflow-x:hidden on html/body · never preventDefault a nav link
         no scroll-behavior:smooth on html · no non-passive touchmove on a big subtree
         nothing animates in from opacity 0 · a phone gets no blur/blend/filter/infinite motion
         bundles + min are generated · .htaccess / config.php / db.json never ship
```
