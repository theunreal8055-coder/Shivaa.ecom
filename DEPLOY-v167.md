# DEPLOY — v167 · EVERY FIELD HAS A NAME, EVERY PAGE HAS A HEADING

**Zip:** `shivaa-update-v167.zip`
- **MD5:** `f7219538fdad9300f1d342d32e58e448`
- **Files (12, root layout):** `api.php`, `index.html`, `sw.js`, **`css/v167.css` (new)**,
  `js/app.js`, `js/auth.js`, `js/hallmark.js`, `js/v116.js`, `js/v117.js`, `js/v125.js`,
  `js/v166.js`, **`js/v167.js` (new)**
- Extract into `public_html/` → overwrite. **Never touches `data/db.json`.**

---

## What this release is

This is the **hunt release**. Instead of waiting for a report, a bug hunt was run over the
whole storefront with a jsdom crawler (44 routes), an interactive harness (real boot, real
API stubs, real clicks), a click sweep (25 routes, ~700 taps, 0 errors) and a set of
targeted probes. Everything that could be *reproduced* was fixed; the ledger of every
finding lives in `tools/mega/audit/DEFECT-LEDGER-v167.md` (55 fixed in this release, more
confirmed and queued).

Two families of repair dominate, and both are invisible by design — no colour, layout,
price or route changes.

## 1 · The form fields that had no name

140+ fields across the site are generated as:

```html
<div class="fld"><label>Full name *</label><input name="name" required></div>
```

The `<label>` is *next to* the input, never **for** it. Sighted shoppers never notice;
a screen reader reads every one of them as "edit text, blank" — no name, no required
state, no error association. The count is not small: **47 sites in `app.js` and 94 in
`admin.js`** (checkout address, contact, lifetime care, bespoke services, gift card,
savings plan, gold buyback, the full B2B KYC form).

Rather than touch 140 template strings (and `admin.js`, whose bytes earlier releases pin),
this release adds **`js/v167.js`**: one delegated pass that walks the rendered page, pairs
each `.fld` label with the control it already visually belongs to, gives the control a
stable id when it has none, and sets `for=`. It adds attributes only — never markup, never
text, never order. It re-runs on DOM changes and is a no-op on a second pass. If it throws,
the page is exactly what it was before (every step is inside its own try/catch), and the
gate ships a **control run** that proves the same page without the layer still has unnamed
fields — so the fix can never quietly disappear.

## 2 · The pages that were not pages

Ten routes had **no `<h1>` at all** and nineteen jumped a heading level. The worst were the
ones a shopper meets on a bad day:

- an **empty bag** was a bare `<div class="empty"><h3>Your cart awaits its sparkle</h3>`;
- a **wrong order link** said "Order not found" as an `h3` with no page heading and no route
  back;
- **`#/account`, `#/track`, `#/certificates`, `#/invoice`** opened the login sheet over an
  **empty page** — closing the sheet left the shopper on a blank screen;
- the **privacy (DPDPA) page**, the **services page**, **lifetime care**, the **ring sizer**,
  **contact** and **rates** all jumped `h1 → h3/h4`.

They now render the same hero every real page uses (crumb + `h1`) with the message as an
`h2`, and the signed-out member routes explain themselves *behind* the login sheet — where
you are, what is behind the door, and one button to open it. `css/v167.css` keeps every
promoted heading at the exact size, family and margin its old level had: **the repair is
invisible on screen.**

## 3 · The bugs that were not accessibility

