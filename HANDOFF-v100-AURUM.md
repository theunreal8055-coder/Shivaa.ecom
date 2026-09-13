# v100 · AURUM — premium motion layer, built ON TOP of v99

Release package: **`shivaa-update-v100.zip`** (cumulative — upload over the
current v99 deploy root, same flat layout as every prior update).

## Why v100 and not v96
The motion layer was initially built in a parallel session forked from v95
and labelled v96. In the meantime the main line shipped **v97 (mobile
overhaul) → v98 (regression fixes) → v99 (Saathi removed, staff bundle
lazy-loaded)**. v100 is the same motion layer **re-merged onto v99**, so
nothing in v97–v99 is rolled back.

Baseline of this zip = v99, byte-for-byte, with exactly four differences:

| File | Change |
|---|---|
| `css/aurum.css?v=100` | **NEW** — all motion/polish styles, loaded last |
| `js/aurum.js?v=100`  | **NEW** — self-contained motion engine (zero deps) |
| `index.html` | +2 lines (`defer`) loading the above; otherwise v99 |
| `sw.js` | shell cache bumped to `shivaa-shell-v100`, two new assets precached |

Verified by `diff -r` against `shivaa-update-v99.zip`: only those four
entries differ.

## What customers get (on top of v99)
- **Buttery page transitions** — outgoing page freezes to a snapshot that
  crossfades/blurs out while the new page rises (slide on phones). The live
  DOM swaps synchronously, so gallery binding, focus traps and the lazy
  staff-bundle route all keep working. Loading skeletons never consume the
  transition — it waits for real content.
- **Word-by-word hero headline** rise, breathing gold glow behind the hero
  stage, ambient pulse on the hero CTA; hero stats **count up**.
- **Pointer-tracked gold sheen + travelling conic gold border** on product
  cards (desktop hover, feature-detect-gated with `@supports`).
- **Scroll choreography** — trust/stats/category/mini/empty grids rise and
  stagger in; section underlines draw on arrival; banner/poster parallax
  (desktop); back-to-top gains a circular progress ring; the top progress
  bar shimmers.
- **Micro-delight** — wishlist hearts burst particles and spring; add-to-bag
  sparkles; free-shipping meter turns green and pops; gold range-slider
  fills and spring thumbs; selected payment cards settle with a glow;
  order confirmation gets a gold seal burst (the existing canvas confetti
  is auto-detected and never duplicated).
- **Bottom mobile nav** — spring gold indicator glides between tabs, active
  tab bounces with a 6 ms haptic, nav auto-hides on scroll-down and returns
  on scroll-up (never while a sheet/drawer is open).
- **Swipeable toasts** with ok/err countdown bars.
- **Drag-to-dismiss** — bottom-sheet modals (dedicated grab zone + fatter
  handle), filter sheet (drag its header bar), mini-cart (drag from the
  left screen edge), lightbox (flick down; native pinch-zoom preserved).
- **Extra mobile hardening** layered over v97's work: 42 px touch targets,
  notch-safe toast/fab/back-top insets, no double-tap zoom on controls, no
  scroll chaining inside sheets, landscape matching v99's breakpoint.

Deliberately NOT duplicated from v97–v99 (their tuned rules win): sheet
`dvh` heights, the existing modal grab handle, safe-area sheet paddings,
the new transform-only button transitions, the hover-scoped `will-change`,
the removed Saathi UI (all Saathi-only hooks dropped from the layer).

## Safety architecture
- **JS off / engine error**: zero visual change — nothing is hidden without
  the `html.js-aurum` class the script itself adds.
- **`prefers-reduced-motion`**: every entrance/ambient effect is off;
  content is immediately visible.
- **Low-power devices** (`Save-Data`, ≤4 cores, ≤2 GB RAM → `html.au-lite`):
  ambient motion, parallax and confetti counts removed/reduced.
- Only transform / opacity / filter animate; listeners are passive; every
  reveal has a 3.5 s hard timeout that forces content visible.
- A MutationObserver feedback loop that could freeze rendering was found
  during testing and fixed (strictly idempotent class toggles).

## Verification (against the v99 + v100 merged tree)
- 38 unit assertions, 29 desktop and 30 mobile full-app integration
  assertions (real v99 `index.html`, the exact v99 production script set,
  API stubbed from `data/db.json`) — all green across home/shop/PDP/cart/
  trust/rates/account/mini-cart/modal/toasts/drag-dismiss/reduced-motion.
- Real-HTTP smoke with the deployed bundle served by a local server:
  home, hero split, reveals, shop (65 pieces) and slider fill all render,
  zero console errors or unhandled rejections.

Engine API for future use: `window.ShivaaAurum.{confetti, burst, haptic, sweep}`.
Rollback: remove the two Aurum lines from `index.html` (site = exact v99).
