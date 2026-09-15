# SHIVAA v120 — deploy sheet (shivaa-update-v120.zip · 7 files)

**Release:** v120 · category-photo repair + rates-page hardening + best-app mobile pack
**Zip:** `shivaa-update-v120.zip` (root layout — extract INSIDE `public_html`)
**Gates:** v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · **v120 24/24** · php-sweep 211 routes · 0 exceptions · php-rates gate ✓
(every suite re-run on the extracted zip overlay; rates contract unchanged)

---

## 1 · What is in the zip

| File | Why it changed |
|------|----------------|
| `index.html` | v120 release stamp + cache keys, v120 layer wiring, v116 key re-stamp |
| `sw.js` | shell → `shivaa-shell-v120`, precache carries the v120 layer (media cache already v120) |
| `js/app.js` | **the fixes**: every category photo URL versioned + a logo-then-hide fallback; rates page patches in place instead of re-rendering; phone fields hardened |
| `js/v116.js` | pre-boot drawer category list carries the same versioned photo URLs (key re-stamped to v120) |
| `js/v120.js` | mobile pack: tap haptics + back-button ownership of search/modals (new file) |
| `css/v120.css` | mobile pack: safe-area, small-screen polish, monogram tile underlay (new file) |
| `DEPLOY-v120.md` | this sheet |

Nothing else is touched. `api.php`, products, orders, customers, weights and prices are **not** in the zip — rates are byte-identical to v119 by design.

---

## 2 · Upload (hPanel → File Manager → `public_html`)

1. **Back up first (1 minute):** download a copy of the live `index.html`, `sw.js` and `js/app.js` to your laptop.
2. Upload `shivaa-update-v120.zip` into `public_html` and choose **Extract** (overwrite when asked).
   The zip is in *root layout*, so `index.html`, `sw.js`, `js/…`, `css/…` land exactly where they belong.
3. No `.htaccess` change in this release — skip the merge step entirely.
4. This release deploys **only through this zip** — nothing else watches or auto-syncs the site.

---

## 3 · Verify live (2 minutes)

```
https://shivaa.in/api/rates
```

must be **unchanged** from v119:

* `"premium":{"gold22":398,…}` — the 22K premium (this release does not move any rate)
* `"anchorLevel":{"mode":"mcx-future","goldPerG":<today's 24K ₹/g>,…}`
* `jaipur.gold22` **= round(anchorLevel.goldPerG × 0.9167) + 398**

On the site:

* **Category photos** — home tiles, the Categories drawer list, the mega menu and search suggestions all show photos (never names alone, never broken-image icons). A phone holding yesterday's poisoned cache heals itself on the next visit — the `?v=120` photo URLs and the fresh media cache generation force a clean re-fetch.
* **Live Rates** — the page never goes blank, even mid-refresh; the 22K premium row and the Rate anchor row are visible and add up.

---

## 4 · Owner phone pass (5 minutes)

1. **Categories drawer** — open the menu, tap Categories: every row shows its photo.
2. **Search** — start typing: the *Shop by category* rows show photos; Back closes search instead of leaving the site.
3. **Quick View** — open any piece, press Back: the modal closes, the page stays.
4. **Rates page** — start typing in the rate-alert box while a refresh ticks: your text stays, the numbers update around it.
5. **Feel** — add-to-cart and wishlist taps answer with a light haptic tick.

**If the phone looks unchanged:** close **all** Chrome tabs of shivaa.in and reopen (or pull-to-refresh twice).
Last resort: Site settings → Clear & reset. The v120 handshake self-heals a phone holding a stale script.

---

## 5 · Rollback

Re-upload the backed-up `index.html` + `sw.js` + `js/app.js` (UI) — that is the whole release.
The service worker keeps the previous shell cached until it activates the new one, so a rollback is instant and needs no cache surgery.
