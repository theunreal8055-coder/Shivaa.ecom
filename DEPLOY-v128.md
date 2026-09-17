# SHIVAA — v128 · THE SPEED RELEASE (deploy runbook)

**What this is:** the "make it load fast and the smoothest in the world"
release. **Nothing you can see has changed** — same design, same colours,
same pages, same buttons, same prices, same rates. What changed is *when
the films download*.

**The short story:** your site was handing every visitor **~47 MB of video**
the moment the homepage opened — the hero film (16.7 MB), four carousel
films, the bridal film, nine Gold Thread / Revolving Case films, and a big
film on the top of every inner page (Live Rates alone pulled 11.8 MB) —
all at once, while the page itself was still loading. That is why the
laptop felt slow and why phones struggled.

**v128 makes every film start COLD** — its poster (the still photo) shows
instantly, zero video bytes move — and a small new manager (`js/v128.js`)
hands out the video **only when**:

- the page has finished painting and settled (~2 seconds), **and**
- the film is actually near the screen, **and**
- the device can afford it: **4 films at a time on a desktop, 3 on a
  phone, 0 if the visitor has Data Saver on** (posters only for them).

A film you scroll away from stops downloading. A film you scroll towards
starts smoothly. The full-screen Reel player is untouched — it still
loads instantly when you tap a film. Every film still plays exactly where
it did before — it just no longer fights the page load.

**What did NOT change:** rates (₹398 lock untouched), prices, catalogue,
orders, PayU, admin, WhatsApp, the navigation repair from v127, your nine
owner films, any image, any design. `api.php`, `.htaccess` and the
database are **not** in this zip at all.

---

## Deploy (2 minutes, the safe order)

> **Rule 1 — always first:** in hPanel → File Manager, select `public_html`
> → **Compress** → download that zip to your computer. This is your
> backup. (You have used this restore twice before — it works.)

1. Download `shivaa-update-v128.zip` from the repo.
2. hPanel → File Manager → `public_html` → **Upload** the zip.
3. Select the zip → **Extract**. It contains 8 files at the zip root —
   say **yes** to overwrite when asked:
   - `index.html`
   - `sw.js`
   - `js/app.js`
   - `js/boost.js`
   - `js/v117.js`
   - `js/v125.js`
   - `js/v128.js`  ← the new file
   - `DEPLOY-v128.md` (this paper — harmless, you may delete it)
4. Delete the uploaded zip file from `public_html`.
5. **Close ALL shivaa.in tabs** on your phone and laptop, then open
   `https://shivaa.in` fresh. The first open after this update re-downloads
   the app shell once (that is normal for every release) — the SECOND open
   is the fast one. Judge the speed on the second open.

## Your 8-step check (2 minutes)

1. Homepage opens and paints quickly — skeleton → categories → films'
   posters visible right away.
2. The hero film starts moving on its own a couple of seconds after the
   page settles (poster first, then it comes alive).
3. Scroll to the Revolving Case → drag it → the front film plays; spin →
   the new front film takes over.
4. Scroll the Gold Thread → chapters light up as the thread passes →
   **chapter 05 (Forever, Reimagined) plays too** — that was the phone bug.
5. Tap any film → the full-screen Reel opens with sound → close it.
6. Sidebar → **Live Rates** → the page opens fast; the top shows the
   static picture first, then the film takes over once it is ready.
7. Search bar → tap a category chip → lands on that category (v127 still
   working).
8. Add something to the cart → checkout → PayU screen loads as before.

## If anything looks wrong

Restore exactly as you did before: upload your backup zip → extract over
`public_html` → done. Nothing on this release touches the database, so a
restore loses nothing.

---

## For the record (technical)

- Version triple: `__SHIVAA_REL` / `APP_REL` / SW `SHELL` → **128**
  (`shivaa-shell-v128`). This is a full release, so `sw.js` ships and
  re-stamps everything together — never swap `sw.js` alone.
- Re-stamped: `app.js?v=128`, `v116.js?v=128`, `v117.js?v=128`,
  `v125.js?v=128`, `boost.js?v=128` (in the v117 post-paint injector AND
  the worker precache — the returning-visitor trap), new `v128.js?v=128`
  (defer, between v125 and v127; v127 stays last).
- `v127.js` unchanged (`?v=127`) — the navigation repair is preserved.
- MEDIA cache stays `shivaa-media-v120`; films are never cached by the
  worker (unchanged).
- Gates: **284/284** on source (v113b 32 · v117 27 · v118 18 · v119 27 ·
  v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · v127 27 ·
  **v128 31**) · php-sweep **211 routes · 0 exceptions** — all re-run on
  the extracted zip overlay too.
- If `js/v128.js` is ever missing, `boost.js` and `v125.js` fall back to
  the old eager behaviour — the site degrades, it never breaks.
