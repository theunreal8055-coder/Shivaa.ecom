# DEPLOY — v156 (SHIVAA RATES · 24K premium ₹398/g · three bugs dead)

**Zip:** `shivaa-update-v156.zip` · md5 `b5c1c6ea9fae91c5bb3e15c50be72518` ·
sha256 `a6b8bc4a9c1e9122718a50f7cbaceab3db060e259df0de1622a5a0b7812e0b12`
· **7 files:** `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`,
`js/v107.js`, `js/v120.js`
→ unzip into `public_html/cms/`, **overwrite all seven**.

> Sits on top of the v155 SILENT LANE (included — nothing about the buy lane,
> Cashfree, or checkout changed beyond the release stamps). Whatever state the
> server is in, v154's zip + v155's zip are rollback rungs, not deploy candidates.

## Owner's brief (2026-09-19)

1. *"Wherever there is Jaipur mentioned, mention Shivaa or Shivaa's rates."*
2. *"Add premium to 24 karat gold rates in the B2C section — the same premium
   as the 22 karat."* → locked as: **same total ₹398/g** (your pick), replacing
   the old ₹55 on the 24K line.
3. *"Find some bugs in the app and solve."*
4. *"Don't disturb the B2B section."* → the bullion desk / partner portal /
   RTGS board were not touched by design, and a gate now PROVES it (below).

## 1 · The storefront now speaks Shivaa

Every customer-facing rate line that used to say **Jaipur** now says **Shivaa**:

| Where | Before → After |
|---|---|
| Home hero + button | "live Jaipur rates" / "Jaipur Live Rates" → **"Shivaa's live rates" / "Shivaa Live Rates"** |
| Top ticker | `JAIPUR LIVE` → **`SHIVAA LIVE`** |
| Rate strip | "✦ Jaipur Gold 22K / g" → **"✦ Shivaa Gold 22K / g"** |
| Rates page | "✦ JAIPUR MARKET RATE" → **"✦ SHIVAA LIVE RATE"**; tiles `GOLD 24K · JAIPUR` → **`GOLD 24K · SHIVAA`** (22K/18K/silver too); "22K Jaipur premium" → **"22K Shivaa premium"**; "Silver (Jaipur 925)" → **"Silver (Shivaa 925)"**; "These Jaipur rates power every price on shivaa.in" → **"These Shivaa rates…"** |
| Quotes · cart · compare · FAQ · terms · buyback · savings · metal desks · login modal · certificate | every "live Jaipur rate" sentence → **"Shivaa's live rate"** |
| Order tracking (v107) | "22K Jaipur premium — desk physical" → **"22K Shivaa premium…"**; "packing at the Jaipur atelier" → **"packing at the Shivaa atelier"** |
| Sidebar (index.html) | "Jaipur gold & silver, live" → **"Shivaa gold & silver, live"** |
| Contest quiz (api) | "Yesterday's Jaipur closing rate" / "live Jaipur gold / silver rate" → **Shivaa** |

**Real geography keeps its name** — pickup & drop "Jaipur / Nagaur", the city
chips, and a reviewer's hometown stay (they are places, not the rate brand).
B2B pages, the partner portal, the admin console and the RTGS board are
byte-untouched.

## 2 · The 24K rate now carries the same desk premium as 22K

- `24K retail = anchor + ₹398/g` — the same ₹398/g the 22K line carries
  (round(anchor × 0.9167) + ₹398). Both premiums now display on the Live Rates
  card: **"24K Shivaa premium +₹398/g"** sits right above the 22K row, and both
  are published in the API as `premium.gold24` next to `premium.gold22`.
- It's its own explicit number, exactly like the 22K one: **Admin → Settings →
  Store → "24K gold premium ₹/g"** (default 398, tunable 0–100000). The legacy
  "Jaipur gold premium ₹/g" (55) now feeds **only the 18K line** (×0.75 = ₹41)
  — its admin hint says so.
- It reaches everything B2C: rates page, ticker, product pricing, buyback,
  savings-scheme projections, metal desks, quotations. **22K / 18K / silver
  math is byte-identical to v155 — only the 24K line moved.** An Admin rate
  override still wins over everything.
