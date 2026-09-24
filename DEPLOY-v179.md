# v179 — the permanent bullion-rates fix

**24 September 2026 · published on `arena/01a0d168-shivaa-ecom` · NOT DEPLOYED**

The owner's request, verbatim: *"MCX connection from render is showing
'signal is aborted without reason', the dollar connection is working
fine. Please give me a permanent solution for bullion rates, that I don't
have to touch the rates in the next update."*

Diagnosis (recorded in `docs/AGENT-HANDOFF.md` + `docs/MEMORY.md`):

- **"signal is aborted without reason"** is Node's undici AbortError from
  the Render-hosted v78 relay: its long-lived SmartStream connection
  aborts and the relay never self-heals — the process just dies and the
  site's 1-second MCX feed goes dark.
- The dollar/spot leg "works fine" because it is plain PHP multi-provider
  polling on the site's own host — no long-lived connection to break.
- When MCX is dark, the site's old fallback priced gold from raw
  international spot × USDINR — **10–14% under market** (no MCX duty, no
  market premium) — so the owner had to hand-calibrate the admin
  factors, and the B2B RTGS strip (which derives from the same anchor)
  drifted with it. *Those hand-touched "rtgs rates" are exactly what this
  release removes.*

## What v179 does — four layers, in order of permanence

1. **Calibrated premium (the permanent fix).** While the official MCX
   feed and the international spot are **both** live, the site measures
   the MCX-over-spot premium into a rolling 200-sample window
   (`rates.premiumCalib`). When MCX is down it prices from
   **spot × the median of the recent sane samples** (0.9–1.5 band,
   < 7 days old) — falling back to the owner's settings factors. The
   quote is labelled honestly everywhere: `source: mcx-est`, the stamp
   carries the applied factor (`premiumEst`), the rate card says
   "MCX estimate · spot × 1.137 (auto-learned), MCX feed down", and the
   B2B RTGS strip rides the same anchor — on-market, no manual touch.
   This is what makes the next update (and the one after) need **no rate
   fixing at all**.
2. **Last-good persistence.** Every live MCX pack is stored as
   `rates.mcxLastGood` — the admin always sees the last true price and
   exactly when. A dark feed degrades to the estimate; it never blanks
   the board and never invents a number (both feeds dead → the last
   known values hold, labelled `cached`).
3. **GET persistence bug fixed.** The public `GET /api/rates` route
   answers with `jout()` — which exits — *before* the end-of-request
   save, so every poll's refresh (stamp, calibration window, last-good)
   was silently discarded. The route now persists the changed state
   before answering.
4. **Relay v2 (optional, its own host — not in this ZIP).**
   `cms/relay/` is a complete zero-dependency Node 18+ service that
   replaces the dead v78 relay. Same public contract the site already
   speaks (`/tick`, `/stream?key=`, plus `/healthz`), built **only on
   the REST endpoints the site itself uses daily** (login + TOTP,
   Search Scrip, quote @ 1 rps) — no proprietary WebSocket protocol —
   with an explicit self-heal for every failure mode: any network error
   (including "signal is aborted without reason") becomes backoff +
   retry; the daily 3:30 AM session expiry re-logs in automatically;
   contract rollover re-resolves; 429 backs off politely; a 90 s
   no-frame watchdog forces a fresh session; the last tick is persisted
   and served across a crash.

**The point of the design:** layer 4 makes the board tick once a second
like the exchange; layers 1–3 make the **prices** correct and
self-healing whether the relay is running, sleeping, or never deployed.
A dead relay can no longer cost a single rupee of accuracy.

## The one-time owner action (≈ 3 minutes, then never again)

Paste the five **Angel One** credentials into **Admin → Settings**
(site-side feed — the input layers 1–3 price from):

| Field | What it is |
|---|---|
| Angel API Key | from your Angel One SmartAPI console |
| Angel Client Code | your 10-digit client code |
| Angel MPIN | the MPIN you set for SmartAPI |
| Angel TOTP Secret | the base32 TOTP secret from the same console |
| Angel Gold / Silver tokens | **leave blank** — resolved automatically, nearest expiry first (manual override only if you want it pinned) |

Save. Done. From then on: MCX live → official prices; MCX down →
honest `mcx-est` from the auto-learned premium; both down → last known
values hold. No rate to touch in any future release.

**Optional:** deploy the new relay to Render (see
`cms/relay/README-RENDER.md` — 2 minutes: point Render at the
`cms/relay` folder, set the 6 env vars, copy the URL into Admin →
Live Rates' *Relay server URL* / *Relay stream key* / *Browser push URL*,
then delete the old v78 service). The admin **Live Rates → Pipeline
health** strip shows every leg at a glance — and if it says
"nothing to touch", it is true. Until the relay is redeployed (or if it
ever sleeps), everything above still holds on the site's own feed.

## Latest update download

**`shivaa-update-v179.zip`** — same nine files as v178 (no new site
assets in this release; the relay lives on its own host).

- Requires an existing full **v165-or-newer CMS**, not an empty hosting folder.
- **9 files · 450,237 bytes**; cumulative v171–v179 code-file union,
  a superset of the v178 package (the 179 re-stamp + the v179 core in
  `api.php`, `js/app.js`, `js/admin.js`; the css/js v178 pair unchanged).
- **SHA-256:** `e6f4265fb45405d6cdf9eefa93614e056285d819b8b1501dbb0d267853554e8d`
- Source commit: `4670cb854a8f1ed1834773397856f736309c7efc` (the code the
  ZIP contains). Publication commit: `__PUB_COMMIT_PENDING__` (the ZIP on
  this session branch).
