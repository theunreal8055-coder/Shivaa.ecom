# DEPLOY v147 — Truecaller ONE TAP → straight to Cashfree (zero typing)

**Patch:** `shivaa-update-v147.zip` · md5 `5e8e5af76d31aac5bcea7eed761aad4c` ·
5 files — `api.php`, `index.html`, `sw.js`, `js/app.js`, `js/admin.js`
(root layout → `public_html` ROOT).

**sw.js IS in this patch on purpose** — index.html changes with it, and the
lockstep rule forbids shipping a new shell with a worker that still precaches
the old one. They land as a same-version pair, like v146.

**What the customer now experiences:** tap *Continue in the Truecaller app* →
approve in the app → back in the browser the phone field **fills itself** from
Truecaller's server-side callback and the order + Cashfree checkout **open by
themselves** with the address pre-filled. Nothing to type. Typing is the
fallback only (no app installed / "Not now" / a host that swallows the
callback POST).

## 0. BACK UP FIRST (standing rule)
From cPanel File Manager download a copy of `cms/api.php`, `cms/index.html`,
`cms/sw.js`, `cms/js/app.js`, `cms/js/admin.js` — plus
`cms/data/db.json`. The backup made before v146 is still fine; make a fresh
one if the site changed since.

## 1. Upload + verify
1. File Manager → `public_html` → **overwrite** the five paths in the zip
   (js/ files go inside `public_html/js/`).
2. `md5sum shivaa-update-v147.zip` → must equal the line above, or stop.
3. Hard-refresh the storefront once (the new sw.js re-caches on its own).

## 2. TRUECALLER CONSOLE — the step that makes the one tap possible
Truecaller POSTs the verified number to a **Callback URL that is configured in
Truecaller's developer console**, not in our code. If it isn't set to exactly:

```
https://www.shivaa.in/api/auth/truecaller/callback
```

…then the number never reaches us and the page can only fall back to typing
(what happens today). Set it at developer.truecaller.com → your app →
Callback URL. The same exact string is now printed inside
**Admin → Payments → Truecaller card** so you can copy it, and the card has a
**"Check Truecaller connection"** button:

* `Last Truecaller callback` shows a recent timestamp → Truecaller CAN reach
  the site (the v144/v146 failure mode "POST never arrives" is ruled out).
* `Data store writable` = yes → the verified-number store can be written
  (if no: `cms/data` needs 755 with `cms/data/*` 644, owned by the PHP user —
  same fix as db.json).

## 3. Nothing else to configure
* The handshake POST (`flow_invoked`) is now stored too, so the admin doctor
  distinguishes "flow started, no consent" from "nothing reached us".
* The consent POST answers 2xx **before** fetching the profile
  (Truecaller expects a reply within ~3 s — v144's fetch-first could trip
  that). On PHP-FPM `fastcgi_finish_request` is used when present; on
  mod_php it flushes explicitly. Either way the reply is immediate.
* Per-nonce files live in `cms/data/tc-verify/` (atomic, self-pruning, 10-min
  TTL). No DB change, no new tables, no .htaccess change.

## 4. Test on live (2 minutes, from a real Android phone)
1. Storefront → **One-Tap Buy (Truecaller)** on a phone (Android with the app).
2. Tap *Continue in the Truecaller app* → approve in the app.
3. Browser comes back → phone fills itself → the Cashfree sheet opens on its
   own. Pay with UPI → back on site → order status paid.
4. Admin → Orders: the order shows it came from **Truecaller (verified)** and
   the phone matches the SIM.
5. Negative: tap, then "Not now" in the app → after the wait, the page tells
   you and you can type. No stuck button either way.

## 5. What is honest to tell customers (unchanged from before)
* The **phone number** now arrives automatically — but **address, city, pin,
  GSTIN** still come from the customer, because Truecaller shares only the
  number (name too) and Cashfree's address field is Cashfree's own form. The
  numbers, name, phone and address are carried onto Cashfree's checkout page
  — that part was already working and is unchanged.
* A **first-time number on Cashfree** may still ask for a quick verification
  on Cashfree's own page (their rule, one time per number). Not ours, and not
  fixable from our side.
* Desktop browsers use the web-popup flow, which does not push the number back
  — desktop keeps the typed field. (Truecaller's documented behaviour.)

## 6. Rollback
Restore the step-0 backups (all five files) and hard-refresh.
`cms/data/tc-verify/` can stay — old code never reads it.

## 7. QA done before packaging (all in git, rerunnable)
* `tools/mega/smoke/v147-check.js` — 28/28 static checks (all three callback
  shapes honoured, SSRF allowlist, no db-save on the lockless route, order
  override, stamps 147/147/147 in lockstep, no secret-key leak, admin doctor).
* `tools/mega/smoke/v147-php-run.js` — **16/16 REAL PHP EXECUTION** via
  @php-wasm/node (the repo's long-blocked gate is unblocked): handshake stored
  + 200, rejection honoured, malformed → benign, SSRF endpoint refused,
  **verified phone overrides a tampered typed phone in a real order**, guest
  COD/placeholder/price invariants hold, db.json survives.
* `tools/mega/smoke/v147-tc-autobuy.js` — **14/14 jsdom one-tap proof on the
  real storefront shell**: tap → simulated verified callback → the page places
  the order with NOTHING typed and hands off to Cashfree by itself; named
  regression control (the same shell with the auto-fire line stripped places
  no order) proves the gate measures the mechanism.
* Historical gates all green against the **zip overlay** (live tree + exactly
  the 5 packaged files): v113b 32/32 · v117–v122 · v123 14/14 · v124 20/20 ·
  v125 27/27 · v127 27/27 · v139 56/56 · v140 17/17 · v141 5/5 · v142 13/13 ·
  v146 15/15 · pay-audit 10/10.
* `php -l` on api.php: clean.
