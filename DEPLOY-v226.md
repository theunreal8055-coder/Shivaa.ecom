# DEPLOY-v226.md — Shivaa Ecom · v226 "The Butter Release"

**What the owner asked for:** *"Make the app even more perfect, make it even more buttery smooth
and fantastic animations on every clicks, give me the next update file."*

**Status:** built, packaged, whole QA gate green, pushed to `arena/e8a470c6-shivaa-ecom`.
**NOT live.** Live stays **v205** until the owner says yes. Next number after this one: **v227**.

---

## 1 · The measurement this release is built on

Before a single rule was written, the click surface was measured: **6 routes** (`#/`, `#/shop`,
`#/scheme`, `#/gold-biscuit`, `#/account`, `#/cart`), every visible interactive element
(**1058** of them), each one matched against the selector head of **all 155 `:active` rules** in
the shipped bundle — i.e. exactly what the browser does when a finger goes down.

**265 of 1058 answered a press with nothing:**

| family | how many | why it was dead |
|---|---|---|
| `.mega-tile` (mega-menu category tiles) | 102 | no `:active` rule anywhere in 61 layers |
| `.cb-item` (the category bar tiles) | 40 | no `:active`; the rail's own snap gave no feedback either |
| `.pc-quick` (Quick view) | 33 | plain `<button>`, and the only `button:active` rule is behind `(hover:none) and (pointer:coarse)` |
| `.pc-imglink` (the photo link) | 33 | no `:active` (the card answered, the photo did not) |
| `.brand`, `.ub-*`, `.fv-*`, `.fvt-*`, `.hdr-scheme-pill`, `.shv-offer-mini`, `.see-all`, `.sortsel` | 24 | no `:active` |
| `.dw-close`, `.shv-step-btn`, `button[type=submit]`, `.fv-appband-x` | 33 | no `:active` for a fine pointer |

And on a phone it was worse: `mobile.css:38` neutralises **every** hover transform with
`*:hover { transform: none !important }` — which is *correct* (nothing may stick to the page after
a tap) but it also removes the browser's own press answer for everything not in that file's short
press list. That combination is what "the clicks feel dead" actually is.

## 2 · Press physics — every measured family answers now

`cms/css/v226.css` §1 (last layer in the bundle) gives each shape the press that suits it, all of
them `transform`-only, none of them able to move the page:

- **rows, links, tiles** → `translateY(1px) scale(.988)`
- **cards** (`.p-card`, `.cat-card`, `.cat-mini-card`, `.acct-tile`, `.tv-card`, …) → `translateY(1px) scale(.985)`
- **small square controls** (`.pc-quick`, `.dw-close`, `.see-all`, `.sortsel`, `.shv-step-btn`, …) → `scale(.94)`
- the pressed state itself is quick (`transition-duration: .12s`) while the release keeps the house spring.
- a **zero-specificity catch-all** (`:where(button:active, …)`) fills in anything else — it can only
  apply where no house rule sets a transform in that state, so nothing that already answered changes.

**Why the finger rules carry `!important`:** on a touch device the browser applies `:hover` as well
as `:active`, and `mobile.css`'s neutraliser is `!important`. A normal rule loses to it, which is
precisely why those 265 were dead. The new rules are guarded by
`@media (pointer: coarse), (hover: none)` — **the union of both spellings**, so the answer exists
exactly on the devices where the neutraliser fires (a touchscreen laptop is `coarse` *and*
`hover: hover`; a rule written for only one of them would leave a hole).

## 3 · The ripple and the one haptic

`cms/js/v226.js` reuses the house `.rip` span from v89 — same class, same maths, same 700 ms —
so there is one ripple system, not two (`motion.js` keeps `.btn`).

- **small controls ripple at touch-down**, the way a native ripple starts;
- **big surfaces** (a product card, a list row) ripple **only on a real tap** (down + up with less
  than 8 px of movement) — starting a scroll on a card must never light it up;
- **rail items ripple on release** for the same reason: a flick past ten chips must not fire ten
  ripples;
- the host is clipped **only while its ripple is alive** (`.rip-live`, removed with the span), so a
  card is never an `overflow:hidden` box for longer than its own ripple; `position: relative` is
  added only to a host that was `static`, so nothing can re-parent a badge;
- the ripple paints above the photo (`z-index: 3`), and a whole-card ripple uses a quarter of the
  ink (`.rip-big`).
- **one 5 ms vibration per real tap**, gated exactly like the house's own `haptic()` in `aurum.js`
  (coarse pointer **and** not reduced-motion). A drag never vibrates.

## 4 · Rail centring — a chip glides to the middle

