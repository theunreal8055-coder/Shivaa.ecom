# DEPLOY v127 — the sidebar buttons + the search-bar categories actually work

**Date:** 17 Sep 2026 · **Branch:** `arena/01a0ad8d-shivaa-ecom`
**Zip:** `shivaa-update-v127.zip` — **2 files, 11 KB** (`index.html`, `js/v127.js`)
**This is a REPAIR, not a release.** The site stays **v125**: `__SHIVAA_REL` 125, `APP_REL` 125,
`SHELL = 'shivaa-shell-v125'`. **`sw.js` is deliberately NOT in the zip** — owner rule #3
after v126: the worker is never swapped in a repair. No design, colour, route, price, rate,
API, `.htaccess` or `db.json` is touched.

---

## 0 · BEFORE ANYTHING (owner, 2 minutes)

1. Hostinger → **Files → File Manager → `public_html`** → **right-click → Compress → ZIP**
   → download the full backup zip to your phone/laptop. **Do this first, every time.**
2. Keep `shivaa-update-v125.zip` where you can reach it. Your recovery path is unchanged:
   extract the backup, then re-extract v125 over the top.

---

## 1 · Install (2 minutes)

1. File Manager → open **`public_html`** (the ROOT — not a `cms/` sub-folder).
2. **Upload** `shivaa-update-v127.zip` there.
3. Right-click it → **Extract** → target `public_html` → confirm **overwrite**.
4. Delete the zip from the server.
5. On your phone: **close every shivaa.in tab**, then reopen `https://shivaa.in`.

Two files land: `public_html/index.html` and `public_html/js/v127.js`.
Nothing else changes. If anything looks wrong, re-extract your backup zip and you are
back exactly where you were.

---

## 2 · What was wrong (plain words)

**Search bar.** When you tapped a category in the search suggestions, the app closed the
search sheet *first* and let the browser do the travelling *second*. Another part of the
site (the back-button helper, `js/v120.js`) sees a sheet close and rewinds one step in the
browser's history to tidy up. The rewind and the travel raced — and the rewind won, so you
landed back on the home page instead of the category.

**Sidebar.** Live Rates · Gold Buyback · Swarna Nidhi · Bespoke & Care · Design Selection ·
Gold Finale · For Jewellers · the four photo tiles · the 17-category list · the three footer
links all leaned on the browser doing the travelling on its own, with the drawer sliding
shut 90 ms later. The app never performed the journey itself, so anything that got in the
way left the tap dead — and a dead tap while you are standing on the home page looks
exactly like "it took me to the home page".

**The fix.** One new file, `js/v127.js`, now owns those taps. It reads the button's
destination, does the travelling itself, tells the back-button helper "we are navigating,
don't rewind", and only then shuts the drawer / the search sheet. If you tap the page you
are already on, it re-draws it instead of doing nothing.

---

## 3 · Owner's check list (phone, 2 minutes)

1. **Search bar** → tap the magnifier → tap **Rings** under *Shop by category*
   → you land on the **Rings** shop page (breadcrumb says "Rings"). Not the home page.
2. Same with **Necklaces**, **Earrings**, **Bangles**.
3. Type **ring** → tap a piece in the list → that piece's page opens (unchanged behaviour).
4. **Sidebar** (three lines, top left) → tap **Live Rates** → the rates page opens, drawer shut.
5. **Gold Buyback** → buyback page. **Swarna Nidhi** → the 11+1 plan page.
   **Bespoke & Care** → services. **For Jewellers** → the B2B page.
6. **All 17 categories** → tap **Rings** in the grid → the shop opens filtered to Rings.
7. Tap **Live Rates** twice in a row → the drawer still shuts and you stay on the rates page.
8. The **☎ call button** at the bottom of the sidebar still opens your dialer.

---

## 4 · Gates (all re-run on the shipped zip's own contents)

`v113b` 32/32 · `v117` 27/27 · `v118` 18/18 · `v119` 27/27 · `v120` 24/24 ·
`v121` 14/14 · `v122` 22/22 · `v123` 14/14 · `v124` 20/20 · `v125` 27/27 ·
**`v127` 27/27** — **252/252**, plus php-sweep **211 routes · 0 exceptions**.

`tools/mega/smoke/v127-check.js` boots the real shell in jsdom and taps every button named
above. It also carries a **named regression check**: it re-runs the same search-bar tap on
the shell with `js/v127.js` stripped out and asserts that the history rewind *does* fire
there — proof the bug was real and that the gate still sees it if this layer is ever removed.

One older gate was made forward-compatible, not edited down: `v117-check.js` requires the
worker's precache list to match the shell exactly. `js/v127.js` is intentionally absent
from that list (no `sw.js` swap in a repair) and is now named in a documented
`NETWORK_ONLY` allow-list. The worker is network-first for scripts, so the new file is
fetched on first paint and stored in the shell cache by the fetch handler itself. The gate
still fails on any *other* gap and on any relic — verified by adding a dummy script and
watching it fail.

**Live verification is the owner's. Nothing is "shipped" until he says it is.**
