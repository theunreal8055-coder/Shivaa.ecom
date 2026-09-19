# DEPLOY — v158 (THE CATEGORIES BUTTON · + everything v157 carried)

> **SUPERSEDED — use `shivaa-update-v159.zip` / `DEPLOY-v159.md`.** The owner
> reported after this release that the panel now closes ("it disappeared") but a
> category tap still did not take him to the category page, so v159 keeps
> everything below and makes that landing unconditional. This file is kept as
> the record of what v158 fixed and why.

**Zip:** `shivaa-update-v158.zip` · md5 `e32254988ebef5f21e1ae2fd06fc29ea` ·
sha256 `450e79dce189ef6ab6ca5577a50e5f3595c1bf4186581d8b75dbd1bd8e4711ef`
· **11 files:** `api.php`, `css/styles.css`, `css/v116.css`, `hallmark.php`,
`index.html`, `manifest.json`, `manifest.webmanifest`, `sw.js`, `js/app.js`,
`js/admin.js`, `js/v116.js`
→ unzip into `public_html/cms/`, **overwrite all eleven**.

> **v158 supersedes the v157 zip** (that one was packaged but never deployed, so
> nothing is being rolled back — v158 simply carries its content forward).
> **Rollback rung = `shivaa-update-v156.zip`**, the last release actually live.
> Nothing about the buy lane, Cashfree, checkout, the partner portal or the
> bullion desk changed beyond the release stamps. **`data/db.json` is
> deliberately NOT in the zip** (uploading it would overwrite live orders,
> settings and the live catalogue).

## What the owner reported (20 Sep 2026, verbatim)

> *"Fix category button, it comes it's very good graphic advanced very good but
> when we click any category of jewellery then it doesn't respond and even if we
> want to close the categories button it still doesn't go, fix this"*

## 1 · What was actually wrong — three defects, all found in the shipped code

| # | The defect | Why it produced exactly that report |
|---|---|---|
| **D1** | **Two owners for one button.** `boot()` wired the Categories button, but `boot()` waits for the shop's API batch. `js/v116.js` wired **the same button** from a 200 ms timer — with a *different and incomplete* handler that never bound the scrim, the outside tap, Escape or the scroll close. Whichever ran first won: on a normal phone connection that was v116's copy, so the panel could open with **no way to dismiss it except tapping a tile**. | *"even if we want to close the categories button it still doesn't go"* |
| **D2** | **The scrim covered the button.** `.mega-backdrop` is a fixed child of the same sticky `<header>` that holds the button (z-index 1199), and the button itself is a static element in that same header — so while the panel stood open, the scrim painted **over** the one control meant to close it. | the same line, and a tap "outside" that did nothing |
| **D3** | **The panel could open empty.** Its 17 tiles were built only *after* `boot()`'s API batch landed. Tapping Categories while the shop was still loading opened a **blank panel** — there was nothing to tap. | *"when we click any category of jewellery then it doesn't respond"* |

## 2 · The fix — one owner, always reachable, never blank

- **One owner.** `app.js` · `initCatsMenu()` is now the only code that wires
  `#navCats`, and it runs **before** `boot()` (at script eval) as well as inside
  it. `js/v116.js`'s duplicate is **deleted** — no race, no "which copy won".
- **The 17 tiles need no network.** They come from the house `CATS` constant
  (`catsPanelHTML()` / `catsListHTML()` — one source for the desktop panel *and*
  the drawer list, so the two can no longer drift apart). The panel is fully
  built the moment the page is interactive; a slow shop API can't blank it.
- **The scrim starts below the header** (`top: var(--headerH, 120px)` with the other three edges 0) —
  it dims the page behind the panel, exactly as intended, and can never sit on
  top of its own close button again. While the panel is open the header also
  rides at `z-index: 2000` (`body.cats-open`) and the floating chrome
  (WhatsApp/chat/top/compare pills, bottom tab bar) steps aside, so no floating
  button can ever eat a category tile's tap.
- **Every dismissal path is bound**: tap the button again · tap the scrim · tap
  anywhere outside · Escape · scroll · rotate/resize · any route change. Each
  one runs through a single close routine that also clears `body.cats-open`, so
  no stale state can hide the floaters.
- **Category taps navigate FIRST, dismiss SECOND** — the house pattern from
  `js/v127.js`/`js/v139.js`, with `window.__shvNavigating` armed so the
  back-button layer never queues a traversal against a navigation in flight. A
  repeat tap on the category you are already standing on still responds (it
  redraws instead of doing nothing).
