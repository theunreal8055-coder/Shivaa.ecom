# DEPLOY-v213.md — release 213 · "THE POCKET RELEASE" · the case that turns in your hand

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 213 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v213 and includes the **film files**
(`images/films/` — 18 media files).

---

## 1 · The owner's orders → what was wrong → the fix

### ① "Turn the case feature works on laptop but not on mobile"

Three real mobile bugs in "Shivaa Films — turn the case":

1. **The swipe was eaten by the page.** The drag used pointer events only;
   on phones the browser's scroll/pan claims the gesture (`pointercancel`)
   and the case never moved. The case now has a **touch spin**: the moment
   your finger runs sideways, the case owns the gesture and turns — run
   your finger up/down and the page scrolls normally. One touch also wakes
   every film (gesture unlock).
2. **Older phone WebViews flattened the ring.** The 3D case had no
   `-webkit-` prefixes (`perspective`, `transform-style: preserve-3d`), so
   many Android/iOS WebViews showed all four films piled in one spot. The
   full prefix chain is now in place.
3. **Save-data phones never got films.** The old "lite" contract skipped
   mounting videos entirely on Data-Saver connections — posters only, which
   read as "not working". Films now mount and autoplay everywhere; save-data
   only changes the hint words. A blocked film still falls back to its
   still frame (v211) and the case still turns.

Also: cards and arrows are `touch-action: manipulation` (taps register
instantly — no double-tap-zoom delay, no text selection stealing gestures),
with larger arrows on phones.

### ② "Fix all the issues related to the home page and the side bar"

The sweep found two structural problems and a set of tap bugs:

- **HOME — the Shivaa Black card was invisible on phones.** The old mobile
  stylesheet hides every legacy `.hero-stage` with `display:none !important`
  — and the Black Card's stage IS `.hero-stage`. On every phone and tablet
  ≤820px the card, certificate and flip hint simply did not exist. The
  stage is now shown (black-hero scope only) with its v184 phone sizing.
- **HOME — a dead markup fragment** (empty carousel dots + stray closing
  tags left behind when the Black-hero replaced the old slider) was sitting
  between the category bar and the rate strip. Removed.
- **SIDE BAR — thumb polish**: drawer scrolling is contained (scrolling the
  menu no longer rubber-bands the page behind it), rows/tiles/close/offer
  chips get instant taps and no selection noise, the close button is
  guaranteed above the offer strip with breathing room under it.
- **Shared tap hygiene** on home strips: product quick-view/wish/compare,
  category cards, thread films, reel controls and slider dots all register
  taps instantly on phones.

## 2 · Files

- `cms/css/v213.css` — case mobile chain, hero-stage restore (black-hero
  scope), sidebar thumb pass.
- `cms/js/v125.js` — touch spin (horizontal gestures owned), pointer path
  ignores touch, films mount on save-data too.
- `cms/js/app.js` — home orphan fragment removed.
- Stamps: 213 in index.html (85× `?v=213` + `__SHIVAA_REL=213` + v213.css),
  sw.js `shivaa-shell-v213` / REL 213 / SHELL_FILES incl. `/css/v213.css?v=213`,
  app.js `APP_REL`, api.php `'rel' => 213`.
- `images/films/` — still inside the zip (18 files).

## 3 · Verification (run before packaging)

| Check | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` (incl. S3e mobile boots: case videos+posters, drawer, hero stage) | **PASS 76 / FAIL 0** |
| `qa/browser/t-v206-flip.mjs` | **ALL PASS** |
| `qa/browser/t7-audit.mjs` | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js | OK |
| v213.css braces | balanced (23/23) |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 213.
2. `cms/` tree from `shivaa-update-v213.zip` → domain root (`images/films/`
   included — let it arrive).
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v213`.
4. Smoke on a **phone**: the home hero shows the Shivaa Black card with the
   gold flip pill (tap → turns, tap again → turns back); the films case
   spins with a sideways swipe and all four films play; the side menu
   scrolls cleanly and closes.

## 5 · Rollback

If anything is live newer than 213, stop. Previous good zip:
`shivaa-update-v212.zip` (sha256
`e5210de3e41996a9c7755626bae7bbed68335855186ba75e685076ca299d0702`).
Live baseline remains v205. Never renumber; fix forward as v214.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-13. Zip:
`shivaa-update-v213.zip` — 338 files, 36,299,571 bytes. sha256:
`a8962bb31836f12cba5a63dd091a888b983740bea25d954f1ed5cc19784d6d42`

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v213.zip`
