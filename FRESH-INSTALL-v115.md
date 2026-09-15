# SHIVAA — FRESH INSTALL (v115-FI)

**What this is:** the entire store — every release from **v1 through v115** — packaged so a
blank host becomes a live shop in one extraction and one visit to `/install.php`. Not a
patch, not an overlay: nothing prior has to exist for this to work.

**Built:** 2026-09-15 · from `cms/` at the v115 tip · branch `arena/01a0a32d-shivaa-ecom`
**Bundles:** `shivaa-FRESH-INSTALL-v115.zip` (core, 35.1 MB, 234 files) — committed at the repo root —
and `dist/shivaa-FRESH-MEDIA-v115.zip` (media, 186.6 MB, 373 files — workspace only, past GitHub's
100 MB per-file wall). Integrity: every bundle carries `MANIFEST.txt` (sha1 + byte count per file, re-verified by
`verify.py` G1); `dist/SHA256SUMS.txt` holds the sha256 of both bundles as built.

---

## 1 · Why this exists

v1 → v115 happened as 115 small uploads onto a live Hostinger folder. That is the right way
to run a shop and the wrong way to hand someone a store: to reproduce it you would need
every archive, in order, including the ~60 that were never kept. So this release answers a
different question — *what does the store contain, all at once, on a machine that has never
had Shivaa on it?* — and proves the answer instead of asserting it.

Two things had to be settled first, and both are now tooling in the repo rather than memory:

| Tool | Question it answers |
|---|---|
| `tools/fresh-install/lineage-audit.py` | Is every release still in the tree? Line-audits each surviving archive against `cms/` (53 releases), counts surviving code tags (85 releases), and falls back to the project's own paper trail (4 more). |
| `tools/fresh-install/verify.py` | Is the *bundle* — not the working tree — a working store? 8 gates, incl. booting the unpacked `index.html` in jsdom against the seeded database. |

The audit is what found the three real gaps this release closes (below). It exits non-zero
until every archived file that is *not* in the tree has a written reason, so "we forgot to
carry it forward" can no longer hide inside "we refactored".

## 2 · What the fresh install restores

The audit diffs every archive against the tree; these are the findings that needed code, not prose:

1. **`relay/` — the bullion rate relay (v78–v80) was never in the repo.** It only ever existed
   inside the update zips, so no fresh host could re-deploy the live MCX feed the whole rate
   stack depends on (v112's rate-drift fix included). Restored byte-for-byte from
   `shivaa-update-v80.zip` to `relay/` — at the **repo root**, not in `cms/`, because it deploys
   to Render; `.htaccess` already 403s `/relay/` on the host.
2. **`cms/data/.htaccess` — the DB folder's second lock had gone missing** (it shipped in the
   v51 fresh-install zip and then vanished from the tree). Restored: `Require all denied`.
   The root `.htaccess` denies `^data/`, but that rule does not apply to a **subfolder** install
   (`public_html/cms/`), which is exactly how the v37 instructions told people to extract it.
3. **The v42 Gift Concierge was gone.** `css/gift-concierge.css`, the home-page markup and its
   handlers all disappeared in a later home rewrite. Restored as a v107-style removable layer —
   `cms/css/gift-concierge.css` (v42 file, verbatim, with a v115-FI block appended) +
   `cms/js/gift-concierge.js` (rewritten against the current shell, reading `Shivaa.state.productsCache`
   and pricing through `Shivaa.price`). Proven by `qa/browser/t11-gift-concierge.mjs` → **31/31**.

4. **The upload folders' edge locks were riding in the wrong pack.** `uploads/*/.htaccess`
   (v82/v84 — no execution, no active documents, no listing) sits next to real upload content,
   so a tiered pack put them in the **media** zip: extract the core bundle, run the installer, and
   `uploads/kyc/` — where customer ID proofs land — had no guard at all. The nine lock files now
   ship with the **core** bundle (`make-seed`/`tier_of` rule: a folder's `.htaccess` is a lock, not
   content), `install.php` writes any guard a host is missing, and `verify.py` G4 fails the release
   if either stops being true. Same sweep moved `cms/make_icons.py` out of the web bundle and kept
   customer review photos out of a bundle whose seed carries no reviews.