| # | What was broken | What the shopper saw |
|---|-----------------|----------------------|
| 1 | **Two elements with `id="shvErr"`** in the login sheet (retail pane + jeweller pane) | a partner typing a wrong password: the spinner stops and **nothing else appears** (every error was written into the hidden pane) |
| 2 | `toast()` called `$('#toastWrap').appendChild` unguarded | one missing wrapper and **every** message on the site dies with it |
| 3 | `#modalBox` is `role="dialog" aria-modal="true"` with **no accessible name**; the close button's name was the character "✕" | every sheet in the site was an unnamed dialog |
| 4 | The filter badge held `+ (value < 1500000 ? 0 : 0)` | the price filter never counted, and the badge never refreshed while the drawer was open |
| 5 | The slider's top stop was labelled **"Any"** but still filtered | pieces above ₹15,00,000 silently disappeared from the shop |
| 6 | The prepaid saving used `payCfg.prepaidPct \|\| 2` while `api.php` reads `prepaidPct` with `??` | on a shop set to 0%, the cart promised a discount the server never takes |
| 7 | `#coShipRow` was looked up as `.sum-row:nth-last-child(2)` — the **COD** row | the shipping line was never repainted when a rate tick crossed the free-shipping threshold: the old fee stayed on screen |
| 8 | `freeShipAbove` had no `??` fallback | a missing setting printed "free shipping over ₹0" |
| 9 | `sw.js` declared `MEDIA_TTL` (v120) and **read it nowhere** | a photo replaced at the same URL kept its old bytes on every phone that had already seen it |
| 10 | The v166 graphics failsafe asked for **`/js/aurum.js?v=166`** — its own frozen URLs | on the devices that had already seen 166 the failsafe re-fetched the exact bytes that had just failed (immutable for a year) |
| 11 | `cartMoveBack()` compared `(x.size \|\| '') === (x.size \|\| '')` | a ring saved for later in size 16 merged into the size-12 line already in the bag — **wrong size ordered** |
| 12 | `cart()`/`quote()` text fields & the category rail's resize wiring | a listener per navigation (7 after one lap, 14 after three) + a throw on a rail-less wrap |
| 13 | `kycOtpVerify` wrote to `autoCode`, a `let` inside another function | strict-mode ReferenceError: a rejected OTP killed the status line and the toast — silent form |
| 14 | Two `fillPrizeWorth()` declarations in one scope | the later silently shadowed the earlier; the dead wrapper went with it |
| 15 | `freeShipAbove` / `#searchInput` focus / privacy PDF + invoice links | wrong fallback, invisible keyboard focus, two `target="_blank"` without `rel` |

## 4 · How it was verified

- **The accessibility sweep went from 68 findings on 44 routes to 0**
  (`work/audit/probe-a11y.js`: unnamed fields, skipped heading levels, missing `h1`,
  broken ARIA references, unnamed iframes, nested interactive controls). The label count
  alone (`field-no-label`) was 32 → 0.
- **`tools/mega/smoke/v167-check.js` — 36/36.** Static: the release triple is in lockstep at
  167 (index / app / sw / shell / api), every shell asset carries the current stamp, the
  worker precaches the same list with the two new files, and each repair is present in the
  source it was made in. Live (jsdom on the real shell): the label sweep leaves **zero**
  unnamed fields on the routes tested, the empty bag, the signed-out member routes, contact
  and privacy have a real heading with no skipped level, a sheet borrows its own heading as
  its name, `toast()` survives a deleted wrapper, the badge counts the price slider while
  the drawer is open, and the top stop counts as no filter at all.
  **Control:** the same sweep with `/js/v167.js` stripped still finds unnamed fields.
- **Whole suite re-run on the v167 stamps** (`work/audit/gates-v167.log`): v166-check 32/32 ·
  v165 28 · v164 114 · v163/v162/v161/v160 green · v156 33 · v155 34 · v142 13 · v141 5 ·
  v140 17 · v139 56 · v127 27 · v125 27 · v124 20 · v123 14 · v122 22 · v121 14 · v120 24 ·
  v119 27 · v118 19 · v117 27 · v113b 32 · v147/v149/v150/v151/v152/v154/v156/v164/v165
  php-wasm runs green · php-sweep **209 routes / 0 exceptions** · pay-audit **10/10
  invariants** (same 2 pre-existing findings as HEAD).
  One suite is **flaky on baseline too**: `v155-direct.js` scores 23/24 and 24/24 for the
  same code (a timing race in its own double-tap storm) — verified on a clean worktree of
  `f05a68b`, so it is the suite, not the site.
- `work/audit/probe-login-jwl.js` reproduces the `#shvErr` bug and proves the fix: before,
  the error text landed in `paneRetail` (hidden) while `paneJwl` stayed empty; after, the
  visible pane carries it and the hidden one is cleared.
- No price, rate, route, order, invoice or payment path was touched. `data/db.json` is not
  in the zip and is not modified.

## 5 · Deploy notes

1. Extract `shivaa-update-v167.zip` into `public_html/` (overwrite). Keep `data/` untouched.
2. Nothing to configure. The release stamps itself at `?v=167`; returning devices move
   themselves over within a minute (v166's freshness controller) or on their next visit.
3. Hard-refresh once on your own phone if you want to see it immediately.

**Known carry-forward (unchanged from v165):** the Cashfree MID per-transaction cap for the
six gold-biscuit ear studs is still an action on the owner's Cashfree account, not a site
change. UPI QR / WhatsApp / COD sell them today.
