# DEPLOY — v156 (Shivaa's own rates: the 24K premium, the brand, and four bugs)

**Zip:** `shivaa-update-v156.zip` · md5 `5f6ffd1fad6addb85d050e0c24b275b5` ·
sha256 `a9ca9f53b17f8fdc864f0ef60688e0463c4bb4c30c3319aba455bbb1aea63d98`
· **9 files:** `api.php`, `index.html`, `sw.js`, `manifest.webmanifest`,
`manifest.json`, `js/app.js`, `js/v107.js`, `js/v120.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all nine**.

> No stylesheet ships (no CSS changed — and a re-stamped stylesheet paired with
> a year-immutable cached one is how v126 scattered the layout). `data/db.json`
> and `.htaccess` never ship. `js/v109.js` and `js/bot.js` were rebranded in the
> repo but are not in the zip: nothing loads or precaches them (bot.js has been
> out of the shell since v99), and the zip builder *proves* that before it will
> build without them.

## Your four orders

1. *"wherever there is Jaipur mentioned … say Shivaa / Shivaa's rates"* — done
   for the **rate brand**. Jaipur the **city** stays (see below).
2. *"add premium to 24 karat gold rates in the B2C section — the same premium
   that is on 22K (₹398/g)"* — done, and 18K follows the formula you picked.
3. *"find some bugs in the app and solve them"* — four found, four fixed, each
   with a test that fails if it ever comes back.
4. *"don't disturb the b2b section"* — the B2B desk is **byte-identical**; only
   the brand word changed in partner-page copy, which is what you approved.

## 1 · The retail ladder, before and after

| line | v155 | v156 | moved |
|---|---|---|---|
| 24K fine | anchor **+ ₹55** (legacy `jaipurPremium`) | anchor **+ ₹398** | **+₹343/g** |
| 22K (91.67) | round(anchor × 0.9167) + ₹398 | **unchanged** | — |
| 18K | round(anchor × 0.75) + ₹41 | round(anchor × 0.75) **+ ₹299** (= 0.75 × 398) | **+₹258/g** |
| Silver 925 | anchor + ₹3 | **unchanged** | — |

Worked example at an anchor of ₹15,600/g fine: **24K ₹15,998 · 22K ₹14,699 ·
18K ₹11,999 · silver ₹239**.

**No product price moves.** All 77 pieces are 22K, and `v156-check` prices every
one of them on both the v156 server and the real v155 baseline commit: identical
to the rupee. The 24K/18K lines are reference rates — the card, the four tiles,
the strip and the ticker.

One customer-visible consequence worth knowing: a **24K or 18K rate alert** is
measured against the same retail line the card prints, so an alert set before
this release now waits for the *new* line to cross its target. 22K alerts — the
ones anyone actually sets — are untouched, and your database currently holds no
alerts at all.

**Your new knob:** Admin → Settings → **"Shivaa 24K gold premium ₹/g"**
(`gold24Premium`), sitting above the 22K field. Leave it blank and it *follows*
the 22K premium, so the two karats can never silently drift apart. 18K is always
0.75 × the 24K premium. When you **pin** a counter rate instead, the published
rates are absolute: the premium block goes to zero with `pinned: true`, and the
card and footer say **"pinned · none added"** rather than inventing a premium on
top of a number you typed yourself.

## 2 · The brand

- Rate card: **"✦ SHIVAA MARKET RATE"**, rows **"22K Shivaa premium"** and
  **"24K Shivaa premium"**; ticker/strip: **"SHIVAA LIVE"**, **"✦ Shivaa Gold
  22K / g"**; the four tiles each state their own premium ("incl. ₹398/g Shivaa
  premium").
- Both manifests: `Shivaa Jewellers` (was `Shivaa Jewellers — Jaipur`) and
  descriptions that name Shivaa's own bullion rate.
- **Jaipur the city stays**, because it is where your customers are, not a rate
  brand: the service-area chips (Jayal · Nagaur · Jodhpur · **Jaipur** · Ajmer ·
  Sujangarh · Didwana · Merta · Ladnun), "at-home pickup available in **Jaipur**
  & Nagaur", the review cities, GST state Rajasthan.
- **Internal identifiers are kept on purpose** — the `jaipur` payload key, the
  `jaipurPremium` / `jaipurSilverPremium` setting names, the `.jaipur-hero` CSS
  class. Your live database already stores those keys, a phone on a cached v155
  shell still reads that payload key, and renaming a CSS class would pair fresh
  JS with a year-immutable cached stylesheet. `/api/rates` now publishes
  **`shivaa`** (what the shop prices from) **and a byte-identical `jaipur`
  alias** beside it, so an old cached shell keeps pricing correctly.
- **The live descriptions.** Your database belongs to your server, so the zip
  never ships `data/` — and all 77 live descriptions still read *"the live
  Jaipur bullion rate"*. The shop now rewrites **that one phrase at render
  time** (`brandRate`, a deliberately narrow regex). It never touches a product
  name, a city, a review, a spec or a HUID line — `v156-rates` renders a control
  piece named *"Jaipur Heritage Polki Ring"* whose description mentions a bride
  in Jaipur, and asserts the name and the city survive while the rate phrase
  becomes Shivaa's. The repo master `cms/data/db.json` is corrected too: 77 lines
  out, 77 lines in, and the diff proves every one of them is a `"desc"` — no
  order, setting, product, image or key order moved.

## 3 · The four bugs (all B2C — you said find some, so we went looking)

**BUG 1 · the phantom "+₹398" — a rising market that never rose.**
`/api/rates` publishes `history` as **raw anchor stamps**, but the retail rate
the card prints has the premium **inside** it. The client mixed the two bases:
the strip compared a premium-inclusive "now" with a premium-free "previous", so
the Shivaa 22K cell read **"▲ 398 ₹/g vs prev" forever**, a falling market still
read green, the 12-hour chart ended exactly ₹398 **below** the card above it,
and the rate lab's "then vs now" was inflated by the same gap. No test ever
caught it because every smoke fixture in the repo built its `history` out of the
premium-inclusive block — a fixture that repeats the bug's shape cannot catch
the bug. Fix: the series is lifted onto the retail basis **once**, in
`loadRates()`, using the premium block the API already publishes; the raw stamps
stay readable as `historySpot`. No premium block (an old cached response) or a
pinned override → the series passes through untouched. B2B never reads this.

**BUG 2 · the footer double-counted the premium.**
The "how this price is built" line printed `r.gold22` — the retail rate, premium
already inside — labelled it *"live bullion spot"*, then added ₹398 again:
*"spot ₹14,699.00/g + ₹398.00/g premium = ₹15,097.00/g"* for metal the shop
sells at ₹14,699. It also contradicted the rates page. Fix: the premium comes
from the payload first (it is the authority and it knows about a pin), and the
spot is re-derived from the **same anchor the server used**
(`anchorLevel.goldPerG × 0.9167`), so the three numbers add up exactly — and a
pinned override says *"absolute, with no premium added on top"* instead.

**BUG 3 · the Back button needed *N* presses on the home page.**
A bare `shivaa.in/` visit has an **empty** `location.hash`, and the empty string
is falsy — so v120's overlay guard recorded *nothing* when a sheet opened. Every
later class mutation anywhere in the document pushed **another** history entry,
and the close branch never ran, so not one of them was released: open the menu
on the home page and you had to press Back once per mutation to get out of the
shop. Found and instrumented during the v127 navigation repair and left alone on
purpose (that brief said do not touch the file); your "find some bugs" order is
what opened it. Fix: the hash is normalised (`location.hash || '#/'`) on both
sides of the comparison, so `sameHash` means what it always meant. The v127
navigation guard is untouched.

**BUG 4 · the 12-hour chart could silently draw nothing.**
A single history stamp (a fresh install, a history reset) ran every X through
`i / (data.length - 1)` = 0/0 = **NaN**, and one non-numeric stamp poisoned
`min`/`max` for the whole curve — the canvas drew nothing under a heading that
promised 12 hours. Fix: two usable points are the floor, `Math.max(1, …)` guards
the divisor, and a bad stamp is dropped instead of flattening the chart.

Also hardened: `pages.rates` / `refreshRatesPage` against a payload with no
`spot` block. **Deliberately not touched:** the B2B `goldKarats` dead keys and
pay-audit findings #14/#27 — out of scope for this brief, and both are recorded
in `HANDOFF.md`.

## 4 · "Don't disturb the B2B section" — the receipts

- `bullion_anchors` + `bullion_defs` + `rtgs_strip` + `bullion_rows` source:
  **md5-identical to v155**, and no retail premium helper leaked into the block.
- Executed against real PHP: the **RTGS board is identical row for row**
  (buy/sell/mid/change/unit), the **anchor block is identical**, and a **deep
  diff of the entire `/api/rates` payload** against the v155 server shows
  **exactly 7 changed paths, all retail** — `jaipur.gold24`, `jaipur.gold18`,
  `premium.gold`, `premium.gold24`, `premium.gold18`, `premium.pinned` and the
  new `shivaa` block. `rtgs`, `anchorLevel`, `spot`, `history`, `override`,
  every `usd*` figure and `marketHours` are byte-identical.
- **All 77 product prices identical** to v155.
- The four partner pages (`catalogues`, `b2b`, `metal`, `deadstock`) are
  extracted from both trees and compared with the brand word normalised away:
  they differ from v155 **in the word "Jaipur"/"Shivaa" and nothing else** — a
  changed number, key, selector, call or condition fails the build.
- The 18K/24K premium derivation lives in the **retail** function only; the B2B
  desk reads raw stamps and its own factors.

## Deploy + verify (2 minutes)

1. Back up, then extract into `public_html/cms/` — overwrite the 9 files.
   Nothing in `data/`, no CSS.
2. `curl -s https://www.shivaa.in/api/version` → `"rel":156`,
   `"shell":"shivaa-shell-v156"`, stamps `{"index":156,"app":156}`.
