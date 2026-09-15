# SHIVAA v122 — deploy sheet (shivaa-update-v122.zip · 6 files)

**Release:** v122 · B2B design desk: search + sort + sticky bill bar, lighter photo loading
**Zip:** `shivaa-update-v122.zip` (root layout — extract INSIDE `public_html`)
**Gates:** v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14 · **v122 22/22** · php-sweep 211 routes · 0 exceptions · php-rates gate ✓
(every suite re-run on the extracted zip overlay; rates contract unchanged)

---

## 1 · What is in the zip

| File | Why it changed |
|------|----------------|
| `index.html` | v122 release stamp + cache keys, v122 layer wiring |
| `sw.js` | shell → `shivaa-shell-v122`, precache carries the v122 layer |
| `js/app.js` | desk search (name/SKU) + 5-way sort, second photos load near-view only, wishlist safety net, qty haptic |
| `js/v122.js` | sticky bill bar: the running bill follows the jeweller down the grid (new file) |
| `css/v122.css` | bill-bar styling above the bottom nav, off-screen cards skip paint (new file) |
| `DEPLOY-v122.md` | this sheet |

Nothing else is touched. `api.php`, products, orders, customers, weights, prices and the billing factor are **not** in the zip — the fine-metal math is byte-identical to v121 by design (the suite re-verifies every formula line).

---

## 2 · Upload (hPanel → File Manager → `public_html`)

1. **Back up first (1 minute):** download a copy of the live `index.html`, `sw.js` and `js/app.js` to your laptop.
2. Upload `shivaa-update-v122.zip` into `public_html` and choose **Extract** (overwrite when asked).
   The zip is in *root layout*, so `index.html`, `sw.js`, `js/…`, `css/…` land exactly where they belong.
3. The live site must already carry v120 + v121 (their zips, in order) — v122 builds on them.
4. No `.htaccess` change in this release — skip the merge step entirely.
5. This release deploys **only through this zip** — nothing else watches or auto-syncs the site.

---

## 3 · Verify live (2 minutes)

```
https://shivaa.in/api/rates
```

must be **unchanged** from v121:

* `"premium":{"gold22":398,…}` — the 22K premium (this release does not move any rate)
* `"anchorLevel":{"mode":"mcx-future","goldPerG":<today's 24K ₹/g>,…}`
* `jaipur.gold22` **= round(anchorLevel.goldPerG × 0.9167) + 398**

On the site (log in as a partner, open **Design Selection**):

* **Search** — type a name or SKU: the grid narrows as you type; the count reads true.
* **Sort** — Weight light-first orders the desk; Selected-first floats your running bill to the top.
* **Sticky bar** — tap + on any design, scroll down: a bill bar floats above the bottom nav with the same fine grams; empty the bill and it hides.
* **Bill** — Proceed → the Metal Settlement Bill shows the same fine-metal math as before (weight × 0.92, zero making charges).

---

## 4 · Owner phone pass (5 minutes, partner login)

1. **Desk** — all 65 designs load; scroll fast: smooth, photos appear as cards near the screen.
2. **Search + filter** — search "polki", add a weight chip: only matching designs show; Reset restores all.
3. **Sort** — switch to heavy-first: the heaviest designs come first; back to Featured restores catalogue order.
4. **Bill bar** — add 3 designs, scroll to the bottom: the bar shows count + fine grams; Proceed opens the bill.
5. **Feel** — +/− taps answer with a light tick; everything else looks exactly the same.

**If the phone looks unchanged:** close **all** Chrome tabs of shivaa.in and reopen (or pull-to-refresh twice).
Last resort: Site settings → Clear & reset. The v122 handshake self-heals a phone holding a stale script.

---

## 5 · Rollback

Re-upload the backed-up `index.html` + `sw.js` + `js/app.js` (UI) — that is the whole release.
The service worker keeps the previous shell cached until it activates the new one, so a rollback is instant and needs no cache surgery.
