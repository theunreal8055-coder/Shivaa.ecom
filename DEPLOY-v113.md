# SHIVAA v113 / v113b — deploy note

Upload the contents of `shivaa-update-v113.zip` into your `public_html` web root
(the folder that holds `index.html` and `api.php`). Overwrite when asked.
Files sit at the **root of the zip** — no `cms/` folder to move.

## What this release fixes

| # | Complaint | What changed |
|---|---|---|
| 1 | Hero slider frozen / swipes ignored once you scroll | Mobile browsers fire `pointercancel` (never `pointerup`) the moment a vertical scroll starts on the carousel; the old code never handled it, so one scroll killed auto-advance for the rest of the visit and swallowed later swipes. The swipe engine was rebuilt (pointer capture, cancel/leave/lostcapture reset, vertical-intent ignored, keyboard ←/→), and **`start()` is now idempotent** — the v113 cut still stacked a second autoplay timer on every cancel, which is what made the deck jump two/three slides at once. |
| 2 | Retail rates disagree with the bullion desk | `api.php`: retail Jaipur rates now anchor to the same MCX future (`goldLtp/silverLtp`) as the B2B RTGS board whenever the exchange feed is active, and `/api/rates` returns an `rtgs` block (RTGS Gold 9999/995, Silver 999.9/98.0). The customer strip shows two "RTGS · bullion" cells. |
| 3 | Quick view bounced shoppers to the product page | A cold cache now fetches the single piece and still opens the sheet where they were; the sheet slides down to dismiss (grab handle, spring-back on short pulls) and scrolls properly. |
| 4 | Verification felt like work | Login: the 10th digit auto-sends the OTP. B2B KYC: GSTIN self-checks at 15 characters, OTP self-sends at 10 digits, auto-verifies at 4 digits — once per value, so no gateway spam. A **rejected** code now says why on the form, clears the field and can be re-submitted (it used to dead-end silently). |
| 5 | Stray white line under the calculator slider | The WebKit thumb was missing its centring margin (it painted below a bare 6px track); fixed, re-asserted last in the cascade, plus a gold caret in the grams box. |
| 6 | B2B design selection lost when you check a design | Selections **and** filters persist in localStorage and are cleared only after an order is placed. |
| 7 | 2030 look | `css/v113.css`: ambient aurora, breathing hero halo, neon CTA pulse, holographic card hover, live sheen on the rate strip, aurora border on the customer-order desk — all off under `prefers-reduced-motion`. |
| 8 | Broken images on the collection grid *(new in v113b)* | 17 category faces (`images/categories/*.jpg`) were referenced by the site but **no files existed** — while the catalogue loads (or if `/api/products` fails) the grid filled with the browser's broken-image icon. All 17 now ship (rings is the real studio shot; the rest are branded placeholders until the photoshoot), plus a capture-phase net that swaps any missing `<img>` for the house monogram. |

## Files in the zip

| Path | Change |
|---|---|
| `index.html` | loads `css/v113.css`; cache busters `?v=113b` on app.js / auth.js / v113.css |
| `css/v113.css` | the "2030" layer, the slider fix, RTGS cell styling, 3-column fallback when a feed sends no RTGS rows |
| `js/app.js` | carousel, rate strip (incl. flat "— steady" on every cell), quick view, design-selection persistence, KYC auto-verify + retry, broken-image net |
| `js/auth.js` | 10th-digit auto-send, serialised so Send/Resend can never double-text |
| `sw.js` | precache list now matches `index.html` exactly (it was pinning `app.js?v=108`, missing `boost.css`/`v113.css`); offline fallback no longer answers a missing image with the HTML shell |
| `api.php` | retail = bullion anchoring, `rtgs` block on `/api/rates` |
| `images/categories/*.jpg` | 17 new category faces (244 KB total) |

## After upload

1. Hard-refresh (Ctrl/Cmd + Shift + R). The `?v=113b` busters handle the rest;
   the service worker's cache name was bumped, so a returning phone refreshes on
   its next visit (a shopper who leaves the tab open can also pull-to-refresh once).
2. `api.php` takes effect on the next request — no restart, no migration.
3. Sanity check: home hero auto-advances after a scroll; the rate strip shows six
   cells with two RTGS ones; the calculator slider has no white hairline under it.

## Verify before you upload (optional, 30 seconds)

```bash
cd tools/mega/smoke && npm install        # once — installs jsdom
cd ../../..                                # back to the repo root
node tools/mega/smoke/v113b-check.js       # 31 behaviour checks in a headless browser
node --check cms/js/app.js                 # JS syntax
```

The harness serves `cms/` locally, emulates the PHP API from `data/db.json` and
exercises the carousel, rate strip, quick view, design selection, KYC, login OTP
and the image net. It is expected to print `31/31 checks passed`.

## Rollback

Everything here is additive and file-level: to go back, re-upload the previous
`shivaa-update-v113.zip` (or the files from `main` before this merge) and
hard-refresh. No database or data-file change is involved.
