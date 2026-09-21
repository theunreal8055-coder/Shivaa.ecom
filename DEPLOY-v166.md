# DEPLOY — v166 · ALWAYS THE LATEST

**Zip:** `shivaa-update-v166.zip`
- **MD5:** `27ea075976adc73ad5cacc2bd513a680`
- **Files (9, root layout):** `api.php`, `index.html`, `sw.js`, `css/fonts.css`,
  `js/app.js`, `js/admin.js`, `js/v116.js`, `js/v117.js`, **`js/v166.js` (new)**
- Extract into `public_html/` → overwrite. **Never touches `data/db.json`.**

---

## What you reported

> **1.** "category button … shows categories on laptop then when we click on any kind of
> categories like rings or necklace then nothing happens"
>
> **2.** "sometimes the products on the page are shown and sometimes it's all empty …
> sometimes we have to refresh it … sometimes some animations or graphics are not loaded
> and website is not loaded correctly"
>
> **3.** "people who logged in 15 days ago are still seeing the version that was 15 days
> ago … in the next update I want a setting … that people should only see the latest
> version of the website"

All three were real, all three had a single measurable cause each, and all three are
fixed in this release. Nothing was guessed — each report was reproduced on the real
shell before and after the change (the numbers are at the end of this file).

---

## 1 · The category tap that did nothing

**What was happening.** On a real network (your laptop, where the first batch of API
calls takes a few seconds) the early category wiring in `js/v116.js` takes ownership of
the **Categories** button before the main script finishes booting. That early wiring
opens the mega panel — and it also *skips* the block in `js/app.js` that attaches all
the **close** behaviour. So:

- the panel opened with its 17 tiles (that is why "it works on laptop" — the menu you
  see is real);
- tapping **Rings** *did* change the URL underneath — but the panel and its
  **full-screen backdrop** stayed on top of the new page;
- and because that backdrop covers the whole screen, **every later tap landed on the
  backdrop** — the page never appeared to change. Second tap on "Rings": same URL, no
  navigation, literally nothing happens.

**The fix.** Closing an overlay is no longer a side-effect of who wired the button
first. `js/v166.js` owns it, unconditionally: a tile tap, the backdrop, an outside tap,
Escape, a scroll, and — the decisive one — **every navigation** (hash change, back
button, or an in-page redraw). A route can never inherit an open overlay. Tapping the
same category twice still redraws instead of doing nothing.

## 2 · The empty grid, and the missing animations

Two separate faults, both now fixed:

**a) One bad `/api/products` answer emptied the shop.** Three things combined:
the request had **no timeout**, so a stalled connection never resolved *and never
failed* — the 6-second first-paint cap would then paint the page with **zero** real
products and the promised quiet re-paint never came. A server error (5xx) was turned
into `{products: []}`, which is "success with nothing in it" — so no retry ever ran
either. And the shopkeeper's own safety copy of the catalogue was never written to the
device, so there was nothing to fall back on.

Now:
- every API call is **bounded** (`AbortController`, 15 s; 20 s for the catalogue) —
  a hung request fails instead of hanging forever;
- the catalogue is **retried with backoff** (0 s, 1.5 s, 4 s, 9 s, 12 s) and
  re-painted the moment it lands — no refresh asked of the customer;
- the **last good catalogue is kept on the device for 21 days** and paints instantly
  on the next visit, so a slow or dead network can never show an empty shop;
- if the network truly refuses, the page says so honestly — *"We couldn't load the
  collection just now — you can carry on browsing, or try again"* with a **Retry**
  button — instead of a silent empty grid.

**b) "Some animations or graphics are not loaded."** `js/v117.js` injects the ambience
scripts (aurum · motion · boost) *after* first paint, but it asked for the **frozen old
copies** (`aurum.js?v=107`, `motion.js?v=107`, `boost.js?v=134`) while the service worker
pre-cached the current ones. Because `.htaccess` serves any `?v=` URL as immutable for a
**year**, a returning phone kept running the old animation code — and downloaded the same
files twice on the first visit. The injected URLs now ride the release, the pre-cache is
actually used, and a last-resort failsafe re-injects the trio if the ambience layer never
arrives.

## 3 · "People still see the 15-day-old version" — and your new switch

**The root cause is a cache header, not a bug in the site.** `.htaccess` serves every
`?v=…` CSS/JS URL with `Cache-Control: max-age=31536000, immutable` — a **year**. That is
correct *only if the number in the URL changes when the file changes* — and it did not:
untouched files kept their old numbers (fonts, `styles.css`… 17 assets were still pinned
at `?v=107` while dozens of releases shipped). A device that visited weeks ago holds those
exact URLs for a year, so it keeps the old design and the old scripts no matter how often
it refreshes.

**The cure (client side, already in this zip).** Every asset URL in `index.html`,
`sw.js`, `css/fonts.css` and in the runtime-injected scripts is **re-stamped `?v=166`** —
a URL no device has ever cached, so a returning visitor is forced to take the new files
on this deploy. From now on the stamp moves with the release, and the release check below
makes sure a device can never sit on an old one.

