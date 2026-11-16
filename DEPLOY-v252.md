# v252 — “Silk” · install guide

**Zip:** `shivaa-update-v252.zip` · **774 files** · **45,524,517 B**
**sha256:** `6a6b57c2d0d9b585f45a399d7dc0fb7172c6d22758ba3ac03e59a317083306db`
**Cumulative package (contains v237 → v252, including v250 “Still” and v251 “Alive”).** One upload brings the shop fully up to date.
**Status:** Packaged and verified only — **NOT deployed**. Install only when you give the go-ahead.

Raw download (branch `arena/a20b3005-shivaa-ecom`):
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/a20b3005-shivaa-ecom/shivaa-update-v252.zip`

---

## 1 · Faster loading — zero quality loss

| Area | Before (v251) | Now (v252) | Quality impact |
|---|---|---|---|
| Cold startup API calls | **6–7 separate PHP requests** (`settings`, `making-charges`, `products`, `catalogs`, `rates`, `auth/me`, `pages`) | **1 single `GET /api/boot`** + safe gzip compression for JSON ≥ 1 KB (auto-fallback to legacy calls if ever needed) | Exact same data, rates, HUID & secret sanitisation |
| Warm returning home paint cap | 250 ms | **180 ms** (adopts fresh batch silently, never blinks or repaints) | Identical home layout; prices settle smoothly in place |
| Opening a product (PDP) | Skeleton screen → network wait for `/api/products/:id` → repaint | **Frame-1 synchronous PDP open (~65 ms)** from memory; folded reviews hydrate quietly in place; photo #2 pre-decodes | **100 % full-resolution original product photographs preserved** |
| Mobile drawer photos (5 slots) | **803 KB** raw full-size JPEGs | **53 KB (−93.4 %)** crisp Retina `320w / 560w` WebP thumbs | Full 2× Retina sharpness at drawer size |
| Cart, mini-cart, compare, search, orders & banners | Raw camera JPEGs in 48–320 px slots | `thumbAttrs()` Retina `320w / 560w` WebP with `data-full` fallback | Sharp at display DPR, ~90 % smaller |
| Repeat-visit Service Worker (`sw.js`) | Background-refetched & rewrote every cached image; network-first on every `?v=` asset | Fresh cached photos return immediately (**0 background refetches**); `?v=252` CSS/JS/fonts serve **cache-first** (~1.75 MB saved per revisit); HTML & manifests stay **strictly network-first** so new updates are never stale | Byte-identical verified files |
| Proof-minified bundles | `shivaa.min.css` + `app.min.js` + `rel.min.js` | Rebuilt & sha256-verified (`shivaa.css` 970,559 → `shivaa.min.css` 881,464 B, **8,781 rules proved 1:1**; `app.js` −31 %, `rel.js` −54 %) | Readable source bundles still ship side-by-side for 1-line rollback |

---

## 2 · Next-level smoothness — every hidden main-thread & scroll bottleneck removed

- **Removed post-tap 1,284-element `getComputedStyle` walk (`v250.js` + `css/v252.css`):** Moved the remaining phone compositor rules (`bc-hero-aurora`, `black-hero`, `dust` particles on `#/shop`, SVG `pl-draw`, and `#view * { will-change: auto }`) into frame-0 CSS so phones hold **0 blur, 0 blend, 0 layer promotions, 2 marquees** without stalling the main thread 800 ms after navigation.
- **Stopped post-boot route blink (`css/v252.css`):** Neutralised `motion.css`'s `#view.pg` `opacity: 0` re-fades on phones (which were flashing 34 category chips, cards and heroes on Back/filter navigations) while preserving v251's opaque first-row settle.
- **True post-scroll debouncing (`v245.js`, `v247.js`):** Image wake and fade sweeps now wait until scrolling settles instead of firing every 400 ms in the middle of a thumb fling.
- **Scoped overlay observer (`v120.js`):** Watches only the 5 overlay roots directly instead of listening to `class` attribute mutations across the entire document subtree.
- **Unlocked first-row card press (`css/v251.css`):** Changed `v251Arrive` fill-mode from `both` to `backwards` so the first 8 product/category cards release their transform after 340 ms and spring cleanly when tapped; dropped mobile `box-shadow` transition repaint.
- **Retired redundant idle wakeups & forced reflows:** `v107.js` updates the ticker immediately on the `rates` event instead of waking every 2.5 s (and drops the 8 s tab-glow poll); `aurum.js` drops the 8 s sweep poll and `getComputedStyle` on `.mnav`; `motion.js` drops the forced `view.offsetWidth` reflow and 1.2 s tagger interval; `v194.js` and `v242.js` fast-path bounds checks before reading computed styles; `v117.js` yields an idle frame between parsing `aurum.js`, `motion.js` and `boost.js`.
- **Silk rails & drawers (`css/v252.css`):** Contained horizontal scroll rails (`overscroll-behavior-x: contain`), zero 300 ms tap hesitation (`touch-action: manipulation`), retired duplicate `#scrollProg` bar on phones (leaving single zero-shadow `#shvReadBar`), and smooth `--sx-out` curves on drawers.

