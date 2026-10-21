# DEPLOY-v215.md — release 215 · "THE PROOF RELEASE" · the phone case that cannot fail, flicker gone at the root

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 215 is live, stop.

**Read `DEPLOY-v205.md` first — owner gotchas, bind-shell ladder, zero-config
deploy. Drop-in replace root with `cms/` (same shape). Then `purge` before
`activate`.** This package carries v206 → v215 and includes the **film files**
(`images/films/` — 18 media files).

---

## 1 · The owner's orders → the root causes → the fix

The owner repeated the same four points after v214 — so v215 does not
polish, it goes to the root of each one.

### ① "Completely remove the tap-to-flip card feature" — still dead, stays dead

No tap handler, no keyboard flip, no hint pill, no flip API — the card is a
display object. The guard suite (`t-v206-flip.mjs`) actively asserts the
removal and passes. **Flip never returns.**

### ② "Make the card more animated and floating"

The float is now **organic**: three independent compositor properties
(translate, rotate, scale) breathe at three different periods
(5.4s / 8.6s / 6.7s), so the card drifts, sways and settles like something
held in the hand — never a metronome. The gleam sweeps more often
(every 5.2s). Still zero filters, zero blur — nothing that can flicker.

### ③ "The flicker when scrolling is still there" — found the last root

**Every content image on the site was loading blurred and re-rasterising
during scroll.** The motion layer (`motion.css`) starts each product,
category, poster, testimonial and thumbnail photo at
`opacity:0 + scale(1.06) + filter:blur(6px)` and eases all three on load —
dozens of blur filters firing at once as you scroll IS the flicker, and it
made the site feel slow to load. v215 removes blur and scale from that
reveal entirely: images keep a soft **opacity-only** fade (compositor-only),
and the finished state is filter-free too. On top of that, the footer and
testimonial grid now render only near the viewport (like v214's grids) —
smoother first paint, calmer scroll.

### ④ "On the phone: can't see turn the case, drag does nothing, all four films not visible" — rebuilt so it cannot fail

The case itself was the bug. It was a **3D ring** — four cards standing on a
rotating `preserve-3d` carousel. Cheap phone WebViews flatten `preserve-3d`:
the four cards pile on one spot ("all four films are not visible") and
spinning moves nothing ("drag to spin is not working"). Even on desktop, a
four-card ring can never show more than one or two faces at once.

v215 **rebuilds the case as flat 2D cover-flow**:
- every card carries its own plain 2D transform (works in every browser,
  every WebView, forever — no 3D support needed);
- the film passing behind folds to the centre and slides under the front
  card, so spinning is perfectly continuous;
- the whole stage (not just the cards) gives horizontal drags to the case
  (`touch-action: pan-y`) — up/down still scrolls the page;
- the **thumb rail of ALL FOUR film posters is now on every screen size**,
  laptop included — tap any poster to spin it to the front (tap the front
  one to play full screen);
- drag, arrows, auto-tour and poster fallbacks all keep working.

## 2 · Files

- `cms/css/v215.css` — the blur-up kill (opacity-only image reveals), case
  ring detached from 3D, stage-wide pan-y, always-on thumb rail, organic
  three-property card float + faster gleam, footer/testimonial
  content-visibility.
- `cms/js/v125.js` — the case rebuilt: `layoutCards()` flat cover-flow,
  wrap point folded behind the front card, ring rotation removed.
- Stamps 215 everywhere: `index.html` (87 × `?v=215`, `__SHIVAA_REL=215`),
  `sw.js` (`shivaa-shell-v215`, REL 215, SHELL_FILES incl. `v215.css`),
  `app.js` (`APP_REL = 215`), `api.php` (`'rel' => 215`).

## 3 · QA — all green on this tree

| Suite | Result |
|---|---|
| `qa/browser/t-v209-alive.mjs` | **PASS 94 / FAIL 0** — S1 no-flip ×7 · S2 flat case: drag / arrows / self-tour all turn the case · S3e phone pocket ×14 · S3f v214 smooth ×14 · **S3g v215 ×15** (flat layout, wrap fold, blur-up dead, float trio, stamps) · S4/S5 |
| `qa/browser/t-v206-flip.mjs` (no-flip guard) | ALL PASS |
| `qa/browser/t7-audit.mjs` | **PASS 4 / FAIL 0** — 51 routes render · 152 buttons clicked · 30 product controls · 0 errors |

## 4 · The package

- `shivaa-update-v215.zip` — **340 files · 36,304,378 bytes · sha256
  `223078748ed0f065268847c1b974d268a989411943de59e0da6100300528dd92`**
  (contents of `cms/`, flat, includes `images/films/` 18 media + `css/v215.css`).
- Download: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/09f3c79f-shivaa-ecom/shivaa-update-v215.zip`
- Rollback rung: `shivaa-update-v214.zip` (sha256 `feb7dd42…ed70a`), then
  `shivaa-update-v213.zip` (sha256 `a8962bb3…6d42`). Never roll live back
  past what was deployed; never deploy an older tree over a newer one.

## 5 · Deploy (owner only — same recipe as v205)

1. Download the v215 zip above.
2. Extract — the folder contents are the site root (index.html, sw.js,
   css/, js/, images/, …).
3. Drop them in at the domain root (replace existing, same shape as v205).
4. Then `purge`, **then** `activate`.
5. Open the site on the phone **and** the laptop: the case turns by drag on
   both, all four film posters are visible under it, the card floats, and
   scrolling shows no flicker.

Nothing goes live without the owner's explicit yes.
