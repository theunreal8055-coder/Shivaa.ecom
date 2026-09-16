# SHIVAA v125 — THE FOUR FILMS: REVOLVING CASE + GOLD THREAD (2026-09-16)

**Release:** v125 · the two owner-selected homepage showcases from the
20-ways preview — **Way 17 The Revolving Case** and **Way 12 The Gold
Thread** — built for real on the live homepage, plus the full-screen
**Reel** player and the four films in `images/films/`.
**Zip:** `shivaa-update-v125.zip` — extracts straight into `public_html` (root layout).
Rates untouched (`premium.gold22=398` lock); `api.php`, `.htaccess`, `db.json` NOT in this zip.

## ⚠ FILM STATUS — READ FIRST (updated 16 Sep, evening)
- **The Gold Thread now carries the owner's five REAL films**
  (`thread-01..05.mp4`, 720×1280, ~4.6 MB total): The Beginning ·
  From Paper to Gold · The Pieces · The Modern Bride · Forever, Reimagined.
  Uploaded by the owner to `main` (commit `5d3aff0`), compressed for the web,
  posters extracted. No stand-ins in the thread.
- **The Revolving Case still runs the four AI stand-ins**
  (`film-01..04.mp4`, ~1.2 MB total). When the owner sends the four case
  films, drop them in as `images/films/film-01.mp4` … `film-04.mp4`
  (9:16 vertical, ~10 s each) and re-ship — nothing else changes.
- **Do not deploy to the live site before the owner has either accepted the
  case stand-ins or supplied the real four.**

## WHAT IS NEW
1. **The Revolving Case** (after the category slider, before Bestsellers) —
   the four films sit in a dark velvet 3D ring. Drag to spin (touch + mouse,
   pointer events), inertia + magnetic snap, rapid arrow clicks queue instead
   of eating each other, and only the front film ever plays. Tap the front
   film for the Reel.
2. **The Gold Thread** (after Bestsellers) — a gold thread draws itself down
   the page as you scroll, weaving between four chapters; each film wakes as
   the thread tip passes it. Scroll-driven, rAF-throttled, one passive listener.
3. **The Reel** — full-screen film player: zooms out of the tile you tapped,
   sound on (gesture), swipe/arrow keys, auto-advance with progress bars,
   Escape closes, closes on route change, page scroll locked while open.
4. **Data discipline (house law):** every film is muted, `playsinline`,
   poster-first, and plays only while on screen. **Save-Data / au-lite mode
   mounts no `<video>` at all** — posters only; a film loads solely on an
   explicit tap. `prefers-reduced-motion` = no autoplay, no zoom transition.
5. **v125 supersedes the v46 "house in motion" films row** on the homepage —
   the owner's four films are THE films now. Display-layer removal only
   (`js/v125.js` takes the row down as boost.js builds it); `boost.js` itself
   is untouched, so deleting v125's supersede block restores the old row.
6. **Release wiring:** `__SHIVAA_REL` / `APP_REL` / service-worker shell all
   **125** (`shivaa-shell-v125`); SW precache adds `v125.js?v=125` +
   `v125.css?v=125` and re-pins `app.js`/`v116.js` at 125. The media cache
   deliberately stays `shivaa-media-v120` — product photos keep their cache.

## ZIP CONTENTS (25 files, root layout)
    index.html  sw.js  DEPLOY-v125.md
    js/app.js  js/v116.js  js/v125.js
    css/v125.css
    images/films/thread-01.mp4 … thread-05.mp4   (owner's 5 story films, 689–1214 KB)
    images/films/thread-01.jpg … thread-05.jpg   (5 posters, 40–58 KB)
    images/films/film-01.mp4 … film-04.mp4       (4 case stand-ins, 209–355 KB)
    images/films/film-01.jpg … film-04.jpg       (4 posters)

## DEPLOY (Hostinger, ~2 min)
1. Back up: download the current `public_html` as a zip from hPanel first.
2. Extract THIS zip into `public_html` (overwrite when asked). Nothing in
   `data/`, `uploads/` or product photos is touched — the zip contains none of them.
3. Done. Returning shoppers pick it up via the renamed shell
   (`shivaa-shell-v125`); the update banner offers one-tap activate.

## OWNER PHONE PASS (2 min)
- Close ALL shivaa.in tabs, reopen fresh (or pull-to-refresh twice).
- Home: below the category slider, the **Revolving Case** — drag it, spin with
  the arrows, tap the front film: it should fill the screen with sound.
- Scroll on: the **Gold Thread** draws itself down through **five chapters**
  (fire → sketch → pieces → bride → forever); each film wakes as the thread
  passes it. Tap one: full screen with sound, and the counter reads "0X / 05".
- Old "house in motion" film strip must be gone from the homepage.
- With mobile data-saver ON (or a slow 2G profile): no film downloads —
  posters only until tapped.

## LIVE CHECKS (any browser)
- `https://shivaa.in/sw.js` contains `shivaa-shell-v125`.
- View-source of the home page: `/js/app.js?v=125`, `/js/v116.js?v=125`,
  `/js/v125.js?v=125`, `/css/v125.css?v=125`.
- `https://shivaa.in/images/films/thread-01.mp4` streams (not 404, not the SPA page).

## PROOF (run on this tree)
v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14 ·
v122 22/22 · v123 14/14 · v124 20/20 · **v125 25/25** · php-sweep 211 routes ·
0 exceptions. All re-run on the extracted zip overlay (`SMOKE_CMS`). The v125
gate asserts: the exact 125 triple, **no stale 124 stamp in any branch**, SW
precache pins + include order, both home mounts placed (case before
Bestsellers, thread after), four films + posters on disk and light, strict
self-guarding IIFE with no network of its own, muted/playsinline/poster-first
discipline with LITE = posters only, boost row superseded at the display
layer only, api/.htaccess/db byte-identical to HEAD, media cache v120 left
alone, and a jsdom boot where the case mounts + arrows queue correctly, the
thread renders with dash geometry, film srcs point at the shipped files, the
Reel opens/closes with the scroll lock, the boost row stays gone, and an
au-lite boot mounts zero `<video>` elements. The v125 gate also asserts the
five-chapter story arc on disk and in the DOM, the reel playing the 5-film
thread list with its own counter, and the case keeping its separate 4.

## ROLLBACK
Delete `js/v125.js` + `css/v125.css`, restore the previous `index.html`,
`sw.js`, `js/app.js`, `js/v116.js` (v124 zip re-extract is enough) — the two
new home sections are inert empty divs without v125.js, and the boost films
row returns on its own.
