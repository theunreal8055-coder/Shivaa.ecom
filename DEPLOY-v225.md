# DEPLOY v225 — "The App-Feel Release"

Owner's brief, in his words:

> "even more smoother, even more graphically advanced, just like modern-day D2C brand apps"

v223 stopped the films loading themselves. v224 took the layout animations and the per-second
DOM rebuilds out and fixed five usability corners. v225 finishes that line in the two places
v224 did not reach, and then makes the phone itself feel like an app: **one scroll frame for the
whole page**, a chrome that never repaints itself for fun, photo placeholders that sweep on the
compositor instead of the main thread, rails that snap instead of drifting, and a card that
carries the house hairline.

**Not live. Nothing here is deployed. The owner's explicit "haan" is required before anything moves.**

---

## 1 · The scroll frame — one listener, one rAF, zero layout reads

Three listeners were doing scroll work on separate `requestAnimationFrame` callbacks:

| where | what it wrote | what it read, **every frame** |
|---|---|---|
| `app.js:11536` | header `.scrolled` / `.compact` | `scrollY` only — **left alone**, it was already correct |
| `app.js:5310` | `#scrollProg`, `#backTop.show` | `scrollHeight` + `clientHeight` |
| `aurum.js:294` | `#backTop` `--au-p`, parallax | `scrollHeight` + one `getBoundingClientRect()` per visible media element |

The document's height cannot change while a thumb is moving. Re-deriving it sixty times a second,
on the main thread, next to the paint the phone is trying to finish, is the second-biggest cost
left on this site after the animations v224 removed.

`cms/js/v225.js` now owns it:

- **one** passive `scroll` listener, **one** rAF per frame — and it is the only place in the
  shipped tree that reads the scroller's geometry outside of `measure()`;
- the geometry is taken **only when it can change**: boot, `resize`, `hashchange`, a
  `ResizeObserver` on `<body>` (a route rendered, a film woke, a filter re-sliced the grid) and
  three late passes (900 ms / 2.6 s / 6 s) for fonts and first images;
- `#scrollProg` is written through a **quantised** transform (0.1 %), `#backTop`'s conic ring
  through a **1/120 of a turn** quantisation — a conic gradient repaints with every distinct
  value, and 120 steps is finer than the eye can follow on a 42 px button;
- the back-to-top class flips on a band crossing, never per frame;
- `window.__shvHub` exposes the cached maximum and the current fraction, so `app.js` and
  `aurum.js` read a number instead of the document. Both **feature-detect** it and stand their own
  copies down, so an older script pair served from a warm cache still has exactly one writer and
  the bar can never end up owned by nobody.

Measured in the suite (`qa/browser/t-v225-appfeel.mjs`): over a **six-event scroll burst the
document is read zero times** (`scrollHeight`/`clientHeight` getters spied and counted),
`hub.measures` does not move, and exactly one frame runs per burst — while a `resize` *does*
re-measure instead of letting the cache go stale.

## 2 · Parallax: on the phone, and without measuring mid-frame

`aurum.js` feature 12 has driven the hero/banner/poster media from a single frame since v96, but
its gate was `(hover:hover) and (pointer:fine)` **and** `innerWidth > 1023` — so the depth effect
existed on a laptop and nowhere else.

- A coarse pointer now runs the same frame at **11 px of travel instead of 26 px**.
- Still gated exactly as before: `prefers-reduced-motion`, the low-power `au-lite` flag
  (save-data, ≤4 cores, ≤2 GB) and the intersection observer that only tags media within 80 px of
  the viewport.
- Each element's document offset is now **cached** (`_auTop` / `_auH`) and only re-taken when the
  hub reports the document changed shape — so a scroll frame performs **no**
  `getBoundingClientRect()` at all, on any device. A detached element (a route change removed it)
  is dropped instead of being written to for ever with a value computed from a 0 × 0 box.

## 3 · Two infinite repaint loops become composited sweeps

A `background-position` animation can never be handed to the compositor: the element repaints
itself every frame, for as long as it is on screen. Two of them ran here.