Deliberately *not* restored (each with its reason in `tools/fresh-install/lineage-adjudications.json`):
`css/home-v43.css` + `css/hallmark-v43.css` (the v43 prototypes on a stale base, re-homed by v44),
`css/v105.css` + `js/v105.js` (mined into the v107 layer, as `FEATURE-LINEAGE.md` records).

## 3 · What ships inside

```
core (shivaa-FRESH-INSTALL-v115.zip)      234 files · 35.1 MB
  index.html · api.php · install.php · admin-reset.php · sw.js · offline.html · .htaccess
  manifest.json · manifest.webmanifest · robots.txt · sitemap.php · sitemap.xml
  hallmark.php · trust.php · sms.php · mail.php · payu.gateway.fixed.php
  css/  15 files — fonts styles hallmark trust finale boost motion aurum mobile
              v107 v108 v113 v115 bot gift-concierge
  js/   17 files — app auth admin bot qr otp-autofill hallmark trust motion aurum boost
              boost-data.json three-d v107 v108 v109 gift-concierge
              (admin.js + qr.js load on demand, so they are not in the SW precache list)
  data/ db.seed.json · .htaccess (Require all denied) · install-open (the once-only fuse)
  images/ 162 — logo · favicon · 5 PWA icons · 17 category faces · 17 banners
              · 24 product shots · the 65 ring covers (one per design)
  uploads/ 15 — the nine .htaccess locks + .gitkeep per folder; install.php mkdirs the rest
  docs/OTP-SETUP-GUIDE.md · INSTALL.txt · MANIFEST.txt (sha1 + bytes per file)
  FRESH-INSTALL-v115.md · VERSION-LINEAGE-v1-v115.md (the audit, so the box ships its proof)

media (shivaa-FRESH-MEDIA-v115.zip)       373 files · 186.6 MB
  images/designs 325 — 260 four-shot gallery frames + 65 ring films
  images/films 9 — hero, craft and story films · images/reviews 6 (real customer photos)
  uploads/ 30 — exemplar catalogue/kyc/trust content
  docs/shivaa-privacy-policy.pdf · INSTALL.txt · MANIFEST.txt
  NO index.html, NO api.php, NO js/, NO css/, NO data/  →  it cannot overwrite an install
```

**Never in any bundle:** the dev host's `data/db.json` (a fresh store must not inherit another
host's customers), `samples-payload.json` and the 340 v111-deleted sample photos.

### The seeded database (`data/db.seed.json`)

Built by `tools/fresh-install/make-seed.py`, regenerated with `--check` in CI:

| kept (your shop) | cleared (people, money, noise) |
|---|---|
| 65 real PGS rings, 4 shots each, OCR-verified weights | `users` `orders` `reviews` `partners` `settlements` |
| store identity: name, legal name, GSTIN/CIN/UDYAM, address, phone | `newsletter` `contactMsgs` `serviceRequests` `rateAlerts` |
| 15 making-charge rules · 4 coupons · 17 B2B catalogue entries | `tokens` `otps` `loginfails` `securityLog` |
| last known Jaipur rates · 12 points of rate history (chart has a shape) | `bullionOrders` `metalOrders` `customOrders` |
| free-shipping threshold, `jaipurPremium`, metal factors, announcements | bullion float (book kept, money zeroed) · SMS counters (`mode: demo`) |

`products[].reviews` counters are reset to match the empty review list, and **no account is
seeded at all** — the admin is the one you type into the installer. Nothing in the seed is
invented: no synthetic customers, no demo orders, no filler reviews.

## 4 · Install

**Hostinger / any shared host (4 minutes)**

1. hPanel → Files → File Manager → `public_html` → upload **core** zip → **Extract**
   (files land directly: `index.html`, `api.php`, `css/`, `js/`, `data/` … no folder to move).
2. Open **`https://your-domain/install.php`**. It shows the host check (PHP ≥ 8.0, `json` +
   `mbstring`, writable `data/` and each `uploads/*`), then asks for four things: owner name,
   admin email, admin mobile, admin password (≥ 10 chars, letters + digits).
3. **Install the store.** It seeds `data/db.json` from `db.seed.json`, creates your admin with a
   `password_hash()` bcrypt sum (the exact scheme `api.php` verifies), creates any missing
   `uploads/*` folder, writes `data/.htaccess` if absent, then **deletes `data/install-open` and
   writes `data/INSTALL.lock`** — the installer is now a 403, at the edge *and* in the PHP.
