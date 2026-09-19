# DEPLOY v148 — Truecaller PATIENCE (the late number still buys in one tap)

**Patch:** `shivaa-update-v148.zip` · md5 `221a807059a121f919f35415f28db617` ·
**4 files** — `api.php`, `index.html`, `sw.js`, `js/app.js` (root layout →
`public_html` ROOT). `admin.js` is deliberately NOT here: unchanged files keep
their stamp (v147) — that is the per-file rule, and it is gated.

## Why this patch exists
The owner's live test: tapped *Verify with Truecaller*, the app showed his
number, he confirmed — the page said “Truecaller is open — tap Continue” and
then **nothing happened**. Only typing the number manually + Make It Yours
reached Cashfree. The live doctor proves what actually happened:
**Truecaller's consent DID reach shivaa.in minutes later** (lastKind=consent
was recorded) — but v147's page stopped waiting after ~40 seconds. The number
arrived after nobody was listening. v147's plumbing (callback, store, order
override, Cashfree hand-off) was fine; the PATIENCE was not.

## What v148 changes
* **The page now waits properly:** 40 s of fast polling, then a quiet watch
  every 3.5 s for up to 9 minutes (Truecaller's own request expires at 10).
  Mid-wait the customer is *offered* the typed number — but the auto-continue
  stays alive: if the verified number lands at minute 2 or minute 8, the page
  still fills itself and opens Cashfree by itself.
* **Walked away mid-wait? Coming back finishes it.** Navigating elsewhere
  stops the watch (no hijacking wherever the customer ended up); returning to
  One-Tap Buy re-attaches to the same verification.
* **Silent failures are loud now:** if Truecaller confirms but our server
  cannot read the number, the page says so and offers “Try Truecaller again”
  with a FRESH request — no more staring at “tap Continue” forever. The
  server's profile-endpoint check was also made tolerant of Truecaller's
  real reply shapes (query strings, bare host) — same security, no refusals.
* **The doctor got two new words:** `lastOk` (1 = a number was actually
  stored, 0 = consent arrived but the read broke) and `lastError` (the
  reason, sanitized).

## 0. BACK UP FIRST (standing rule)
Download the current `cms/api.php`, `cms/index.html`, `cms/sw.js`,
`cms/js/app.js` from File Manager (the v147 copies are the rollback), plus
`cms/data/db.json`.

## 1. Upload + verify
1. Overwrite the FOUR files in `public_html` root (js/ file inside `public_html/js/`).
2. `md5sum shivaa-update-v148.zip` → `221a807059a121f919f35415f28db617`, or stop.
3. Hard-refresh the storefront once; phones re-cache on their own (new sw.js).

## 2. The test that matters (real Android phone, ~2 minutes)
1. Product page → **Buy Now** → One-Tap Buy.
2. Tap *Continue in the Truecaller app* → select/confirm your number in the app
   (take your time — even a couple of minutes is fine now).
3. Return to the browser. The number fills itself, the order places itself,
   Cashfree opens. **This is the flow that previously “did nothing”.**
4. If Cashfree is slow for you, just wait on the page — it keeps watching for
   9 minutes; nothing needs re-tapping.
5. Admin → Payments → Truecaller → *Check Truecaller connection*: after your
   test it should read consent + ok (the new `lastOk` is what “ok” means).

## 3. What did NOT change (so nothing else can regress)
Cashfree hand-off, address pre-fill, guest prepaid-only rules, the server-side
verified-phone override, the console Callback URL (already set and proven
reachable), typing as the manual fallback, desktop behaviour (typed field —
Truecaller's documented design).

## 4. Rollback
Restore the four v147 files from step 0 and hard-refresh. Nothing in the data
dir needs undoing (the store format did not change; v147 simply ignores the
new 'failed' marker).

## 5. QA done before packaging (all in git, rerunnable)
* NEW `v148-tc-patience.js` — jsdom on the REAL shell: **16/16** incl. the
  late-consent-still-buys case, re-attach after navigating away, loud
  failed-retry — and a **named control** reproducing v147's give-up, which
  places NOTHING (proof the gate measures the patience itself).
* `v147-php-run.js` — real PHP execution now **20/20** (4 new cases: endpoint
  with query string accepted, bare host accepted, look-alike host STILL
  refused, failed state + doctor fields on the wire).
* `v147-tc-autobuy.js` 14/14 (original one-tap untouched by v148) ·
  `v148-check.js` 20/20 static · ALL 18 historical suites green **against the
  zip overlay** (live v147 + exactly the 4 packaged files) · pay-audit 10/10
  invariants · php -l clean.