3. Open **Live Rates**: two premium rows, both **+₹398/g**; the tiles read
   398 / 398 / 299 / ₹3.00; the badge says **✦ SHIVAA MARKET RATE**.
4. The **22K number is exactly what it was before the deploy** — that is the
   point: only the 24K and 18K reference lines moved.
5. On a falling day the Shivaa 22K strip cell reads **▼** with the real move
   (a two-digit rupee figure), never "▲ 380".
6. Any product page: the description reads *"the live **Shivaa** bullion rate"*
   — with no database change on your side.
7. Admin → Settings: the **Shivaa 24K gold premium ₹/g** field is there. Leave
   it at 398 (or blank) and it follows the 22K premium.

## QA behind this

- **`v156-check` 49/49** on the repo tree and **46/46** on a production-shaped
  overlay (v155 tree + this zip extracted over it, three documented skips: the
  two dead files and the live-era database the zip correctly does not carry).
  `api.php` is **executed** under php-wasm and compared against the **real v155
  baseline commit**, not against a memory of it.
- **`v156-rates` 29/29** — a real DOM fed by **the server's own `/api/rates`
  bytes** over a controlled *falling* market: the strip, the footer arithmetic,
  the chart's last plotted point, both premium rows, the four tiles, the pinned
  counter rate, the legacy no-premium pass-through, the one-stamp and
  poisoned-stamp chart guards, and the empty-hash Back button (one entry per
  open, one Back per entry, nothing leaked).
