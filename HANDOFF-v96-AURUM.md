# v96 · AURUM — premium motion & mobile-refinement layer

Release package: **`shivaa-update-v96.zip`** (cumulative — upload over the
current deploy root, same layout as v95).

## What changed
Only **three** files added/touched; no existing behaviour was rewritten.

| File | Change |
|---|---|
| `css/aurum.css?v=96` | **NEW** — all v96 motion/polish styles, loaded last |
| `js/aurum.js?v=96`  | **NEW** — self-contained motion engine (no deps on app.js) |
| `index.html` | +2 lines to load the above |
| `sw.js` | shell cache bumped to `shivaa-shell-v96`, new assets precached |

## What customers see
- **Buttery page transitions** — outgoing page freezes into a snapshot and
  crossfades/blurs out while the new page rises in. The live DOM is still
  swapped synchronously, so every existing bind (`$('#galWrap')`, focus
  traps, etc.) works exactly as before. Loading skeletons never steal the
  transition; it waits for the real content.
- **Word-by-word hero headline** rise, breathing gold glow behind the
  hero stage, ambient pulse on the hero CTA.
- **Pointer-tracked gold sheen + travelling conic gold border** on product
  cards (desktop hover, masked behind `@supports`).
- **Scroll choreography** — stat bars/cards/trust/cart/mini-grids rise and
  stagger into view; section underlines draw on arrival; hero stats
  **count up** (Indian digit grouping, tabular numerals).
- **Wishlist hearts burst** with mini particles + spring pop; add-to-bag
  buttons sparkle; order confirmation gets a gold seal burst (the existing
  canvas confetti is detected and never duplicated).
- **Bottom mobile nav**: a spring-loaded gold tab indicator that glides
  between sections, active-tab bounce + 6 ms haptic, and smart
  hide-on-scroll-down / reveal-on-scroll-up (never hides over sheets).
- **Swipeable toasts** with a type-coloured countdown bar.
- **Drag-to-dismiss**: bottom-sheet modals (grab zone, fat 46 px handle),
  filter sheet and Saathi (drag their header bars), mini-cart (drag from
  the left edge), lightbox (flick down; native pinch-zoom preserved).
- **Back-to-top** gets a circular scroll-progress ring; top progress bar
  shimmers; desktop banner/poster images parallax subtly.
- **Range sliders** restyled with a live gold fill + spring thumb;
  selected payment cards settle with a glow; shipping-progress meter
  turns green and pops at free shipping.
- **Mobile hardening**: 42 px+ touch targets, `100dvh` sheet heights,
  safe-area insets for toasts/fab/back-top/filter handle, no double-tap
  zoom on controls, no scroll chaining inside sheets, landscape notch
  clearance.

## Safety architecture (unchanged philosophy)
- **JS off or engine error**: zero visual difference — nothing is hidden
  without the `html.js-aurum` class the script itself adds.
- **`prefers-reduced-motion`**: every entrance/ambient effect is disabled;
  content is immediately visible; a catch-all nukes animation/transition.
- **Low-power devices** (`Save-Data`, ≤4 cores, ≤2 GB RAM → `html.au-lite`):
  ambient/parallax/confetti counts are cut or removed. Transforms, opacity
  and filter only — no layout-animating properties. Listeners are passive.
- Every reveal has a **3.5 s hard timeout** that forces content visible even
  if IntersectionObserver never fires.

## Verification
- 38 unit assertions + 29 desktop and 30 mobile full-app integration
  assertions (real `index.html`, all 10 site scripts, jsdom, API stubbed
  from `data/db.json`) all pass — covers boot, shop, PDP gallery binding,
  cart, trust, rates, account, mini-cart, modal, toasts, drag-dismiss,
  reduced-motion, and the no-feedback-loop observer fix.
- Smoke-tested locally over a static + API-shim server (routes, assets).

## Notes for the next pass
- Engine exposes `window.ShivaaAurum.{confetti, burst, haptic, sweep}`.
- Ripple targets and rise selectors live as simple selector constants near
  the top of each section in `js/aurum.js`.
