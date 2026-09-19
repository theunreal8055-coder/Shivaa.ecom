# DEPLOY — v159 (THE CATEGORY TAP CAN NO LONGER GO NOWHERE · + everything v158 and v157 carried)

**Zip:** `shivaa-update-v159.zip` · md5 `ede689d609d7c44b769020e013aa40cf` ·
sha256 `61a3fed0db0a491cdcc7e6607ae6152495f6dbe931863c4eda4518bc2b1e0a9d`
· **11 files:** `api.php`, `css/styles.css`, `css/v116.css`, `hallmark.php`,
`index.html`, `manifest.json`, `manifest.webmanifest`, `sw.js`, `js/app.js`,
`js/admin.js`, `js/v116.js`
→ unzip into `public_html/cms/`, **overwrite all eleven**.

> **This zip is cumulative on purpose** — one extraction brings the live site
> fully current whether the owner last deployed v156, v157 or v158.
> **Rollback rung = `shivaa-update-v156.zip`**, the last release actually live.
> Nothing about the buy lane, Cashfree, checkout, the partner portal or the
> bullion desk changed beyond the release stamps. **`data/db.json` is
> deliberately NOT in the zip** (uploading it would overwrite live orders,
> settings and the live catalogue).

## What the owner reported (20 Sep 2026, verbatim)

> *"Category page doesn't takes us anywhere when we click on any category but
> this time it disappeared"*

Two things in one line, and the second half is the good news: **the close works
now** — v158 did its job, the panel "disappeared". What is left is the tap
itself: on the owner's device a category tile still does not **take the shopper
to that category's page**.

## 1 · Why a tap can still end nowhere, even with a correct handler

The v158 handler was correct in isolation — it navigates first, dismisses
second. But between the shopper's finger and the address bar there are **four**
things that can each quietly eat a tap, and the old code trusted all of them:

| # | The layer | How it eats the tap |
|---|---|---|
| **A** | The panel's own dismiss | the tile handler `preventDefault()`ed and then started a hide. If anything in that same frame (the same control's other listeners, a delegated owner, the hide's own re-layout) cancelled or re-entered, the navigation never got queued — the panel simply went away. *"It disappeared"* — and nothing else happened. |
| **B** | A second click owner | `js/v127.js` (nav capture) and the era layers still watch `#mainNav`/document for taps; an owner that `stopPropagation()`s, or that awaits a promise before acting, can beat the tile's own handler. |
| **C** | The scroll dismissal | a finger that slides a few pixels while tapping fires `scroll`; closing the panel mid-gesture could kill the tap entirely (v158 kept a scroll-close — **v159 removes it**). |
| **D** | A slow/broken frame | a service-worker swap, a jsdom-quiet device, an unhandled error in the same tick — the assignment to `location.hash` can simply never happen. |

The lesson from the device is: **don't ask the tap to win — make the landing
unconditional.** A tap that produces no navigation must be impossible, whoever
else is on duty in that frame.

## 2 · The fix — three belts, and a guarantee that consumes nothing

- **Belt 1 — the tile handler never cancels anything.** It no longer calls
  `preventDefault()`. It arms `to = shvNavTo(href, {watchdog:true, ev:e})` and
  hides the panel on the **next tick** (`setTimeout(…, 0)`), so *hiding can no
  longer cancel the journey it just started*. The native anchor action is left
  intact as the browser's own fallback.
- **Belt 2 — `shvNavTo()` walks the shopper there itself.** After the ordinary
  `location.hash = target`, a **450 ms watchdog** checks where the shopper
  actually is:
  - hash === target → **arrived**, do nothing;
  - hash !== where we started → **something else navigated on purpose**, do
    nothing (never fight a real navigation);
  - still standing where they were → re-assign the hash, and if even that is
    swallowed, `history.pushState(null,'',target)` + `route()` — the shopper
    lands on the category page *whatever* refused the first two attempts.
- **Belt 3 — an app-wide guarantee.** New `initCategoryTapGuarantee()`
  (app.js, runs at first paint beside the Categories controller): one
  capture-phase listener on `document` for every category link the site has —
  the header panel, the phone drawer's 17-photo list, the home page's
  `cat-mini-card`s, the shop chips, the footer. It **consumes nothing** (no
  `preventDefault`, no `stopPropagation`), respects modified clicks and the
  same-category redraw, and 450 ms later simply *completes* any category tap
  that produced no navigation at all. Wherever the shopper tapped — and
  whichever layer won the frame — the shopper ends up on the category page.
- **The scroll dismissal is gone.** Nothing hides the panel under a moving
  finger mid-tap any more; the button, the scrim, an outside tap, Escape,
  resize, Back and any route change still close it.
