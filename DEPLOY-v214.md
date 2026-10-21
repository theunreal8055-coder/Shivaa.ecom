# DEPLOY-v214.md — release 214 · "THE SMOOTH RELEASE" · a floating card, a case that cannot fail

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 214 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v214 and includes the **film files**
(`images/films/` — 18 media files).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "Completely remove the feature of tap to see card front or back"

Done — completely. The card no longer turns: no tap handler, no keyboard
flip, no "Tap the card to see the reverse/front" pill, no flip API. The
card is a display object (back-first surfaces still show their reverse face
as a static composition). The old flip test suite now guards the removal.

### ② "Make the card a little more animated and floating"

The card now **floats** — a slow 6.8-second bob with a gentle sway
(compositor-only motion, never filters), and a soft gleam sweeps its face
every few seconds. It feels alive without ever flickering.

### ③ "Load smoother — the flicker when scrolling is still there"

The deep pass found what three earlier rounds missed:

1. **Every product/category photo was loading blurred.** The motion layer
   gave all images `filter: blur(6px)` and sharpened them on load — dozens
   of blur filters re-rasterising as you scroll IS the flicker you keep
   seeing, and it made the site feel slow. The blur is gone; images keep
   their soft fade-in only.
2. **The gold-ambience layer was still flashing.** Its animated shimmer on
   hero words (moving gold gradients through letters), a pulsing 24px blur
   glow behind the hero stage (it was overriding the v211 stillness fix),
   and infinite CTA halos/shine sweeps are all frozen — entrances remain,
   loops are gone.
3. The home final banner's image filter is removed (the shading overlay
   already does that job).
4. **Smoother loading**: large below-fold sections (product grids, category
   walls, pillars, offer row) now render only when near the viewport —
   faster first paint and calmer scrolling.

### ④ "On the phone: can't see the case, drag-to-spin not working, all four films not visible"

Three separate phone bugs, all fixed:

1. **Drag**: my previous "tap hygiene" rule (`touch-action: manipulation`
   on the film cards) handed horizontal swipes BACK to the browser — that
   is why drag-to-spin was still dead on phones while the laptop worked.
   The cards now run `touch-action: pan-y`: up/down scrolls the page,
   sideways spins the case, guaranteed.
2. **"All four films are not visible"**: on older phone browsers the
   inline 3D transforms were written without the webkit prefix, so the
   four cards never moved out of one spot. Transforms are now written
   prefixed and unprefixed. And below the case there is now a **thumb rail
   of ALL FOUR films** — always visible on phones, tap one to bring it to
   the front (or play it full screen when it is already front).
3. The ring keeps its auto-tour, arrows and poster fallbacks.

## 2 · Files

- `cms/css/v214.css` — card float + gleam, case pan-y fix + thumb rail,
  flicker deep pass (image blur kill, aurum loop freeze), load smoothing.
- `cms/js/app.js` — flip feature removed entirely (markup, handlers, API).
- `cms/js/v125.js` — prefixed inline transforms (`setT`), thumb rail with
  tap-to-front.
- Stamps: 214 in index.html (86× `?v=214` + `__SHIVAA_REL=214` + v214.css),
  sw.js `shivaa-shell-v214` / REL 214 / SHELL_FILES incl. `/css/v214.css?v=214`,
  app.js `APP_REL`, api.php `'rel' => 214`.
- `images/films/` — still inside the zip (18 files).

## 3 · Verification (run before packaging)

| Check | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` (S1 no-flip · S3f float/rail/flicker) | **PASS 76 / FAIL 0** |
| `qa/browser/t-v206-flip.mjs` (now the no-flip guard) | **ALL PASS** |
| `qa/browser/t7-audit.mjs` | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js | OK |
| v214.css braces | balanced (33/33) |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 214.
2. `cms/` tree from `shivaa-update-v214.zip` → domain root (`images/films/`
   included — let it arrive).
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v214`.
4. Smoke on a **phone**: the case section shows all four films in the thumb
   rail; sideways swipe on the case spins it; the films play. The card
   floats gently and does NOT turn when tapped. Scroll the home page —
   no flicker.

## 5 · Rollback

If anything is live newer than 214, stop. Previous good zip:
`shivaa-update-v213.zip` (sha256
`a8962bb31836f12cba5a63dd091a888b983740bea25d954f1ed5cc19784d6d42`).
Live baseline remains v205. Never renumber; fix forward as v215.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-14. Zip:
`shivaa-update-v214.zip` — 339 files, 36,301,776 bytes. sha256:
`feb7dd425bd1308c22f20acefe6c691c3bad0f5ed83f47204f65ae3c587ed70a`

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v214.zip`
