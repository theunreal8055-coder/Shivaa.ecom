# DEPLOY-v209.md — release 209 · "THE ALIVE RELEASE" · flip, films, food, flicker, forms

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 209 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same `index.html` / `.htaccess` /
`sw.js` shape). Then `purge` before `activate`.** This package carries
everything: v206 (flip fix) + v207 (readability) + v208 (megabrief) + v209.

---

## 1 · The owner's five reports → what was really wrong → the fix

### ① "Tap the card to see the front and back is not working — it should be
properly working with 5D animations in both mobile and laptop"

**Root cause (the real one):** the card's hover-light (`is-lit`) painted
`filter: drop-shadow` on the card's wrapper — and `filter` on **any** ancestor
flattens a `preserve-3d` scene (the same trap as v206's `.bc-card:hover`
filter, one level up). On a laptop, moving the mouse onto the card silently
killed the 3D; the flip "did nothing". On live v205 the delegated flip handler
is missing entirely.

**Fix (v209.css §2):** the light now rides on `box-shadow`/opacity only,
`filter: none` is forced on the lit wrap, webkit 3D spellings everywhere, the
flight is a 0.62 s spring turn with a gold flight-glow and a landing bloom +
glint. Tap (touch), click, Enter/Space, and the "Tap the card" hint all flip;
a tap inside the short flight is ignored cleanly (industry-standard — no
zigzag) and the card always answers right after it lands.

### ② "The designs of the food offer banners should be more graphically
advanced and should be animated" (Amrita ji's menu)

The three dish banners (Idli Sambhar · Veg-Cheese Dosa · Paneer Butter Masala)
are now museum-grade offer banners: layered warm gradients with a gold frame,
one-shot rise-in on entrance (staggered), a slow zoom on the food photo, a
shine sweep + floating ✦ on hover, and a gold bloom + tick-pop when chosen.
Step cards get the same warm depth. All ids/handlers untouched.

### ③ "Turn the case feature of the homepage where four videos are being
autoplayed — still not working"

**Root causes:** (a) an IntersectionObserver order race — the film could ask
to play before the case knew it was visible, and nothing retried; (b) the ring
painted `filter: brightness()` over the `<video>` elements every frame — a
known Windows-Chrome blank/flicker trigger; (c) nothing turned the case
unless you dragged it, so the films never appeared to run.

**Fix (v125.js + v209.css §3):** the front film plays the instant the case is
on screen (explicit play, no race); the per-frame filter is gone (opacity +
a gold front-stage instead); and the case **turns itself** — a slow film
tour (~7 s per film) while it is on screen and untouched, pausing the moment
you drag, hover or tap. Every one of the four films wakes as it comes round.
Drag, arrows, tap-to-spin all work on phone (`touch-action: pan-y`) and
laptop.

### ④ "Scrolling and flickering effect in laptop is still not fixed — the
banners are flashing and flickering whenever we scroll"

**Root causes (three stacked):** (a) the sticky header used
`backdrop-filter: blur(14px)` — the classic Windows-Chrome scroll-flash (the
blur re-samples everything under it every frame); (b) v208's 5D layer promoted
seven large surfaces and wrote parallax transforms on scroll frames — layer
pressure + repaints; (c) the offer-card shine sweep and the page-hero glow
pulse ran infinitely.

**Fix (v209.css §1 + app.js):** solid header/utilbar (no backdrop-filter on
sticky chrome), blanket promotions and the scroll-parallax **removed**
(depth now comes from static layering + entrance/hover motion), shine runs
once on hover, the hero glow no longer pulses. Images sit still while you
scroll — full stop.

### ⑤ "Login and sign up forms are still the same"

The **Shivaa Passport** sheet (the real sign-in/sign-up UI) is reborn:
deep-obsidian document with gold-foil crest and title, spring entrance, gold
audience-doors with lift + bloom, dark gold-trimmed inputs with glow focus,
big gold OTP boxes, and a sweeping gold CTA (Retail + Jeweller doors both).
The legacy fallback form gets the same language. Every id and handler is
untouched — this is a pure skin + motion pass.

## 2 · Files

- `cms/css/v209.css` — new layer, loaded after everything (6 sections).
- `cms/js/app.js` — flip safety timer 800 ms (flight is 0.62 s); v208
  scroll-parallax writer removed; `APP_REL = 209`.
- `cms/js/v125.js` — case engine: front-play on sight, self-tour with
  pause-on-touch, per-frame filter removed, front-card stage class.
- `cms/index.html` / `cms/sw.js` / `cms/api.php` — stamped 209.

## 3 · Verification (all run before packaging)

| Check | Result |
|---|---|
| `node qa/browser/t-v209-alive.mjs` (the five reports) | **PASS 34 / FAIL 0** |
| `node qa/browser/t-v206-flip.mjs` (flip regression) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` (every route & button) | **PASS 4/4** — 51 routes, 152 buttons, 30 product controls, 0 real errors |
| `node --check` app.js / v125.js / sw.js | OK |
| v209.css braces | balanced |
| Stamps | 209 in index.html (81× `?v=209`), sw.js SHELL `shivaa-shell-v209`, app.js `APP_REL`, api.php `'rel' => 209` |

## 4 · Deploy steps (when — and only when — the owner says yes)

1. Confirm live is < 209.
2. `cms/` tree (from `shivaa-update-v209.zip`) → domain root, same drop-in
   shape as v205–v208 (media already on the host is kept).
3. `purge` then `activate`. Visitors pick up `shivaa-shell-v209`.
4. Smoke on phone AND laptop: Black Card taps/turns with 5D; home film case
   turns itself and each film plays as it fronts; Amrita menu banners animate;
   scroll the home page — banners stay rock-steady; sign-in sheet is the new
   Passport.

## 5 · Rollback

If anything is live newer than 209, stop. Otherwise the previous good zip is
`shivaa-update-v208.zip` (sha256
`cafb3f6e721373c40a348028519e90ed9abec2e949adb4eff0d1a565a51066d5`) and the
live baseline remains v205. Never renumber; fix forward as v210.

---

Built from `arena/09f3c79f-shivaa-ecom` on 2026-10-12. Zip:
`shivaa-update-v209.zip` (sha256 in the release commit message).

Owner download link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v209.zip`
