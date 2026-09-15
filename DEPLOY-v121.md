# SHIVAA v121 — deploy sheet (shivaa-update-v121.zip · 6 files)

**Release:** v121 · mobile smoothness pack (faster hero, smoother scrolling, calmer battery use)
**Zip:** `shivaa-update-v121.zip` (root layout — extract INSIDE `public_html`)
**Gates:** v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · **v121 14/14** · php-sweep 211 routes · 0 exceptions · php-rates gate ✓
(every suite re-run on the extracted zip overlay; rates contract unchanged)

---

## 1 · What is in the zip

| File | Why it changed |
|------|----------------|
| `index.html` | v121 release stamp + cache keys, v121 layer wiring, hero preload now matches the banner |
| `sw.js` | shell → `shivaa-shell-v121`, precache carries the v121 layer (media cache stays v120 — no re-download storm) |
| `js/app.js` | hero banner serves a phone-sized copy; slides decode off-thread; timers rest while the tab is hidden |
| `css/v121.css` | smoothness rules: cards drop costly GPU layers, off-screen cards skip paint, shine paints on the visible slide only (new file) |
| `images/banners/poster-heritage-m.jpg` | the phone-sized hero copy, 37KB instead of 172KB (new file) |
| `DEPLOY-v121.md` | this sheet |

Nothing else is touched. `api.php`, products, orders, customers, weights and prices are **not** in the zip — rates are byte-identical to v120 by design. Nothing on screen looks different; it just moves faster.

---

## 2 · Upload (hPanel → File Manager → `public_html`)

1. **Back up first (1 minute):** download a copy of the live `index.html`, `sw.js` and `js/app.js` to your laptop.
2. Upload `shivaa-update-v121.zip` into `public_html` and choose **Extract** (overwrite when asked).
   The zip is in *root layout*, so `index.html`, `sw.js`, `js/…`, `css/…`, `images/…` land exactly where they belong.
3. No `.htaccess` change in this release — skip the merge step entirely.
4. This release deploys **only through this zip** — nothing else watches or auto-syncs the site.

---

## 3 · Verify live (2 minutes)

```
https://shivaa.in/api/rates
```

must be **unchanged** from v120:

* `"premium":{"gold22":398,…}` — the 22K premium (this release does not move any rate)
* `"anchorLevel":{"mode":"mcx-future","goldPerG":<today's 24K ₹/g>,…}`
* `jaipur.gold22` **= round(anchorLevel.goldPerG × 0.9167) + 398**

On the site (use your phone on mobile data for the honest test):

* **Home** — the top banner appears sooner; on a phone it fetches `poster-heritage-m.jpg` (37KB), not the 172KB file.
* **Shop** — scrolling a long grid stays smooth; more pieces keep loading as you reach the bottom.
* **Carousel** — the banner still sweeps its shine and auto-advances; timers and countdowns tick normally.

---

## 4 · Owner phone pass (5 minutes)

1. **Cold load** — close all shivaa.in tabs, open the site on mobile data: banner and tiles paint quickly.
2. **Shop scroll** — flick fast through the rings grid: no stutter, no stuck loading at the bottom.
3. **Carousel** — watch two banner changes: shine sweep runs on the visible banner, arrows still work.
4. **Countdowns** — any timer on screen ticks each second; switch apps and come back: it shows the right time.
5. **Feel** — everything looks exactly the same; it just answers touch a beat faster.

**If the phone looks unchanged:** close **all** Chrome tabs of shivaa.in and reopen (or pull-to-refresh twice).
Last resort: Site settings → Clear & reset. The v121 handshake self-heals a phone holding a stale script.

---

## 5 · Rollback

Re-upload the backed-up `index.html` + `sw.js` + `js/app.js` (UI) — that is the whole release.
The service worker keeps the previous shell cached until it activates the new one, so a rollback is instant and needs no cache surgery.
