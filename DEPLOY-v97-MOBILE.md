# v97 — Mobile-HiFi release (the "smooth like butter" update)

**Package:** `shivaa-update-v97.zip` (same layout as every update zip — unzip over
`public_html/`, nothing else to do; cache-busters already bumped in `index.html`).

Goal of this release: every screen of shivaa.in must feel like a native,
million-dollar iOS/Android app on a phone — nothing deleted, no content changed,
only interface geometry, type scale, touch ergonomics, legibility and paint cost.

## What changed (all in `css/mobile.css` §24–44, plus tiny `js/app.js` guards)

### Touch & targets
- Real controls ≥ 44 px, inline text links ≥ 40 px, icon buttons square
  (footer rows 36→44, social 38→44, sheet close/mic/send 34→42–46, carousel
  dots get a 26 px invisible hit ring, checkboxes 17→22 px).
- Tap-highlight + 300 ms delay already killed in v95; v97 adds `:focus-visible`
  gold rings for keyboard/switch users.

### Type floor
- Nothing a customer must read is under 11 px; tracked micro-caps (eyebrows,
  seals, countdown units) floor at 10.5 px with calmer line-heights.
- Form labels, result captions ("WE WILL PAY YOU", "YOU RECEIVE, IN GOLD"),
  route chips and comparison heads raised from 9–10 px to 11 px.

### Legibility over photography
- Hero: vertical scrim (outranks the old `!important` fade) + text-shadow, so
  centred phone copy never sits naked over bright jewellery; the promise line
  is **no longer truncated mid-sentence** (line-clamp removed on phones).
- Poster carousel copy gets the same treatment; arrows hidden on touch
  (swipe + dots are the mobile language), dots moved out from under the CTAs.
- PDP gallery arrows hidden on touch; the HUID stamp moved to the top corner
  so it stops covering the swipe dots.

### Layout correctness on small phones
- Crumb trail rebuilt: separators are drawn *between* crumb items by CSS, so a
  wrapped line can never strand a "/" at its end; the long final crumb
  (product name) wraps balanced.
- Rate strip: four optically equal tiles (fixed two-line label band).
- Product cards: two-line title clamp so prices align across the row; badge
  pills keep their whole word ("NEW IN", never "NEW …"); the live-price line
  stays on one line.
- Category grid drops to 3 columns under 430 px (bigger jewels, readable names).
- Filter sheet: sticky action bar now kisses the viewport edge (a 20 px slit of
  scrolling content used to peek beneath it); 2-column 44 px checklist kept.
- Ring-size ruler and privacy ledger tables become swipeable rails instead of
  bleeding off-screen at 320 px.
- Saathi composer fits a 320 px iPhone (mic/send/input rebalanced).
- Landscape phones: compressed hero, reachable action bars, notch-safe padding.

### Paint / scroll budget ("butter")
- `backdrop-filter` removed from the bottom nav, PDP action bar, cart CTA bar
  and scrolled header on ≤900 px (the single most expensive mobile compositor
  effect) — replaced with solid tints that look identical.
- Below-fold sections paint on demand (`content-visibility: auto` +
  `contain-intrinsic-size`) on the long marketing pages.
- Horizontal rails get momentum scrolling, scroll-snap and hidden scrollbars.
- `prefers-reduced-motion` honoured for ken-burns/carousel motion.

### Robustness (js/app.js)
- Cold deep-links `#/rates` and `#/contact` could paint before the boot fetches
  resolved and deref `null`; rates now waits and fails soft with a retry card,
  and `state.settings` starts as a safe placeholder object.
- Breadcrumb markup now emits `<span class="cr-i">` items (30 sites in
  `app.js`, 1 in `hallmark.js`, 1 in `trust.js`) — presentation only.

## Verification performed (real Chromium 153, mobile emulation)
Viewports: 320×568 · 360×740 · 390×844 · 412×915 · 768×1024 · 740×360 landscape.
- **0 px horizontal page overflow on all 32 routes** at every phone viewport.
- Tap-target & type-floor sweep: per-page violations down from 14–16 to 0–2
  (the remainder are intentional 10.5 px tracked ornaments and one 27×44 px
  inline legal link that already meets WCAG 2.5.8).
- Zero console/page errors on all routes (two cold-link crashes fixed).
- Visual pass with screenshots of every key flow: home, drawer, search, shop,
  filters, PDP, cart, login sheet, Saathi sheet, rates, savings, buyback,
  sizer, privacy, footer — at 390 and 320, plus landscape and desktop
  regression check (desktop unchanged).

## Rollback
`mobile.css` is the last stylesheet loaded and only *adds* phone-band rules —
reverting to the previous `css/mobile.css` (v95) restores the old mobile look
without touching any other asset. The `app.js` changes are additive guards.
