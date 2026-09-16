# SHIVAA v126 — DEPLOY (Hostinger · 2 minutes)

**What this release is:** the laptop fix. The homepage was queueing **~48 MB of
eager video** behind the first paint — a 16 MB hero film plus four autoplay
carousel films (31 MB) plus the nine showcase films — so the screen sat empty
while it streamed. v126 makes every film cold, hands the bytes out under a
budget, makes the gold thread glow, and fills the empty laptop margins with
the house ornament. **The fifth Gold Thread film on your phone is fixed.**

`api.php` · `.htaccess` · `data/db.json` are **NOT** in this zip — rates and
the catalogue are untouched.

---

## 1 · Upload

1. Download **`shivaa-update-v126.zip`** (10 files, ~120 KB — no media).
2. Hostinger → **File Manager** → open **`public_html`**.
3. **Upload** the zip into `public_html`, right-click → **Extract**.
4. If asked about existing files → **Overwrite / Replace all**.

Layout is site-root: `index.html`, `sw.js`, `js/…`, `css/…` land where they
belong. Nothing to move afterwards.

> **boost.js matters this time.** It is re-stamped `?v=46 → ?v=126` because
> v126 edits it. If an old `js/boost.js?v=46` stays in the browser or the
> service worker, the eager-video version keeps running and you will see **no
> speed change**. The new shell requests only `boost.js?v=126`.

## 2 · Clear the old shell (one time, 30 seconds)

Close **every shivaa.in tab**, reopen one. If it still looks like v125:
Chrome ⋮ → **Settings → Site settings → shivaa.in → Clear & reset**.

---

## 3 · What to check — LAPTOP (5 minutes)

| # | Check | Expected |
|---|-------|----------|
| 1 | Load shivaa.in | The hero photograph paints **immediately**; the film fades in a couple of seconds later. First screen no longer waits on video. |
| 2 | Watch the empty margins (≥1280 px wide window, mouse) | A thin gold thread runs down each margin with three diamond motifs and a bright ember that moves as you scroll. |
| 3 | Scroll to **Shivaa Films — turn the case** | Bigger cards, two soft spotlight cones, a lit floor — and **four clickable chapter chips** under it. Click a chip: the case turns to that film; click the front one: full screen with sound. |
| 4 | Scroll to **Everything begins as one thread of gold** | The line now **glows**: a soft gold halo along it, a bright molten ember riding the tip as it draws, and each chapter's film lights up with a gold halo as the thread passes it. |
| 5 | Open DevTools → Network → filter `mp4`, reload | Only the hero film (after a short delay) and the films actually near the viewport request bytes. Nothing below the fold. |

## 4 · What to check — PHONE (3 minutes)

| # | Check | Expected |
|---|-------|----------|
| 1 | Load the homepage | Identical to v125 — **no rails, no chapter chips, no medallions**. The desktop layer cannot reach a phone. |
| 2 | Scroll to the Gold Thread | All **five** chapters ignite in turn — including **05 · Forever, Reimagined**, which used to sit on its poster and never load. |
| 3 | Tap any film | Full-screen reel with sound, swipe, auto-advance. |

## 5 · Why the fifth film was dying (for the record)

Nine films were created with `preload="metadata"` (four in the Revolving Case,
five in the Gold Thread) plus five ambient films from the older layer. A phone
exposes roughly **four hardware decoders**; the browser hands them out in
creation order and the last element in the queue — thread 05 — was left with
nothing, so it sat on its poster while chapters 01–04 played perfectly.

v126 fixes it three ways, so it cannot come back:

1. **Films are cold.** `preload="none"`, the URL parked in `data-film`. Zero
   bytes until something asks to play.
2. **A budget, not a queue.** 3 films live on a phone, 4 on a laptop, 0 under
   Save-Data. When a new film needs a slot, the one furthest from the viewport
   is released — a film can no longer be starved by eight others.
3. **A watchdog.** Any film that wants to play but still has no frames after
   five seconds is re-armed; a film that errors or stalls is retried twice and,
   if it still fails, stays on its poster instead of going black.

## 6 · If you want it back the way it was

* No desktop ornament: delete `css/v126.css` **and** `js/v126.js` from
  `public_html` (the site works perfectly without them — films then behave
  exactly as they did in v125, posters first).
* No films at all: put the phone in **Data Saver** — v126 then holds zero
  films and shows every poster.

## 7 · Gates (all re-run on the built zip, not only on source)

`v113b 32 · v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 ·
v123 14 · v124 20 · v125 27 · v126 39 = 264/264`
plus `php-sweep` → **211 routes · 0 exceptions**.