- Carried forward unchanged from v158: one owner for `#navCats` (the duplicate
  in `js/v116.js` stays deleted), the 17 tiles built from the house `CATS`
  constant before any API call, the scrim starting **below** the header, and
  every dismissal path funnelling through one close routine.

## 3 · Deploy + verify (2 minutes)

1. **Backup first** (standing rule #1): download a full `public_html` zip in
   Hostinger → File Manager.
2. Upload `shivaa-update-v159.zip` to `public_html/cms/` → **Extract → overwrite
   all eleven files** (the zip already has the `js/` and `css/` layout).
3. Verify release: open `https://shivaa.in/api/version` → must show
   **`"rel":159`**, shell `shivaa-shell-v159`, stamps index 159 · app 159.
4. Hard-refresh once (a new service worker installs — it re-fetches
   `app.js?v=159`; `v116.js`, `styles.css` and `v116.css` keep `?v=158`, which
   is correct for this release).
5. **The test that matters, on the device that showed the fault:**
   - tap **Categories** → the panel opens with all 17 tiles immediately;
   - **tap any category → you land on that category's page.** Try it the slow
     way too: tap, then *scroll a little* before lifting the finger — it still
     lands;
   - tap the same category twice → the second tap redraws, never silence;
   - tap **Categories** again, tap outside it, the scrim, Back/Escape → it
     closes, and the page behind is still the page you were on;
   - phone: hamburger → **All 17 categories** → tap one → it navigates, the
     drawer slides away, the photo list folds;
   - home page: tap any category photo → same landing.
6. B2B spot check: jeweller portal / RTGS board — same numbers as before.
7. Optional sanity for the carried content: a product description reads *"the
   live Shivaa rate of the day"*, and `#/finale`'s prize = 10 × the 24K rate on
   the Live Rates card.

**Rollback:** extract `shivaa-update-v156.zip` over the same folder.

## 4 · QA gates (all green — source tree AND this zip extracted on its own copy)

- **v159-cats 19/19** — the tap guarantee driven in jsdom **with hostile owners
  planted on purpose**: one layer eats every tile tap (`__swallowTaps`), another
  yanks the hash back to where it started (`__revertTaps`). Even then the
  shopper lands on the category page from the desktop panel, the home page's
  category photos and the phone drawer list; the panel still opens with 17
  tiles; a repeat tap = exactly one redraw; a scroll no longer closes the panel
  and the tap still lands after the shift; zero page errors.
- **v159-check 21/21** — stamp lockstep 159 (index · sw · api · app), every
  belt present in the shipped `app.js` (`initCategoryTapGuarantee` + its
  selector + the first-paint init, the watchdog's `pushState` + `route`
  fallback, the next-tick dismiss), the scroll-close **absent**, the v158
  mechanics and the v157 content verified still standing.
- **Regression belt, unchanged and green:** v158-check 21/21 · v158-cats 24/24 ·
  v157-check 27/27 · v157-live 26/26 · v157-render (0 rate-brand mentions left)
  · v156-check 33/33 · v156-cart 24/24 · v155-check 34/34 · v154-php-run 11/11 ·
  v156-php-run 14/14 · v157-php-run 14/14 · v125 27/27 · v113b–v124, v127, v139,
  v140–v142 all green · v146–v152 SKIP by era design.
- The belt (`tools/mega/smoke/belt.sh`, tracked in git) now **retries once and
  reports** any suite that dies before printing a verdict — the sandbox
  occasionally reaps a jsdom process under load, and a flake must be visible,
  never silently green.
- v125's owner-lock pin was tightened to say exactly what it checks:
  `.htaccess` byte-identical · `api.php` identical but for its stamp · the
  `db.json` product descriptions rewritten **only** where the owner's v157
  brief asked (77 descriptions; every other key byte-identical, same order).

## 5 · Files in this release

| File | Why it moved |
|---|---|
| `js/app.js` | the tap guarantee + the three belts (`shvNavTo` watchdog, next-tick dismiss, scroll-close removed) · stamp 159 |
| `index.html` · `sw.js` | stamp lockstep 159 (`?v=159` for app.js in **both** the loader and the worker precache, shell `shivaa-shell-v159`) |
| `api.php` | stamp `'rel' => 159` (no behaviour change) |
| `js/v116.js` · `css/v116.css` | carried from v158 (duplicate `#navCats` owner deleted · scrim below the header) |
| `css/styles.css` · `hallmark.php` · `manifest.json` · `manifest.webmanifest` · `js/admin.js` | carried from v157 (Shivaa rate-brand sweep, the 24K ₹398/g premium, the display-boundary copy normaliser) |