**The cure (server side, always on).** A new release check runs on load, on returning to
the tab, on focus and every 5 minutes against `GET /api/version` (never cached). If the
server is on a newer release than the page that is running, the device clears its caches
and re-enters on the newest release (`?shv=<release>`), once per release, and **never in
front of a half-filled form, during a payment, on the checkout/cart/quote pages, or while
a modal is open**.

**Your switch: Admin → Settings → "🔄 Always show customers the latest version".**
It is **ON by default** and stored in `settings.forceLatestVersion` (the value
`/api/version` publishes as `forceLatest`).
- **ON** → a device still running an older release moves itself to the newest one
  automatically (the deferrals above still protect forms and payments).
- **OFF** → nothing is forced; the new version is simply picked up on the customer's next
  visit, exactly like before. Use it if you ever want a quiet switch-over.

## 4 · Performance: nothing was traded away

- The re-stamp costs **one** re-download of the shell (~1.4 MB of code + CSS + 3 fonts,
  brotli/gzip-compressed) on the first visit after this deploy, and nothing after that.
- The v117 ambience loader now hits the service-worker pre-cache instead of a second
  copy of the same files — a small **win** on repeat visits.
- Boot stays on the v117 design: one parallel batch, footer links hydrating in the
  background, 6 s hard cap on the first paint (15 s on a redraw).
- All new work is idle/passive: a 1.25 s check for the first 10 s, two cheap reveal
  sweeps, one release check after load + every 5 minutes. No polling, no extra
  render-blocking request.

---

## What YOU do (5 minutes)

1. Open **hPanel → File Manager → `public_html/`**.
2. Upload `shivaa-update-v166.zip` → **Extract** → overwrite all (9 files).
3. In an **incognito** window open `https://shivaa.in/` and check, on the **laptop**:
   - tap **Categories** → the 17 tiles open;
   - tap **Rings** (or Necklace) → **the product list appears and the panel closes**;
   - tap **Categories** again, then a tile *twice* → the grid redraws both times;
   - scroll the home page → animations and photos load, nothing half-rendered.
4. Then the version test: open the site in a **normal** window on the device that was
   showing the old version. It must now show today's design without clearing anything.
   (If it is still old, wait a minute — the release check will move it — or hard-refresh
   once; that device will never be stale again.)
5. Optional: **Admin → Settings** → confirm the new switch reads ON.

### Optional 10-line hardening (skip if unsure)

The zip never touches `.htaccess` (house rule). The client-side fixes already deliver
everything above. If you want the extra belt, add this block to `public_html/.htaccess`
inside the existing `<IfModule mod_headers.c>` section (or paste it as its own block):

```apache
<IfModule mod_headers.c>
  <FilesMatch "^(sw\.js|index\.html|manifest\.webmanifest|manifest\.json|offline\.html)$">
    Header always set Cache-Control "no-cache, no-store, must-revalidate, max-age=0"
  </FilesMatch>
  <FilesMatch "^api\.php$">
    Header always set Cache-Control "no-store"
  </FilesMatch>
</IfModule>
```

---

## QA (run before packaging — every one of them)

| Gate | Result |
|---|---|
| **v166-check** (new: the three reports + a named control) | **32/32** |
| v165-check · v165-php-run | 28/28 · 12/12 |
| v164-check | 114/114 |
| v113b · v117 · v118 · v119 · v120 · v121 · v122 · v123 · v124 · v125 | 32 · 27 · 19 · 27 · 24 · 14 · 22 · 14 · 20 · 27 — all green |
| v127 · v139 · v140 · v141 · v142 · v156 · v160 · v161 · v162 · v163 | 27 · 56 · 17 · 5 · 13 · 33 · 61 · 10 · 10 · 10 — all green |
| php-sweep (every API route) | 209 routes · **0 exceptions** |
| pay-audit | 10/10 invariants intact (2 known findings, unchanged from `main`) |
| `node --check` on every touched script · `api.php` parse-check | clean |

Live jsdom reproductions of your three reports (before → after):

- **Category tap, 9 s first batch (your laptop):** panel open ✓, tile tap → URL changes ✓,
  **panel + backdrop now leave the screen ✓** (before: both stayed, backdrop ate every
  further tap), repeat tap → redraw ✓. With `js/v166.js` stripped out of the same shell
  the old dead-zone reproduces exactly — that control is part of the gate, so this can
  never silently regress.
- **Catalogue:** one failed `/api/products` → **83 products on screen at 26 s**, no
  refresh asked; a request that never answers → the device's last-good copy paints
  (89 pieces incl. the 6 studs); a catalogue that is truly unreachable → the honest
  Retry strip appears; the 6 s slow path → 6 pieces then 83.
- **Freshness:** server on 167 while the page runs 166 → one cache-busted re-entry
  (`?shv=167`), once, never a loop; with the switch OFF → nothing forced; on `#/checkout`
  → **no** reload underneath the customer.

## Still open (not this release)

**v165 carry-forward:** the 6 campaign ear studs (₹49.6k–₹55.1k each) are refused by
Cashfree's *create-order* with an amount-limit rejection until your MID's per-transaction
cap is raised — that is a Cashfree account setting, not a site bug. The site now names
the real reason on screen and in the audit log; UPI QR / WhatsApp / COD sell every stud
meanwhile.