- **The drawer's 17-photo list now folds when the drawer closes** — previously
  it folded only on a *hash change*, so tapping the category you were already on
  left the wall of photos open for next time (the older "17 photos are still on
  the page" report).

## 3 · Carried forward from v157 (packaged, never deployed)

1. **Shivaa everywhere** — buyback badge `LIVE SHIVAA RATE`, PWA manifests named
   *Shivaa Jewellers*, 77 catalogue descriptions plus the display-boundary
   normaliser (`hallmark.php` · `shv_storefront_copy()`, so the **live database
   is never shipped**), admin rate-card/poster collateral, and the last surviving
   rate-brand class in page markup (`jaipur-hero` → `shivaa-hero`, which is why
   `css/styles.css` rides in the zip). Real geography — pickup **Jaipur /
   Nagaur**, city chips, the counter address — is deliberately kept.
2. **24K carries the same ₹398/g premium as 22K**, on every B2C surface
   including the Bhai Dooj Finale prize (10 g = ₹1,54,820, was ₹1,50,840 on the
   raw anchor).
3. **Three in-place poll fixes** — compare page, buyback valuation, Swarna Nidhi
   projection no longer rebuild themselves every second while the MCX feed runs.

## 4 · Deploy + verify (2 minutes)

1. **Backup first** (standing rule #1): download a full `public_html` zip in
   Hostinger → File Manager.
2. Upload `shivaa-update-v158.zip` to `public_html/cms/` → **Extract → overwrite
   all eleven files** (the zip already has the `js/` and `css/` layout).
3. Verify release: open `https://shivaa.in/api/version` → must show
   **`"rel":158`**, shell `shivaa-shell-v158`, stamps index 158 · app 158.
4. Hard-refresh once (a new service worker installs — it re-fetches
   `app.js?v=158`, `v116.js?v=158`, `styles.css?v=158`, `v116.css?v=158`).
5. **The button itself, on the device that showed the fault:**
   - tap **Categories** → the panel opens with all 17 categories *immediately*
     (no waiting for the shop to load);
   - tap any category → it navigates at once, and the panel closes behind you;
   - tap **Categories** again while it is open → it closes; same for tapping
     outside it, the scrim, or pressing Back/Escape; scrolling closes it too;
   - tap the same category twice → the second tap still responds;
   - phone: hamburger → **All 17 categories** → tap one → it navigates, the
     drawer slides away **and** the list of photos folds shut.
6. B2B spot check: jeweller portal / RTGS board — same numbers as before.
7. Optional sanity for the carried content: a product description reads *"the
   live Shivaa rate of the day"*, and `#/finale`'s prize = 10 × the 24K rate on
   the Live Rates card.

**Rollback:** extract `shivaa-update-v156.zip` over the same folder.

## 5 · QA gates (all green — source tree AND this zip extracted on its own copy)

- **v158-cats 24/24** — the categories behaviour, driven in jsdom at **both**
  widths with a width-aware `matchMedia` (the older suites only answered
  `prefers-reduced-motion`, which is how the ≤820 px branch stayed untested):
  tap while the API batch is still in flight → panel open with 17 tiles ·
  second tap closes · scrim closes · outside tap closes · Escape closes · scroll
  closes · resize clears the body class · a category tap navigates *and*
  dismisses · a repeat tap still redraws · phone: list opens, closes, navigates,
  folds, and folds when the drawer is closed by any other path · zero page
  errors.
- **v158-check 21/21** — stamp lockstep 158 (index · sw · api · app), the four
  moved assets stamped in `index.html` *and* the worker precache, the ownership
  move (v116.js holds no wiring, app.js holds the single controller, init runs
  before boot), every dismissal path bound, navigate-first/dismiss-second, the
  fold observer, the CSS rules — and v157's content verified still standing.
- **Regression belt, unchanged and green:** v157-check 27/27 · v157-live 26/26 ·
  v157-render (34 routes, 0 rate-brand mentions left) · v156-check 33/33 ·
  v156-cart 24/24 · v155-check 34/34 · v155-direct 24/24 · v154-php-run 11/11 ·
  v140 17/17 · v139 56/56 · v142 13/13 · v125 27/27 · v113b 32/32 · v117–v124,
  v127 all green · v146–v152 SKIP by era design · php-sweep 208 routes /
  0 exceptions (no route added or dropped).
- Three era suites were made **forward-tolerant, never weakened** — v140's
  stamps now read "140+ **and** index.html == worker" (a stronger rule than the
  literal it replaced), v142's "v116/v117 ride 142" now allows v116.js to move
  on its own with both places agreeing, and v139's stripped-layer *control*
  asserts the stronger new truth (the fold now lives in app.js, so it can no
  longer be reproduced by deleting js/v139.js). v157-check's stamp pins accept
  157-or-later; the exact number is v158-check's job.

## 6 · Files in this release

| File | Why it moved |
|---|---|
| `js/app.js` | the Categories controller (`initCatsMenu` · `catsPanelHTML` · `catsListHTML` · `shvNavTo`) · the old inline boot wiring removed · stamp 158 |
| `js/v116.js` | the duplicate `#navCats` owner deleted (its header comment records why) · stamp 158 |
| `css/v116.css` | scrim starts below the header · `body.cats-open` raises the header and stands the floating chrome down · stamp 158 |
| `index.html` · `sw.js` | stamp lockstep 158 (`?v=` for app.js/v116.js/styles.css/v116.css in **both** the loader and the worker precache, shell `shivaa-shell-v158`) |
| `api.php` | stamp `'rel' => 158` (no behaviour change) |
| `css/styles.css` | the rate-card wrapper rename `jaipur-hero` → `shivaa-hero` (v157) |
| `hallmark.php` | the display-boundary copy normaliser (v157) |
| `manifest.json` · `manifest.webmanifest` | installed-app name/description speak Shivaa (v157) |
| `js/admin.js` | rate-card/poster collateral renamed (v157) |
