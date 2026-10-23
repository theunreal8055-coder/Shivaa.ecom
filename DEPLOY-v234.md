# DEPLOY-v234.md — Shivaa Ecom · v234 "The Desk App"

**Deploy this one.** It contains v233 (the passbook you already applied) plus the
release you asked for: the bullion desk as a real application on a PC **and** on
Android, and a desk that can account for the metal it trades.

**What you said:**
*"Make the bullion application for PC as well as for Android more compatible and
operational."*

**Status: packaged 23 Oct 2026 — NOT deployed.** Nothing goes live without your
explicit yes. The build you applied is **v233** (23 Oct 2026). Gate:
**25 checks, 0 red**. The package is exactly `shivaa-update-v234.zip` —
**366 files · 37,416,420 bytes** — sha256
`16adae14b9745f5d0560145775221d329ab304c1c688d64244885726585e1b84`.
`python3 qa/check-handoff.py` proves tree ⟷ zip ⟷ docs agree.

**Next release: v235.** Rollback is v233 (the previous row in
`docs/release-ledger.json`).

---

## 1 · It is an app now, on both platforms

| | v233 (what is live) | v234 |
|---|---|---|
| where the desk lives | a page inside the shop (`#/partner`) | its own page `/desk.html` + an **installed app** |
| install | none | Android Chrome: **Install app**; iPhone: Share → Add to Home Screen; PC: Chrome/Edge → Install |
| what opens | the shop, then the desk | the board, first screen, no shop around it |
| app icon / window | — | `Shivaa Desk`, standalone window, no browser bar, any orientation |
| shortcuts | — | long-press the icon: **Rates · Quote · Day book · Deals** |
| PC layout | one narrow column | from 1000 px a counter layout; from 1500 px the quote rail sits beside the board |
| keyboard | none | `1–4` tabs · `C` quote · `B` day book · `R` refresh · `F` full screen · `P` print · `?` the map |
| Android | — | 44 px targets, notch-safe, pull-to-refresh, keep-screen-on, share a quote or a slip |

**How a jeweller installs it:** open **`https://shivaa.in/desk.html`** on the phone
and tap **Install the desk** — or on a PC open the same page in Chrome/Edge and
choose **Install app**. The shop app and the desk app are separate icons and
separate windows.

**Cost to shoppers: zero.** `index.html` does not load one byte of v234's desk
code; the desk runtime is only on `/desk.html`, and the CSS that hides the shop
chrome is scoped to `html.shv-desk`.

---

## 2 · It can account for the metal now

A quote was a price. This adds the paperwork a counter actually keeps.

| | v233 | v234 |
|---|---|---|
| delivery | one status dropdown | **settle in tranches**: 40 g today, 60 g tomorrow → **two numbered slips**, one order at 100 g (never 200) |
| slip | none | **`DS261023-0001`** — grams, fine grams, rate, value, TCS, who signed, printable (80 mm) and shareable |
| mistakes | — | over-settling refused with the grams still open; cancel only while **no metal has moved**, with a reason on the record; another jeweller's deal refused |
| the day | nothing | **day book**: bought/sold grams, fine grams, value, TCS, settled grams + slips, open grams/value, mark-to-market — screen, CSV, print |
| the board | best row per metal | plus **₹ per fine gram and a ★ on every row**, and a **My metals** filter (pinned per partner) |
| exposure | open deals + MTM | settled grams separated from open grams, so the number means what is still at risk |

The day book uses the **server's** date — a phone set to another timezone cannot
move today's totals.

---

## 3 · What is in the package

366 files — v233's 362 plus **`desk.html`**, **`desk.webmanifest`**,
**`js/v234.js`** and **`css/v234.css`**. The stylesheet is inside the one bundle
(now **68 layers**, 934,114 B raw / 183,810 B gzipped — still **one** request).
`desk.html` is **generated** from `index.html` by `tools/build-desk-shell.py`;
the gate runs `--check`, so the two can never drift.

Not in the package, ever: `data/db.json`, the root `.htaccess`, `config.php`,
uploads.

---

## 4 · Install

1. Back up `data/db.json` (deals, slips and quotes live in it).
2. Upload `shivaa-update-v234.zip` over the site root, overwriting.
3. Hard-refresh once; the service worker moves the tab to `shivaa-shell-v234`.
4. Verify: `https://shivaa.in/api/version` must read `rel: 234` and
   `stamp.matched: true`.
5. Open `https://shivaa.in/desk.html` as a jeweller and check: the board is the
   first screen; every row shows a fine price; **Install the desk** appears; the
   day book opens; a 20 g deal can be settled in two tranches with two slip
   numbers.

**Rollback:** re-upload `shivaa-update-v233.zip`. v234 changes no database shape
— slips live in their own array and orders only gain `settlements`,
`settledGrams` and `purity` — so a rollback loses no records.

---

## 5 · What could not be checked here

- **A real phone and a real PC.** Everything was measured in jsdom
  (`qa/browser/t-v234-desk.mjs`, 111 assertions) plus the gate (25 checks, 0 red).
  The install prompt, the wake lock, full screen and pull-to-refresh are
  feature-detected and cannot be exercised in this sandbox — they were not run on
  a handset.
- **PHP.** No PHP binary here: `api.php` is checked with `qa/phpbal.py` (balanced)
  and mirrored in `qa/preview_shim.py`, which the suite drives over real HTTP.
  The PHP itself has not been executed.
- **Your live database and real partner accounts.**
- **Play Store**: `playstore/verify.mjs` still exits 2 by design (fingerprints
  are placeholders, unrelated to this release).
