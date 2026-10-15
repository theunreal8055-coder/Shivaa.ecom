# DEPLOY-v211.md — release 211 · "THE STILLNESS RELEASE" · a hero that never flickers

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 211 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v211 and includes the **film files**
(`images/films/` — 18 media files) so the case cannot come back empty.

---

## 1 · The owner's orders → what was wrong → the fix

### ① "The Shivaa Black membership hero banner still flickers and flashes, scrolling effects are very bad — make it very smooth"

The v209 pass fixed the header blur and the v208 parallax, but the banner
itself still carried a whole repaint kit. Every item below was re-drawing the
banner on scroll or mouse-move — the flicker, flashing and bad scroll feel:

| # | What it was | v211 |
|---|---|---|
| a | SVG turbulence noise in `mix-blend: soft-light` over the hero AND the card face | removed |
| b | Aurora rings with `filter: blur(2px)` + glowing line | painted rings, no filters |
| c | Stage glow with `filter: blur(70px)` | one radial-gradient painting |
| d | `filter: drop-shadow` on the card wrap — flattens the 3D flip and re-rasterises on every frame | gone; shadow lives on the card |
| e | `filter: brightness` on card hover | hover lift via box-shadow only |
| f | The card tilted with the pointer (`rotateX/rotateY` + moving light gradient) — two motion systems fighting the flip | frozen: the card is a still composition; hover only raises a soft highlight |
| g | Orbit ring (26 s) + micro-grid (14 s) loops on the card face | engraved metal, still |
| h | "discover" cue bounce/blink, the Gold-Biscuit CTA pulse, moving shimmer/foil gold text (background-clip gradients = flashing text) | all infinite animation stopped; gold look kept |
| i | `backdrop-filter` blur on the hero kicker and the stage status pill | solid glass |
| j | 60 fps twinkling gold-dust canvas over the card | painted once as a still starfield |
| k | Pointer-depth parallax on the stage (card + certificate wobble) | retired — fixed composition |

What remains: the card's own 5D tap-to-flip (that is the feature), and a
single one-shot rise entrance. Everything else is stillness.

### ② "Make the food offer banners more artistic and more graphically advanced"

The three dish banners (Amrita ji's menu) are now full art panels:

- each photo sits on a **struck copper charger plate** (gold ring, dual shadow);
- behind each plate a **painted spice-bloom scene** in its own colour story —
  idli = dawn cream & copper · dosa = butter gold & turmeric · paneer =
  saffron cream & deep tomato — with real garnish dots painted in the ground;
- the chosen dish lights its plate ring with a gold bloom;
- the confirm tick is a **struck wax seal**;
- the menu panel itself gets an engraved double frame and a foil-gradient
  title, with catalogue-label typography on every dish.

### ③ "The case is still not working — give me a perfect update"

The film **files** ship in this zip again (18 media files — the root cause of
a dead case on the host). And the case is now impossible to show broken:

- every card paints its **poster photo under the video**, always;
- if a film file is missing, blocked or corrupt, the card **keeps its still
  frame**, marked "✦ still frame" — never a black rectangle;
- all four films still autoplay their muted loops on screen (v210), the case
  still turns itself, drag/arrow/tap still work;
- the hint no longer says "ONLY THE FRONT FILM PLAYS" (that was the old
  design and contradicted what you wanted) — it now says **ALL FOUR FILMS
  PLAY**.

## 2 · Files

- `cms/css/v211.css` — the stillness layer (hero smoothness + food art + case
  fallback styles).
- `cms/js/app.js` — hero dust static, card light-follow frozen, pointer-depth
  parallax retired.
- `cms/js/v125.js` — poster-under-video + error fallback, honest hint copy.
- `images/films/` — still inside the zip (18 files).
- Stamps: 211 in index.html (83× `?v=211` + `__SHIVAA_REL=211` + v211.css),
  sw.js `shivaa-shell-v211` / REL 211 / SHELL_FILES incl. `/css/v211.css?v=211`,
  app.js `APP_REL`, api.php `'rel' => 211`.

## 3 · Verification (run before packaging)

| Check | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` (incl. new S3c stillness + hardening asserts) | **PASS 50 / FAIL 0** |
| `qa/browser/t-v206-flip.mjs` | **ALL PASS** |
| `qa/browser/t7-audit.mjs` | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js | OK |
| v211.css braces | balanced (62/62) |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 211.
2. `cms/` tree from `shivaa-update-v211.zip` → domain root. The `images/films/`
   folder is inside — let it arrive.
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v211`.
4. Smoke: the Shivaa Black hero scrolls dead-still (no flicker/flash on the
   laptop); the card flips smoothly on tap; the three food banners read as
   art panels; the films case shows all four films moving (or their still
   frames) and turns itself.

## 5 · Rollback

If anything is live newer than 211, stop. Previous good zip:
`shivaa-update-v210.zip` (sha256
`5a395c99e73367df122cd1a11aa88c83523b09f3156d6d91417699e349e3046c`).
Live baseline remains v205. Never renumber; fix forward as v212.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-13. Zip:
`shivaa-update-v211.zip` — 336 files, 36,292,392 bytes. sha256:
`97e1889c441c5f1a4da7b54ac4c6cd30ea34d5689988ed3474890eab2f463d97`

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v211.zip`
