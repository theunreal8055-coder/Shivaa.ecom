# DEPLOY — v157 (SHIVAA EVERYWHERE · the last Jaipur survivors · three more bugs dead)

> **SUPERSEDED BEFORE DEPLOY — use `shivaa-update-v158.zip` / `DEPLOY-v158.md`.**
> v157 was packaged but never extracted on the server. v158 carries everything
> below forward *plus* the Categories-button repair the owner reported on
> 20 Sep 2026, so there is nothing to choose between them: extract v158.
> This file is kept only as the record + rollback reference.

**Zip:** `shivaa-update-v157.zip` · md5 `db0b867c2c2c7a203f05c123cfc6d723` ·
sha256 `6e0afa263fab82f45946401fbb3821dfc9433639279c535b1b9ef781c1b55d50`
· **9 files:** `api.php`, `css/styles.css`, `hallmark.php`, `index.html`,
`manifest.json`, `manifest.webmanifest`, `sw.js`, `js/app.js`, `js/admin.js`
→ unzip into `public_html/cms/`, **overwrite all nine**.

> Sits on top of v156 (SHIVAA RATES + 24K ₹398 premium + three bugs) — v156's
> zip stays as the rollback rung. Nothing about the buy lane, Cashfree,
> checkout, the partner portal or the bullion desk changed beyond the release
> stamps. **`data/db.json` is deliberately NOT in the zip** (uploading it would
> overwrite live orders, settings and the live catalogue) — see §1c for how the
> catalogue copy is fixed without shipping data.

## Owner's brief (2026-09-19, repeated verbatim from v156)

1. *"Wherever there is Jaipur mentioned, mention Shivaa or Shivaa's rates."*
2. *"Add premium to 24 karat gold rates in the B2C section — the same premium
   as the 22 karat."* → already locked at **same total ₹398/g** in v156; v157
   fixes the one B2C surface that had quietly bypassed it (the Finale prize).
3. *"Find some bugs in the app and solve."* → three more, all real, all proven.
4. *"Don't disturb the B2B section."* → untouched, and re-proven below.

## 1 · The sweep is FINISHED — four surfaces v156 had missed