**`@keyframes mSkeleton`** drove three surfaces — `.skeleton` (the PDP paints **seven** at once:
gallery, three title lines, price, two button rows) and `.pc-imgwrap` / `.tv-ph` while a photo
loads, which is **every product card**, i.e. twenty photo boxes repainting at once on a shop page.
They now sweep a pseudo-element with `translate`, same colour, same speed, same angle.
Paint order was handled deliberately: `.pc-imgwrap::after` is already the gold inner hairline
(`styles.css:996`) and `.glare` is a real child, so the sweep is a `::before` at `z-index: 0` with
the photos lifted one level **while the placeholder is live** — a photo can never be covered by its
own loading state, and the whole rule switches off the moment `img-ok` lands.

**`@keyframes auProg`** ran forever on `#scrollProg` — the 3 px bar that is on screen for every
page of every visit, repainting itself even when the page is sitting still. The bar keeps its exact
four-stop gold gradient as a static background and the travel moved onto its own layer.
It cannot interfere with the `scaleX()` the scroll frame drives, because a transform does not clip.

## 4 · A product card is no longer a GPU layer on a phone

`styles.css:165` gives every `.p-card` `will-change: transform` for the desktop hover lift. The
shop grid slices 20 cards per screenful, so on a phone that is **20–60 promoted layers held in
video memory for the whole session**, in exchange for a hover state a finger can never trigger.
`aurum.js` already tags the device (`html.au-touch`), so the promotion is simply not made there.
Desktop is untouched. Removing a hint cannot change a pixel — the press and hover still transform
on demand.

## 5 · Rails: snap, and no scroll chaining

`.catbar` / `.catbar2` / `.hscroll` have snapped since v208 and the sheet rules have contained
their gestures since v99. Eight rails were left out — every one of them `overflow-x: auto`, holding
a row of buttons or cards, so a flick parked wherever momentum died, often between two labels:

`.cat-chips · .adr-sw · .stages · .sz-strip-wrap · .tabs · .acct-nav · .adm-nav` and the
**scheme stepper** (`.shv-stepper-wrap`), which had no snap at all *and* let its nine step buttons
shrink instead of scroll.

`scroll-snap-type: x proximity` — **proximity, never mandatory**: these are reading rails, not
carousels, and nothing should feel like it is fighting the thumb. Children are the snap points, and
`overscroll-behavior-x: contain` stops a rail that has reached its end from handing the swipe to the
browser's back gesture. Phone-and-tablet widths only (≤900 px); above that these rows fit.

## 6 · The 16 px field floor, on tablets too

v224 set the iOS/PadOS no-zoom floor for phones (≤680 px). Safari zooms a focused field in at **any**
width, and an iPad in portrait is **768 px** — exactly the band in between. v225 applies the same
floor to 681–900 px with the same field list and **no `!important`**, so the deliberately larger
fields (`.otp-boxes input`, `.shv-otp input`, `.bbc-wt input` at 34 px) stay exactly as designed and
nothing can shrink.

## 7 · More live numerals, and the card's own hairline

- **Tabular figures** now also cover the strips v224 did not name: `.rs-cell b`, `.ds-count`,
  `.gal-count`, `.mc-count`, `.pf-count`, `.qv-count`, `.rl-timer`, `.am-dish-tick`, `.cd-head b`,
  `.cat-cell b`, `.rs-ticker`. A proportional font re-fits the line every time a digit changes.
- **The card hairline**: `styles.css:692` gives `.p-card` a *transparent* 1 px border, so the grid
  reads flatter than the rest of the house. It now carries the same gold as the inner photo frame at
  a fraction of the opacity (`rgba(212,175,90,.14)`, `.42` with a wine-tinted shadow on hover). The
  box was already bordered, so nothing moves.
- **The Android grey tap flash** is suppressed on the eight card/chip/tile selectors that already
  answer a press with their own transform.

---

## 8 · Checked, and deliberately left alone