4. Sign in at `#/admin`. Then delete `install.php` from the server (belt to the braces).
5. Admin → Settings: PayU key + salt, UPI ID, the SMS gateway wizard (v107). Admin → Bullion
   Desk: Angel tokens for live MCX (relay deploy: `relay/RENDER-SETUP.md`).
6. Extract the **media** zip into the same folder when you want the 4-shot galleries, the films,
   the real review photos and the catalogue PDFs. The store is fully usable before that: a missing photo falls back to
   the house monogram and a missing film shows its poster frame (asserted by the behaviour harness).

**SSH instead of a browser** (identical result, no web exposure at all):

```bash
cd public_html
php install.php --check                                    # host report, writes nothing
php install.php --seed --admin-email=you@shop.in \
                --admin-phone=8905005921 --admin-pass='correct horse battery'
php install.php --seed --dry-run …                         # print what it would do
```

**nginx / no AllowOverride:** the rewrites the bundle needs are `/api/(.*) → api.php?__route=$1`,
`/sitemap.xml → sitemap.php`, deny `^data/`, deny `/relay/`, SPA fallback to `index.html`, and —
added by this release — deny `install.php` once `data/INSTALL.lock` exists. `api.php` also refuses
to re-seed when a database is present, so the edge rule is a convenience, not the security.

## 5 · Gates this bundle passed

| gate | result |
|---|---|
| `tools/fresh-install/verify.py` G1–G8 (bundle, not tree) | **PASS** — shell assets 23/23 precached, seed 65 products / 0 users / 0 hashes, installer locks verified |
| `tools/mega/smoke/v113b-check.js` on the **unpacked zip** | **32/32** |
| `tools/mega/php-sweep/sweep.mjs` | **211 routes · 0 exceptions** |
| `qa/browser/t7-audit.mjs` (routes + click sweep, v115 shell) | **PASS 4 / FAIL 0** |
| `qa/browser/t11-gift-concierge.mjs` (the restored v42 layer) | **PASS 31 / FAIL 0** |
| `tools/fresh-install/php-syntax.py` (tree-sitter PHP grammar) | **PASS · 0 problems, 10 files** |
| `tools/fresh-install/php-semantics.py` (scope + call graph) | **PASS** — it caught and fixed a real `global $ROOT;` miss in `install.php` |
| `tools/fresh-install/lineage-audit.py` | **exit 0** — no archived file unexplained |

*Honest limit:* there is no `php` binary in this sandbox, so `install.php` was verified by
grammar parse, scope analysis and the bundle gates — **not by execution**. `php install.php --check`
on the host is the first thing to run, and every step it performs is also what the PHP refuses to
redo if a database already exists.

## 6 · Rebuild

```bash
python3 tools/fresh-install/make-seed.py            # cms/data/db.seed.json ← cms/data/db.json
python3 tools/fresh-install/lineage-audit.py        # docs/VERSION-LINEAGE-v1-v115.md + ledger
python3 tools/fresh-install/build.py                # dist/ core + media zips
python3 tools/fresh-install/verify.py               # G1–G8 + jsdom behaviour on the bundle
python3 tools/fresh-install/build.py --tier all     # one 220 MB zip (workspace only, GitHub refuses >100 MB)
```

`dist/` is gitignored on purpose: bundles are generated, and the media pack is past the
100 MB per-file wall anyway. `MANIFEST.txt` + `SHA256SUMS.txt` inside/next to each bundle are
the integrity record (G1 re-verifies every sha1).

## 7 · Rollback / uninstall

Delete `data/db.json` + `data/INSTALL.lock` → the folder is an uninstalled bundle again.
To drop just the restored layer: delete the `css/gift-concierge.css` + `js/gift-concierge.js`
tags in `index.html` and their two lines in `sw.js` → the store is plain v115.
Nothing in this release touched `api.php`, `js/app.js`, `css/v115.css` or the storefront's
`window.__SHIVAA_REL` — the v115 release identity is byte-identical (verified against
`shivaa-update-v115.zip`: `api.php`, `js/app.js`, `css/v115.css` identical; `index.html` and
`sw.js` differ only by the 5 added layer lines).