- **Six negative controls** — each fix reverted one at a time turns the suites
  red (BUG 1 → 4 checks, BUG 2 → 2, BUG 3 → 3, BUG 4 → 2, the brand filter → 2,
  the 24K premium → 6). A suite that cannot fail proves nothing.
- **Legacy suites fixed forward, never reverted:** `v119` 27/27 (its era pins
  now assert the payload-driven truth), `v120` / `v140` / `v155` stamp pins
  turned into numeric floors plus a full lockstep assertion. Whole set re-run:
  **45 suites green**, with two exceptions that are not this release —
  `v125-check` (byte-identical-to-HEAD, green the moment this is committed) and
  `smoke.js`, which is red at the v155 baseline **with byte-identical output**
  (it checks features removed long ago: the tryon route, the theme button,
  cinematic videos) and needs a static server on `:8090`. Left alone on purpose.
- **Harness trap worth recording:** a fixture that seeds `rates.last.t` as
  `'YYYY-MM-DD HH:MM:SS'` is read by PHP as IST, looks 5½ hours old, trips
  `rates_stale()` and gets **replaced by a simulated market clamped to
  `BASE_GOLD × 1.04`** — every check still passes because they are relative to
  the payload, while testing a market nobody chose. v156's own suites caught
  themselves doing exactly that; every seeded stamp now carries its offset, and
  both suites assert the anchor they wrote survived.

**Rollback ladder:** v155 `b3e7f6dd36699c5c68b3b55e50e4d957eb380d5a` (this
release's branch point — putting those 9 files back is the whole rollback) ·
v154 `b8eb964953e6647a3b068b748696dc8c` · v153
`e6948a2b38628359683601cccb139d63`. **No database change anywhere in it** —
the only data edit is the repo master's 77 descriptions, which never ships.