| checked | verdict |
|---|---|
| `.header` `backdrop-filter` | **already gone.** `v209.css:21` pins the bar to a solid `#faf6ef` with `backdrop-filter: none !important` and explains the per-frame re-blur. Nothing left to save. |
| `.header.scrolled` / `.compact` | **already correct**: hysteresis-banded, reads `scrollY` only, never a layout box. No second owner added. |
| `.hscroll` / `.catbar` / `.catbar2` | already snap (`mandatory` / `proximity`) with `scroll-snap-align` on their children — untouched. |
| card press feedback | `.p-card:active` and friends already scale (`mobile.css:40`). A second rule would only be a duplicate. |
| the reveal's `filter: blur(6px)` | **kept.** The blur value never animates — only opacity and transform move — so it is rasterised once per image and then composited. Removing it would change the look for no measured frame. |
| `.au-px { will-change: transform }` | **kept.** Three or four pieces of hero media, and the layer is the point of the effect. |
| `content-visibility` on long grids | rejected again: without a correct `contain-intrinsic-size` it trades paint for layout shift. |
| the **designed** sheen loops | **left running, and named here** so a later release decides with the geometry in front of it: `posterShine` (styles.css:1163, the poster frame's 115° sweep), `phSheen` (boost.css:38, the page hero, its own element), `auShine` (aurum.css:411, the footer wordmark), `shimText` (styles.css:689, the gold headline shimmer), `mPlShimmer` (motion.css:167, the "loading" word), `rateShim` (styles.css:698, a 1 px rule). Each is a gradient baked into a finished graphic, so moving it onto a composited layer means re-deriving the element's box — a visual change, not a performance fix. The two that are text (`background-clip: text`) cannot be aliased onto a pseudo at all without a wrapper element. The skeleton and the card placeholders **were** converted, because those are utility surfaces with nothing to preserve but the colour. |
| `touch-action: manipulation` | present in **8 older rules** (`aurum.css:483/639/979`, `mobile.css:34`, `finale.css:1595/1626/1692` and the gallery drag). Left alone on purpose: it is a *tap-latency* choice on buttons, not a scroll bug, and changing it would alter double-tap behaviour on controls the owner has not asked about. Listed in `docs/NEXT-CHAT-HEAD.md` as an open item. v225 adds no `touch-action` of its own. |

## 9 · Stamps

| place | value |
|---|---|
| `cms/index.html` `?v=` | **225** everywhere (30 URLs — the 29 from v224 plus `js/v225.js`) |
| `window.__SHIVAA_REL` | **225** |
| `cms/sw.js` | `SHELL = 'shivaa-shell-v225'`, `REL = 225`, 29 stamped shell URLs, `/js/v225.js?v=225` precached |
| `cms/js/app.js` | `APP_REL = 225` |
| `cms/api.php` | `'rel' => 225` |
| cascade | `tools/css-bundle-order.txt` now has **60 positions / 59 distinct layers**, `v225.css` last |

The bundle is rebuilt: **876,757 B** on disk (was 873,144), **173,410 B gzipped** (was 172,651);
the build script's own byte-proof reports `VERIFY: bundle == ordered concatenation` and
`all 60 blocks present, contiguous and in order`.

## 10 · QA — every suite re-run, serially

| suite | result |
|---|---|
| `t-v225-appfeel` (**new**) | **PASS 80 / FAIL 0** |
| `t-v224-corners` | 64 / 0 |
| `t-v223-smooth` | 39 / 0 |
| `t-v222-bundle` | 36 / 0 |
| `t-v221-cleanup` | 34 / 0 |
| `t-v220-billing-gone` | 13 / 0 |
| `t-v219-depth` | 22 / 0 |
| `t-v218-sidebar` | 13 / 0 |
| `t-v209-alive` | 96 / 0 |
| `t-v206-flip` | ALL PASS |
| `t7-audit` | 4 / 0 |

Every row above is from a run against **this exact tree** at the release commit `e4cf8b4`
(16 Oct 2026), the whole gate serially on an idle 2-core box — `t7-audit` also reported
**zero uncaught errors across the whole route walk**.

`node --check` passes on `cms/js/v225.js`, `app.js`, `aurum.js` and `sw.js` (the suite runs those
four itself). The new suite asserts the live hub, the zero-read burst, the quantisation, the ring
and the bar, the cascade of a real `.skeleton` and `.p-card`, the stamps, the bundle inventory and
that no scroll frame runs at idle.

## 11 · The package

| | |
|---|---|
| file | `shivaa-update-v225.zip` (repo root) |
| files | **353** (v224's 351 + `css/v225.css` + `js/v225.js`) |
| size | **37,238,134 B** |
| sha256 | `3c943a937f8f6d52e8d447887ebefb188a980ccdf0d432a16cf9ed0c83b01ae0` |
| built | `cd cms && zip -X -@ … < /tmp/list225.txt` (the v224 entry list + the two new files) |
| verified | extracted to `/home/user/zv225` and `cmp`-ed against the tree: **353 of 353 identical**; `css/v225.css`, `js/v225.js`, the `/* v225.css */` block and `@keyframes v225Sweep`/`v225BarSweep` are inside; exactly **one** stylesheet `<link>`; `__SHIVAA_REL=225`; **no `data/db.json`** |

## 12 · How to deploy

1. Back up the live tree the way you always do.
2. Upload the zip's contents over the site root (the zip holds `index.html`, `api.php`, `sw.js`,
   `css/`, `js/`, `images/`, … — the whole `cms/` tree, paths relative to it).
3. Hard-refresh once, or let the service worker banner move a returning phone to `shivaa-shell-v225`.
4. Confirm `?v=225` in the browser's network tab for `shivaa.css` and `v225.js`.

**Rollback:** re-upload **`shivaa-update-v224.zip`** (351 files, 37,227,019 B, sha256
`abd3f873bd552052876e145ef4719f2ea3162d22fa6c384250e45e58cf3fc304`) — or `shivaa-update-v223.zip`
before that. Never restore an older tree over a newer one, and never reuse a release number.

## 13 · What to check on the phone (2 minutes)

1. **Scroll the home page up and down slowly.** The gold hairline at the top should move with the
   thumb and nothing should hitch; the back-to-top button's gold ring should fill smoothly.
2. **The hero/banner artwork should drift very slightly as you scroll** (11 px, phone only). If it
   feels like too much, it is one number in `cms/js/aurum.js` (`pxAmp`).
3. **Open the shop page and watch the photo placeholders.** They should shimmer exactly as before,
   but the page should feel lighter while twenty of them load.
4. **Swipe the category rail on the shop page sideways** — it should settle on a chip, not between
   two. Same for the account tabs and the scheme page's step rail.
5. **Turn the phone sideways / open it on an iPad and tap the newsletter or login field** — the page
   must not zoom in.
6. **Product cards** should show a thin gold line inside the card edge, firming up when tapped.

## 14 · Not verified here

- **No real browser or phone was used** — everything above is jsdom + measured code paths. The
  feel of the new parallax and of the snapping rails is exactly the part a phone must judge.
- **`php -l` was not run**: PHP is not installed in this sandbox, and `cms/api.php` was changed by
  one integer (`'rel' => 225`).
- The service worker's cache bump cannot be tested without a real origin.

## 15 · Correction to the v225 commit message (`e4cf8b4`)

Three phrases in that commit message describe work this release did **not** do, and the message is
not rewritten (forward-only: no amend, no force-push). The tree and this document are the accurate
record:

| the message said | what is true |
|---|---|
| "the sticky header drops its `backdrop-filter` on touch" | v225 touched **no** header styling. The sticky bar's backdrop blur was already removed a release earlier — `cms/css/v209.css:18-22` pins `.header` to a solid `#faf6ef` with `backdrop-filter: none !important`, exactly to stop the per-frame re-blur. Nothing was left to drop. |
| "`scrollbar-width: thin`" | not in `cms/css/v225.css` — no scrollbar styling was added by this release. |
| "`@supports (selector(:has(*)))` gating" | not in `cms/css/v225.css` — the layer uses one plain `@media (hover: none)` block for the tap-highlight rules, and no `:has()` selector anywhere. |

Everything else in that message matches the shipped files: the single-frame hub and the two
stand-downs (`cms/js/app.js:5315`, `cms/js/aurum.js:328`), the quantised writes, the two
`translate` sweeps that retired `mSkeleton`/`auProg`, `html.au-touch .p-card { will-change: auto }`,
`pxAmp = coarse ? 11 : 26` with the cached offsets, the rail + stepper snap, the 681–900 px field
floor, the twelve numeral strips and the `.p-card` hairline.