Tap a chip, tab or step inside a snapped rail and that item glides to the centre of the rail
(`scrollIntoView({ inline: 'center', block: 'nearest' })`) — the behaviour every native shopping app
has. `block: 'nearest'` means the page itself never moves. Skipped when the rail does not actually
scroll, when the element was already replaced by the router, and for reduced motion.

## 5 · Two more badges answer

The cart badge has popped on every change since v89 (`mBump`); the wish and compare counters never
did — `motion.js` only ever watched `#cartCount`. They do now, reusing the same keyframe. Tap the
heart on a card and the heart in the header answers.

## 6 · Route jump — the page change was a smooth slide of the page you were leaving

`html { scroll-behavior: smooth }` (`motion.css:17`, `styles.css:25`) also applies to the router's
own `window.scrollTo({ top: 0 })` in `route()`. So every page change animated a long glide of the
**old** page before the new one appeared at the top — on a long home page that is several hundred
milliseconds of the wrong thing moving. `html.route-jump` (set around a `#/…` click, a popstate,
live for 600 ms) makes exactly that one scroll instant. In-page anchors are untouched: only
`#/…` links set it.

## 7 · The pace bar — feedback only when the page is actually slow

A 2 px gold hairline sweeps the top of the screen **only** if the next page has taken longer than
180 ms to render (created lazily by the script, `opacity:0` and unanimated the rest of the time, one
`transform` animation, `pointer-events:none`). On a fast tap **nothing is created at all** — the
suite asserts exactly that, and asserts the bar's DOM does not exist after a normal click.

## 8 · View transitions — a page change that moves like an app

Where `document.startViewTransition` exists (Chrome/Android, Safari 18+):

- `#view` gets a `view-transition-name` **only for the duration of one navigation**;
- the transition **waits for the new page to actually render** (it watches `#view` for the first
  mutation, max 300 ms) so what cross-fades is the finished page, never a blank shell;
- the old page leaves `translateY(-6px)`, the new one arrives from `translateY(10px)` in 280 ms;
- the **root** transition is switched off on purpose, so the header, the utility strip and the
  bottom nav stay perfectly still while the content changes;
- the page entrance animation **stands down for that one navigation** (`motion.js` checks
  `html.vt-run` before replaying `.pg`), so two motions can never fight over the same frame;
- skipped for reduced motion, for `au-lite` devices (save-data / ≤4 cores / ≤2 GB), for a link
  marked `data-no-vt`, for a link that does not change the page, and never started twice at once;
- the class is released on `finished` **and** by two timeouts, and is generation-guarded, so it can
  never get stuck on.

Firefox and older Safari have no such API: the entrance plays exactly as it did before. Nothing is
lost, nothing is faked.

## 9 · Checked, and deliberately left alone

| thing | why it was not touched |
|---|---|
| `.btn`'s ripple | `motion.js` has owned it since v89; a second one would double-draw |
| `mobile.css`'s `*:hover{transform:none!important}` | correct as written — nothing may stick after a tap. v226 answers *around* it instead of weakening it |
| `touch-action: manipulation` in 8 older rules | a tap-latency choice on controls; changing it alters double-tap behaviour the owner has not asked about |
| the six designed sheen loops | the last `background-position` animations on the site; converting one needs its element's box re-derived — a visual change, not a perf fix |
| the sticky header's blur | already gone at v209 (`v209.css:18-22` pins it solid) |
| dimming `#view` while a route loads | the page entrance animates `#view`'s opacity with `both` fill, so a declared dim would silently lose the cascade — it would look like a bug, not a feature. The 2 px hairline carries that signal instead |
| `#scrollProg` / `#backTop` | v225 owns them from one scroll frame; v226 adds **no** scroll listener and reads no geometry in a frame |

## 10 · Stamps