---

## 3 · More live — answers every touch in pure compositor `transform` / `opacity`

- **Frame-1 tactile spring (`.shv-tap`):** Passive `pointerdown` stamps `.shv-tap` immediately on frame 1 (bypassing mobile browsers' 80–150 ms `:active` hesitation so even a quick flick-tap feels alive) and cancels in **0 ms** if the finger moves > 8 px to scroll.
- **Wishlist heart spring (`.shv-heart-pop`):** Single-pass 280 ms scale spring + subtle haptic tap when saving a piece, then removes itself.
- **Bag, wishlist & compare badge pop (`.shv-pop`):** `#cmpCount` now pops alongside `#cartCount` and `#wishCount`.
- **Live gold/silver price settle (`.js-price.shv-price-live`):** Smooth 280 ms compositor settle (never `opacity: 0`) plus utility-bar gold hairline sweep whenever live rates land or change.
- **First-frame golden route glide (`#shvRouteGlide`):** 2 px gold hairline glides across the top edge on navigation (even before deferred scripts load) and settles back to rest.
- **Smart intent pre-warm:** Hovering a card (desktop, 90 ms) or touching it (phone, auto-disabled on Save-Data / 2G) warms the piece in advance.
- **Desktop 100 % preserved:** All glass blur, hover lifts and studio animations remain untouched on desktop; `prefers-reduced-motion` and `?nofx=1` disable all motion cleanly.

---

## 4 · Quick verification after install (only when you choose to deploy)

1. Extract `shivaa-update-v252.zip` over the web root (`public_html/`). It never contains `data/db.json`, `.htaccess`, or `config.php`.
2. Verify `/api/version` reports `"rel": 252` and `/api/boot` returns `"ok": true, "rel": 252`.
3. Optional browser console diagnostic:
   ```js
   Shivaa.v252.report()  // "silk 252 · phone · boot api/boot (...) · instant pdp ... · taps ... · glides ..."
   Shivaa.v251.report()  // "alive 252 · phone · live pulses 1 · pending prices 0 · sync-decode fixups 0 · page 0%"
   Shivaa.v250.report()  // "still 252 · phone · blur 0 · blend 0 · filter-blur 0 · promoted 0 · infinite 2"
   ```
4. **Rollback if ever needed:** `shivaa-update-v251.zip` (`c03ff713453d3d2c7c3ed2c93168419f8d6b5eb06b3927471eb22a81c4fa60fa`, 772 files, 45,504,067 B).

---

## 5 · Automated gate results (16 Nov 2026)

- **13 / 13 browser suites green (541 / 541 assertions, 0 failed):** `t-v252-silk` (48), `t-v251-alive` (46), `t-v250-still` (34), `t-v249-steady` (36), `t-v248-instant` (37), `t-v247-premium` (53), `t-v246-light` (58), `t-v245-scroll` (39), `t-v244-butter` (54), `t-v243-header` (36), `t-v242-taps` (41), `t-v241-perf` (43), `t-v240-rip` (16).
- **`qa/phpbal.py cms/api.php`:** BALANCED · **`node --check`:** all bundles & layers OK.
- **`tools/build-css-min.mjs --check` & `tools/build-min.mjs --check`:** all sha256 banners verified.
- **`python3 qa/check-handoff.py`:** 0 red.
