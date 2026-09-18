# DEPLOY v140 — no more install popup · automatic login for jewellers & customers

**Release:** v140 · branch `arena/01a0b3ff-shivaa-ecom`
**Applies on top of:** v139 (`main` at `5e09532`)
**Deliverable:** `shivaa-update-v140.zip` — root layout, extract into the `public_html` **ROOT**

Everything below came from the owner's reports. Nothing else was touched: no
rate, no price, no product, no order, no customer record, no `db.json`.

---

## What was asked, in plain terms

1. **"A small pop-up at the bottom says *keep shivaa on your home screen*;
   ticking the cross first shifts it aside, then back to centre, and it never
   goes — please remove it completely."** → the install pop-up is **deleted**,
   not hidden. It can never come back.
2. **"When a jeweller logs in or creates his account he should always be
   directed towards the bullion desk."** → a jeweller who signs in, and a
   jeweller who opens the site while still signed in, both land on the live
   Bullion Desk.
3. **"After closing and reopening the browser he should not have to log in
   again … it should be automatic … jewellers check rates 100 times a day."**
   → the login already lasts 30 days; now the site **reads it and goes
   straight to the Bullion Desk on its own**, no password, no taps.
4. **"Retail customers should be saved and taken directly to the home page."**
   → a returning retail customer opens **straight into the home page, already
   signed in** — her session, wishlist and rates are all still there.

---

## What changed under the hood

### 1 · The install pop-up is gone (deleted, not restyled)

The "Keep Shivaa on your home screen" bar lived in `js/v119.js` (it appeared on
the second visit and set `shv_visits` + `shv_install_closed`). It is removed
completely, along with:

* its styles in `css/v119.css` (`#shvInstallChip`),
* its safe-area offset in `css/v120.css`,
* the drawer rule that hid it in `css/v116.css`.

The app is still installable — through the browser's own menu. The site just
never shows its own nagging bar. And the old "A2HS" helper in `js/v109.js`
stays: it only ever explained "Browser menu → Add to Home Screen", which is
instructions, not a pop-up.

**Self-heal:** a phone that still has the old `v119.js` cached could carry a
stale bar for one load. The new `js/v140.js` (loaded last) removes any
`#shvInstallChip` it finds — and it never builds one.

### 2 · Automatic landing (the `welcomeSession` in `app.js`)

On a **fresh open of a bare URL** (the plain address, `#/`, or `#/home`),
exactly once, after the saved login has been checked:

* **a jeweller whose login is still valid → the Bullion Desk** (`#/partner`,
  which opens on the *Bullion Desk* tab, live rates polling),
* **a retail customer whose login is still valid → the home page** (already
  signed in),
* **a signed-out visitor → the normal home page** (it never pops the login
  sheet by itself).

Every typed address and every shared link (a piece, a category, a WhatsApp
cart) is honoured untouched — the automatic landing never overrides a deliberate
destination. A later sign-in in the same tab is handled by the normal
`afterLogin()` flow (jewellers still go straight to the Bullion Desk; retail
customers still go to `#/account` as before).

The 30-day bearer token was **already** the site's session model (issued by
`api.php`, restored by `/api/auth/me` on boot) — this release makes the site
*use* it automatically on the front page instead of parking the jeweller on the
storefront.

### 3 · New v140 switch layer

`js/v140.js` + `css/v140.css` are additive guards only — the landing behaviour
is in `app.js`. Nothing in the new layer can re-route browsing, and it doubles
as the re-stamp marker so any stale layer is busted.

---

## The install pop-up's own words, kept only as a comment

For the record, the pop-up said *"Keep Shivaa on your home screen"* with an
Install button and a ✕. The owner's report on it is preserved verbatim in the
`v119.js` comment block, which now explains **why** it was removed.

---

## Files in the zip (9 + this document)

```
index.html          release stamp 140 · loads css/v140.css + js/v140.js (last)
sw.js               SHELL 'shivaa-shell-v140' · precache updated
js/app.js           APP_REL 140 · welcomeSession landing · install popup logic removed
js/v119.js          install-chip code deleted (the file now holds the skeleton + slow-note only)
css/v119.css        #shvInstallChip styles deleted
css/v120.css        install-chip safe-area rule deleted
css/v116.css        drawer hide-rule for the chip deleted
js/v140.js          NEW — self-heal (strip any cached chip) + landing re-assert
css/v140.css        NEW — additive, safety-scoped
DEPLOY-v140.md      this file
```

`js/v107.js`, `js/v116.js` and `js/v117.js` are **not** in the zip — only their
`?v=` stamp moved to 140 in `index.html`; the files themselves are byte-identical,
and a query string does not change the file that is served.

**Not shipped, deliberately:** `.htaccess` (untouched), `data/db.json`, everything
under `data/` and `uploads/`. `api.php` is **not** in this release — no server
change was needed.

## Install

1. **Back up `public_html` first** (hPanel → Files → Backup, or a one-click tag).
2. Upload `shivaa-update-v140.zip` to the `public_html` **ROOT** and extract
   there, overwriting the files above.
3. Hard-refresh the phone once (the service worker swaps to
   `shivaa-shell-v140` and re-fetches the shell).
4. Check `view-source:https://shivaa.in/` shows `window.__SHIVAA_REL=140;`.

## Manual check after deploy (owner, in two minutes)

1. Open `https://shivaa.in` on a phone as usual — **no bottom pop-up** about the
   home screen appears, on first, second or any visit.
2. Sign in as a jeweller, close the tab, reopen the site → it should open
   **straight on the Bullion Desk**, no password asked.
3. Sign in as a retail customer, close the tab, reopen → it should open
   **straight on the home page**, still signed in.
4. Sign out → it opens on the plain home page (no login sheet popping up).

## Verification (what was actually run)

| Gate | Result |
|---|---|
| `v140-check.js` (new — 9 static · 7 live · 1 control) | **17/17** |
| `v113b` · `v117` · `v118` · `v119` · `v120` · `v121` · `v122` · `v123` · `v124` · `v139` | 32/32 · 27/27 · 19/19 · 27/27 · 24/24 · 14/14 · 22/22 · 14/14 · 20/20 · 56/56 |
| `v125-check.js` | 26/27 — the 1 failure is a past-release scope rule (see below) |
| `v127-check.js` | 26/27 — same (its frozen-v125-triple rule) |
| `pay-audit-check.js` | 2/18 findings still present · 10/10 invariants intact — unchanged from v139 |
| php-sweep | **207 routes · 0 exceptions** |
| `php-parser` parse check on `api.php` | clean, 128 top-level nodes (untouched by v140) |

The v119 gate's two old "install chip appears on the second visit" checks are
**rewritten**, not deleted: they now assert the chip stays absent even when the
browser fires `beforeinstallprompt` on the first and the hundredth visit — that
is the point of this release. The v117/v118/v119/v120/v121/v122/v123/v124/v125/
v139 handshake ranges now accept **140**, exactly as they accepted 139 the
previous release; no scope rule was weakened, only the release number extended.

The 2 remaining failures across v125/v127 are *scope rules written for those
releases* — "the frozen triple must still read 125", "no stale `?v=125` stamp".
They fail for any release above 125 (verified also against the untouched v139
tree) and are left failing rather than watered down.

**What was NOT verified here:** there is no PHP binary in this sandbox, so
`api.php` was not executed (it is untouched by v140 anyway). Whole-browser
"close and reopen" was modelled in jsdom with a seeded 30-day token — which is
exactly what the phone keeps in `localStorage`; an on-device spot check after
deploy is still the final word.