| place | value |
|---|---|
| `cms/index.html` `?v=` | **226** everywhere (31 URLs — v225's 30 plus `js/v226.js`) |
| `window.__SHIVAA_REL` | **226** |
| `cms/sw.js` | `SHELL = 'shivaa-shell-v226'`, `REL = 226`, 30 stamped shell URLs, `/js/v226.js?v=226` precached |
| `cms/js/app.js` | `APP_REL = 226` |
| `cms/api.php` | `'rel' => 226` |
| cascade | `tools/css-bundle-order.txt` now has **61 positions / 60 distinct layers**, `v226.css` last |

The bundle is rebuilt: **880,766 B** on disk (was 876,757), **176,195 B gzipped** (was 173,410);
the build script's own byte-proof reports `VERIFY: bundle == ordered concatenation` and
`all 61 blocks present, contiguous and in order`.

## 11 · QA — the whole gate, serially, against this exact tree

| suite | result |
|---|---|
| `t-v226-butter` (**new**, 61 assertions) | **PASS 61 / FAIL 0** |
| `t-v225-appfeel` | 80 / 0 |
| `t-v224-corners` | 64 / 0 |
| `t-v223-smooth` | 39 / 0 |
| `t-v222-bundle` | 36 / 0 |
| `t-v221-cleanup` | 34 / 0 |
| `t-v220-billing-gone` | 13 / 0 |
| `t-v219-depth` | 22 / 0 |
| `t-v218-sidebar` | 13 / 0 |
| `t-v209-alive` | 96 / 0 |
| `t-v206-flip` | ALL PASS |
| `t7-audit` | 4 / 0 (**zero uncaught errors** across the whole route walk) |

The new suite asserts both halves of this release: the layer text and the bundle for everything
jsdom cannot compute (`:active`, `view-transition-name`, media queries) — and, live in a real page,
a tap that ripples, **a drag that does not**, a haptic only on the tap, the rail centring call, the
badge pop and its cleanup, `route-jump` around a real link click, the pace bar appearing only on a
slow route and clearing on the next render, and the view-transition lifecycle with the API stubbed
the way Chrome exposes it (including that the entrance is not left queued after it finishes).

## 12 · The package

| | |
|---|---|
| file | `shivaa-update-v226.zip` (repo root) |
| files | **355** (v225's 353 + `css/v226.css` + `js/v226.js`) |
| size | **37,250,601 B** |
| sha256 | `18d8f50ce4e0a1dc9bea58e357e185f070938ab5b46a8b0756956708979e2783` |
| built | `cd cms && zip -X -@ … < /tmp/list226.txt` (the v225 entry list + the two new files) |
| verified | extracted to `/home/user/zv226` and `cmp`-ed against the tree: **355 of 355 identical**; `css/v226.css` 10,782 B and `js/v226.js` 16,079 B are inside; one `/* v226.css */` block; `v226Pace`/`v226VtIn`/`v226VtOut` present; exactly **one** stylesheet `<link>`; `__SHIVAA_REL=226`; `shivaa-shell-v226`; sw precaches `/js/v226.js?v=226`; `const APP_REL = 226`; `'rel' => 226`; **no `data/db.json`** |

## 13 · How to deploy

1. Back up the live tree the way you always do.
2. Upload the zip's contents over the site root (the zip holds `index.html`, `api.php`, `sw.js`,
   `css/`, `js/`, `images/`, `docs/` … — the whole `cms/` tree, paths relative to it).
3. Hard-refresh once, or let the service worker banner move a returning phone to `shivaa-shell-v226`.
4. Confirm `?v=226` in the browser's network tab for `shivaa.css`, `v225.js` and `v226.js`.

**Rollback:** re-upload **`shivaa-update-v225.zip`** (353 files, 37,238,134 B, sha256
`3c943a937f8f6d52e8d447887ebefb188a980ccdf0d432a16cf9ed0c83b01ae0`) — or `shivaa-update-v224.zip`
before that. Never restore an older tree over a newer one, and never reuse a release number.

## 14 · What to check on the phone (2 minutes)

1. **Tap anything** — a category tile, a product card, a Quick-view button, a chip in a rail, the
   brand logo, a footer link: each one should visibly answer, with the gold ripple under the finger.
2. **Start a scroll on a product card and drag** — the card must **not** ripple and the phone must
   **not** buzz (that is the difference between a tap and a drag, and it is the one thing in this
   release that can only be judged by a thumb).
3. **Swipe sideways on the home category rail, then tap a chip** — it should settle on the chip you
   tapped, centred in the rail.
4. **Add something to the wishlist / compare** — the badge on the header heart / scales icon should
   pop, the way the cart badge always has.
5. **Open Chrome on Android and change pages** (Home → Shop → Scheme): the content should cross-fade
   in with the header completely still — that is the new view transition. On an iPhone (Safari 17
   or older) the page will simply change as before: that is expected, not a bug.
6. **On a slow connection** (or throttled), tap a page link: after ~0.2 s a thin gold hairline should
   sweep the very top of the screen until the page appears. On a fast tap it should never appear.
7. **The page should start at the top instantly** when you change pages — it should not glide.

## 15 · Not verified here

- **No real browser, no real phone, no real touch.** The press states, the ripple feel, the haptics,
  the rail centring and the view transition are all asserted in jsdom + against the shipped layer,
  but the *feel* of them is exactly what a phone must judge — that is §14.
- **The view transition is asserted against a stub** of `startViewTransition` (jsdom has no such
  API). Its real timing on a Chrome Android device is the one thing this release could not run.
- **`php -l` was not run**: PHP is not installed in this sandbox, and `cms/api.php` changed by one
  integer (`'rel' => 226`).
- The service worker's cache bump cannot be tested without a real origin.