- Builder: `python3 tools/mega/make-v179-zip.py` (asserts every cumulative
  prior repair — v176 revenue core, v177 purge, v178 band + the v140 law —
  plus the v179 invariants: calibrated-premium engine, `mcx-est` ladder,
  last-good persistence, the GET-route save, the health payload, the
  relay v2 self-heal surface, lockstep 179 stamps).

**Forward-only.** v178 and earlier ZIPs/links stay unchanged and
available. No reset, revert, restore, renumber or force-push. **The next
release is 180 or higher.**

**Back up your website and database first.** Upload/extract into the
existing website folder containing `index.html` and `api.php`
(`public_html`, or `public_html/cms` for that installation). Replace the
code files together; never extract only the worker.

No database, uploads, credentials, media or host-managed `.htaccess` is
included. New settings fields default to empty (the feed stays on the
dollar leg until you paste the Angel credentials). No main merge,
Hostinger deployment or real payment was performed.

### Package contents

```text
api.php        ← v179 core: calibrated premium, mcx-est, last-good, health, GET save
index.html     ← 179 stamps
sw.js          ← 179 stamps (media cache stays v168)
js/app.js      ← 179 stamp + the honest "mcx-est" rate-card label
js/admin.js    ← 179 stamp + the Live Rates → Pipeline health strip
css/v175.css   (cumulative)
css/v174.css   (cumulative)
css/v178.css   (cumulative — the app band)
js/v178.js     (cumulative — the app band)
```

Release handshake and shell asset URLs are **179**; staff follows APP_REL.
The media cache deliberately remains **168** because no media changed.

### What did not change

No admin money/purge code (v176/v177 carried and re-asserted), no new
routes besides the existing `/api/rates` gaining its `health` object,
no customer-facing copy, no media. The old v78 relay's site-side
consumption (`/tick` + `X-Relay-Key`, `/stream?key=`) is unchanged, so
relay v2 is a drop-in behind the same admin fields.

### Verification recorded — executed, on the committed bytes

- **`v179-check.js` 8/8** — lockstep 179 stamps, zero 178 leftovers,
  media untouched, all shipped JS **and the relay** parse cleanly; the
  relay's self-heal surface asserted line by line; **the relay's TOTP
  executed against the RFC 4226/6238 SHA-1 test vectors** (287082,
  081804, 050471, 005924, 279037) — the same algorithm the site's
  api.php enforces; the api premium engine, the honest UI labels and the
  removal of the raw-spot fallback all asserted on the shipped bytes.
- **`v179-php-run.js` 25/25 — production api.php under real PHP 8.3** in
  the isolated fixture: the complete v178/v177 purge+stats regression
  carried over unchanged (proof the 179 re-stamp and the api edits
  disturbed none of it), `/api/version` reporting **179** with a matched
  handshake, plus R01–R08 executing the rates engine end-to-end through
  the public route with seeded spot (deterministic, no external HTTP)
  and MCX driven through the tick file: live MCX wins and **calibrates**;
  MCX down → honest `mcx-est` (settings factor, then the learned factor);
  calibration accumulates (median of the live pairs); both feeds dead →
  last known values hold, nothing invented; a legacy db without the new
  keys cannot crash; the health payload is complete in every state; the
  **RTGS strip quotes on-market with MCX down** — the owner's manual
  calibration, executed away.
- **`v179-relay.js` 7/7 — the real relay.js against a mock Angel
  SmartAPI**: boots with exactly one login whose TOTP the mock verifies;
  resolves the **nearest-expiry** contract out of three candidates;
  `/tick` is key-gated and serves the live shape; SSE `/stream` pushes
  frames to the screens; **a mid-stream failure drops to `backoff` and
  self-heals back to `live`** (the exact "signal is aborted without
  reason" class); a dead session (the 3:30 AM expiry) heals by
  automatic re-login with a fresh valid TOTP; **a killed relay's
  replacement serves the last good tick immediately from disk.**
- **Full belt: 164 executed checks, 0 failures** —
  deployment-approval gate 20, v179 check 8, v179 PHP 25, v179 relay 7,
  v169 pages 25, v169 PHP 28, v168 boundary 39, v168 PHP 12. The v178
  static/PHP suites stay on disk, off the chain (their stamp assertions
  are 178-shaped by design; their regression content is carried and
  re-executed inside `v179-php-run.js` 25/25).
- ZIP integrity (`testzip`), member list (exactly the 9 files,
  root-relative), byte-for-byte member match against the source commit.

**Not verified — stated plainly:** the sandbox cannot reach the live
site or the real Angel One servers; the relay was executed against a
faithful mock (same endpoints, headers and payload shapes, TOTP
verified), and the rates engine against seeded deterministic inputs.
The owner's production Angel credentials, the Render re-deploy and a
physical market-hours observation are the final acceptance. No main
merge, no Hostinger deployment, no real payment.

## Owner-approved live acceptance, still pending

1. Confirm `/api/version` reports **179** with matched index/app/worker
   stamps.
2. Admin → Live Rates: the **Pipeline health** strip is visible. Paste
   the five Angel credentials in Settings → save → the "Angel (site
   direct)" row turns green.
3. During MCX hours: the strip says *MCX official live*, the rate card
   reads **MCX live**, and gold 24K tracks the exchange.
4. **The test that matters:** temporarily make MCX unreachable (or wait
   for market close) → the strip turns amber: *auto-estimating from
   spot × the live-learned premium — nothing to touch*; the rate card
   says **MCX estimate · spot × …(auto-learned)**; the B2B RTGS numbers
   stay on-market. **You touch no rate.**
5. (If you deploy the relay) Render → new service from `cms/relay`,
   six env vars, copy the URL into the three admin fields → the
   *Relay (Render)* row turns green and the board ticks once a second.
6. v178 app band and v177/v176 behaviour unchanged (footer card, purge,
   day book).