| Where | Before → After |
|---|---|
| **Buyback valuation badge** | `LIVE JAIPUR RATE` → **`LIVE SHIVAA RATE`** (the last uppercase survivor anywhere in the storefront JS) |
| **PWA manifests** | `manifest.json` "…at live Jaipur rates" → **"…at live Shivaa rates"**; `manifest.webmanifest` name `Shivaa Jewellers — Jaipur` → **`Shivaa Jewellers`**, description "…from the Jaipur bullion rate" → **"…from Shivaa's gold & silver rate"** (this is the name on the phone's home-screen icon) |
| **Catalogue copy (a)** | 77 product descriptions read *"Gold price follows the **live Jaipur bullion rate** of the day."* → rewritten in `db.json` to **"…the live Shivaa rate of the day."** (the source of truth for the catalogue pipeline) |
| **Catalogue copy (b)** | …and, because **the live database is never shipped in a code release**, the same legacy phrase is normalised at the **public display boundary** (`cms/hallmark.php` · `shv_storefront_copy()`): every storefront product response (list · detail · similar · wishlist) now says Shivaa **the moment this zip is extracted** — while the stored row, the Admin console and the partner portal keep the raw text. Real geography is never touched (proven by an executed-PHP pin). |
| **The last one was in MARKUP, not copy** | the rate-card wrapper class `jaipur-hero` → **`shivaa-hero`** (it appears in the page source of `#/rates`). Because the rename lives in `css/styles.css` as well as `js/app.js`, **this release is the first since v107 to ship the stylesheet** — the file is byte-identical to the copy the v107 drop installed apart from that rename (verified against the v107 zip), and its `?v=` stamp moved **107 → 157 in both `index.html` and the sw precache**, so no browser can pair the new markup with the year-immutable old stylesheet. |
| **Admin-generated customer collateral** | shareable rate-card image `BIS HALLMARKED · JAIPUR` → **`BIS HALLMARKED · SHIVAA`**; poster subtitle "✦ Shivaa Jewellers · Jaipur rates ✦" → **"✦ Shivaa Jewellers · Shivaa live rates ✦"**; the two rate-engine labels "Jaipur gold/silver premium ₹/g" → **"Shivaa gold/silver premium ₹/g"** (the legacy note "feeds only the 18K line ×0.75" is unchanged). The geographic address line `Shivaa Jewellers, Jayal, Nagaur · Jaipur` **stays exactly as it was** — it is where you are, not what the rate is called. |

**Real geography keeps its name everywhere:** pickup & drop "Jaipur / Nagaur"
(×2 + the service option), the city chips, the reviewer's hometown.

## 2 · The 24K premium now reaches the LAST B2C surface too

v156 gave the 24K retail line the same ₹398/g desk premium as 22K
(`24K = anchor + 398`). One B2C page had quietly bypassed it: the **Bhai Dooj
Gold Finale** valued its 10 g prize off a bare `/api/rates` fetch — the **raw
fine anchor**, i.e. ₹398/g *below* the 24K rate the same site charges and
advertises. The prize now reads the **storefront** 24K rate (₹15,482 → 10 g =
**₹1,54,820**, not ₹1,50,840). Verified in jsdom against the real page.

Everything else from v156 is carried forward and re-proven: the rate card shows
both premium rows (+₹398/g 24K above +₹398/g 22K), the admin knob
(Admin → Settings → **24K gold premium ₹/g**) moves only the 24K line, the
legacy ₹55 setting still feeds only the 18K line, and an admin override wins.

## 3 · Three more real bugs found and killed (B2C only)

All three are the same family the last two releases kept finding — a page that
is rebuilt wholesale while the 1-second MCX poll is live. Each was reproduced
in jsdom **before** the fix and is proven **after** it.

- **B4 · The compare page rebuilt itself every second.** While the feed is
  live the poller fired every second and re-rendered the whole shortlist page:
  the comparison table's horizontal scroll snapped back to the left, focus and
  selection were lost, and a tap that landed across a tick (Remove / Add to
  Cart / Clear) could vanish with the node it was aimed at. The compare page
  now patches every derived number in place (`refreshComparePage()` with
  `data-cmp-*` hooks); a full render only happens when the hooks are missing.
  *Proof: scrollLeft 120 stays 120, the same DOM node survives, the numbers
  still follow a doubling market.*
- **B5 · The buyback "LIVE" valuation was frozen.** The badge says LIVE, the
  copy says "the same feed that prices every product" — but the calculator kept
  the rate captured when the page rendered, so its rupee figure drifted away
  from the feed. Every tick now re-reads the storefront rates **in place** and
  re-runs the maths: the weight input and the range slider are never rebuilt
  (typing and dragging survive). *Proof: 10 g 22K → ₹1,42,260; after the market
  doubles → ₹2,84,520, with the typed `10` still in the box.*
- **B6 · Swarna Nidhi promised grams at yesterday's rate.** The savings
  projection divided the plan value by the 22K rate captured at render, so the
  "you receive" figure stopped matching the live rate the rest of the site
  quotes. It re-projects on every tick, in place. *Proof: ₹10,000/month → 8.44 g
  at ₹14,226/g; after a doubled market → 4.22 g, both rate lines reprinted as
  ₹28,452, the ₹ amount and the slider untouched.*

Both new listeners **detach themselves** the instant their calculator leaves
the DOM, so no dead page keeps computing in the background.

## Deploy + verify (2 minutes)

1. **Backup first** (standing rule #1): download a full `public_html` zip in
   Hostinger → File Manager.
2. Upload `shivaa-update-v157.zip` to `public_html/cms/` → **Extract →
   overwrite all nine files** (the zip already has the `js/` and `css/` folder layout).
3. Verify release: open `https://shivaa.in/api/version` → must show
   **`"rel":157`**, shell `shivaa-shell-v157`, stamps index 157 · app 157.
4. Hard-refresh once (fresh service worker — it re-fetches `css/styles.css?v=157`)
   → the Live Rates card must keep its maroon hero panel styling; buyback page badge reads
   **LIVE SHIVAA RATE**; any product page description says **"the live Shivaa
   rate of the day"**; nothing on the storefront says "Jaipur rates" anywhere.
5. Bug spot-checks (phone): open **Compare** with two pieces, scroll the table
   right, wait through a few rate ticks — it no longer snaps back; open the
   **Gold Buyback** calculator and leave it open — the rupee figure moves with
   the live rate; on **Swarna Nidhi**, type an amount and leave the page open —
   the grams keep up with the rate and your typing is never cleared.
6. Finale sanity: `#/finale` prize line = 10 × the 24K rate shown on the Live
   Rates card.
7. B2B spot check: jeweller portal / RTGS board — same numbers as before.

**Rollback:** extract `shivaa-update-v156.zip` over the same folder (the old
copy returns; nothing else moves).

## QA gates (all green, source tree AND this zip's own overlay)

- **v157-check 27/27** — sweep pins (badge, manifests, db.json, display
  boundary, admin collateral, geography kept), 24K-premium-everywhere pins,
  B2B-untouched pins, the three bug pins, stamp lockstep.
- **v157-live 26/26 (jsdom ×4 boots)** — compare scroll/node identity/market
  movement in place · buyback valuation follows the feed with the input intact
  · savings grams re-divide with the ₹ amount and slider intact · Finale prize
  equals the storefront 24K rate · zero page errors everywhere.
- **v157-render PASS (34 routes, rendered DOM)** — boots the real shell, opens every
  B2C route (including the PWA shortcut target `#/size-guide`, the login-gated
  pages and a product page), and sweeps the rendered text *and* markup
  case-insensitively: **0 rate-brand mentions of "Jaipur" left**, 8 real-geography
  mentions allowed (pickup Jaipur/Nagaur ×2 + option, city chips, reviewer
  hometown, the counter address). This is the gate that caught the CSS class.
- **v157-php-run 14/14 (real PHP 8.3 execution)** — a planted legacy row is
  served as Shivaa while the stored row is untouched (and geography strings
  survive the normaliser) · `/api/products` descriptions Jaipur-free while the
  raw `db.json` on disk still holds the legacy phrase · 24K = anchor + ₹398 ·
  RTGS block byte-identical across premium worlds · version truth rel 157.
- Regression belt: **v156-check 33/33** (its stamp pins now forward-tolerant,
  house pattern) · **v156-cart 24/24** · **v155-check 34/34** · **v155-direct
  24/24** · **v154-php-run 11/11** · v146–v152 suites SKIP by era design ·
  v139 56/56 · v140 17/17 · v141 5/5 · v142 13/13 · v113b 32/32 · v117 27/27 ·
  v118 19/19 · v119 27/27 · v120 24/24 · v121 14/14 · v122 22/22 · v123 14/14 ·
  v124 20/20 · v125 27/27 · v127 27/27 · php-sweep 208 routes · 0 exceptions
  (identical inventory to v156 — no route added or dropped) · `node --check`
  on every touched JS file.

## Files in this release

| File | Why it moved |
|---|---|
| `js/app.js` | buyback badge rename · compare/buyback/savings in-place patches · Finale premium fix · stamp 157 |
| `js/admin.js` | rate-card + poster collateral renamed · two premium labels renamed |
| `api.php` | stamp `'rel' => 157` (no behaviour change) |
| `hallmark.php` | the display-boundary copy normaliser for public product responses |
| `manifest.json` · `manifest.webmanifest` | the installed app's name/description now speak Shivaa |
| `index.html` · `sw.js` | stamp lockstep 157 (loader `?v=157`, shell `shivaa-shell-v157`) · `styles.css` request + precache entry move `?v=107 → ?v=157` |
| `css/styles.css` | the rate-card wrapper class rename `jaipur-hero` → `shivaa-hero` — otherwise identical to the v107 copy already live |