- **B2B proof (executed, not promised):** the RTGS block of `/api/rates` is
  byte-identical with the premium at 398 and at 500 — the bullion desk prices
  off the raw anchor and never met the retail premium (v156-php-run §4).

## 3 · Three real bugs found and killed (B2C only)

- **B1 · The Back-button burial.** When a shopper opened the menu/search/bag on
  a bare `shivaa.in/` visit, the back-button engine (v120.js) stored the
  opening hash — and an **empty hash is falsy**, so "open on home" read as
  "closed". Every visual change while the sheet stood open (every second)
  pushed **another dead history entry**, burying Back under dozens of presses.
  Logged at v127 and left for your word — you just gave it. Now only an
  explicit `false` can mean closed; one open = exactly one entry (storm-tested).
- **B2 · The cart forgot your pincode every second.** While the MCX feed is
  live the rate poller fired every second and rebuilt the **whole cart page** —
  the pincode delivery-check box lost whatever you were typing, mid-keystroke,
  and scroll jumped. Same bug class v120 fixed on the rates page, one page
  over. The cart now patches its numbers in place; the only rebuild left is the
  rare free-shipping free↔fee flip, and even that carries your half-typed
  pincode across (proven with focus + DOM markers in jsdom).
- **B3 · The 12-hour chart could paint NaN.** On a fresh server (one history
  stamp) or a dead feed (a 0-rate stamp), the rate chart divided 0/0 and drew
  nothing — silently. It now draws only from positive, finite points and needs
  at least two before it paints a line.

## Deploy + verify (2 minutes)

1. **Backup first** (standing rule #1): download a full `public_html` zip in
   Hostinger → File Manager.
2. Upload `shivaa-update-v156.zip` to `public_html/cms/` → **Extract →
   overwrite all seven files.**
3. Verify release: open `https://shivaa.in/api/version` → must show
   **`"rel":156`**, shell `shivaa-shell-v156`, stamps index 156 · app 156.
4. Hard-refresh the storefront once (fresh service worker) → top ticker reads
   **SHIVAA LIVE**; Live Rates page shows the **✦ SHIVAA LIVE RATE** badge and
   BOTH premium rows (+₹398/g 24K above +₹398/g 22K).
5. Rates sanity: `24K ≈ MCX anchor + 398`, `22K ≈ anchor × 0.9167 + 398`
  — the anchor row is printed on the card; your bill matches it to the rupee.
6. Bug-spot check (phone): open the menu on shivaa.in (no # in the URL) →
   Back closes it in ONE press; on the cart page type a pincode while the
   market is live — the box no longer clears every second.
7. B2B spot check: jeweller portal / RTGS board — same numbers as before the
   update.

**Rollback:** extract `shivaa-update-v155.zip` over the same folder (the old
strings + old 24K premium return; nothing else moves).

## QA gates (all green, source tree AND the zip overlay itself)

- **v156-check 33/33** — brand swap whitelists + 24K premium pins + B2B
  untouched pins + three bug pins + stamp lockstep.
- **v156-cart 24/24 (jsdom ×3 boots)** — pincode value AND focus survive rate
  ticks; structural flip carries the pincode; one-open-one-entry history
  incl. mutation storm; rate card renders both premiums, zero Jaipur copy.
- **v156-php-run 14/14 (real PHP 8.3 execution)** — /api/rates exact math
  (15482 / 14226 / 11354 / 236.2 from a 15084/233.2 anchor), premium.gold24
  published, knob = 500 moves only 24K, rtgs byte-identical, version truth.
- Regression belt: **v155-check 34/34** (era-guarded, physics intact) ·
  **v155-direct 24/24** · **v154-php-run 11/11** (stamps self-consistent) ·
  v154/v153/v152 suites SKIP by era design · **v139 56/56 · v140 17/17 ·
  v141 5/5 · v142 13/13 · v113b 32/32 · v117 27/27 · v118 19/19 ·
  v119 27/27 · v120 24/24 · v121 14/14 · v122 22/22 · v123 14/14 ·
  v124 20/20 · v125 27/27 · v127 27/27** · php-parse-check clean ·
  `node --check` on every touched JS file.
