# DEPLOY v183 — the Play Store release (Digital Asset Links + in-app account erasure)

**Release:** 183 · **Built:** 9 Oct 2026 · **Live before this runs:** 181 (owner-deployed, verified)
**Status:** built + gated; **deploy only after the owner's explicit yes**
**Source commit:** `295c2a68bf0f6d9a66a4af32d6f017c660cefd68` · **Prerequisite:** live **v181 or newer**

**In one line:** Shivaa becomes an app on Google Play as a Trusted Web Activity of
`shivaa.in` — so the website ships the Digital Asset Links file that proves the
app owns the domain, a `.htaccess` guard that lets Google actually read it, a
stable web-manifest identity, and the **in-app account deletion** that Play's User
Data policy requires. The launch kit, the build config and the paste-ready
listing copy are in `playstore/`.

> **Read `playstore/README.md` first — it is the whole plan, in order, with the
> two gates that decide whether a public launch today is even possible.**

---

## Package

**File:** `shivaa-update-v183.zip`
**Size:** 463,159 bytes · **SHA-256:**
`e05f3146e1f7f6329bf984a598f35054ab91dca1ed0699bb51c796c0e9940670`
**Layout:** root of the ZIP = overwrite into `public_html/` (same as v165+).
**11 files** — a **superset of v182**, because live is still 181:

| File | Bytes | What changed vs v182 |
|---|---:|---|
| `api.php` | 510,977 | `POST /api/auth/delete-account` (throttled, OTP- or session-proven, `DELETE`-confirmed, admin/partner protected, anonymising, token-revoking, audited) · rel 183 |
| `js/app.js` | 657,325 | "Privacy & my data" page (`#/delete-account`) + a danger tile on the account screen · `APP_REL = 183` |
| `index.html` | 31,412 | stamps → 183 (56× `?v=183`, `__SHIVAA_REL=183`) |
| `js/admin.js` | 323,235 | unchanged content (carried so 181→183 is one extract) |
| `sw.js` | 13,500 | SHELL/REL 183, 51× `?v=183`, MEDIA stays `shivaa-media-v168` |
| `upgrade-sql.php` | 32,849 | unchanged (idempotent — safe to re-run) |
| `manifest.json` | 1,457 | **new `"id": "/"`** — one identity for the PWA and the Play app |
| `manifest.webmanifest` | 1,457 | same |
| `sitemap.php` | 4,861 | lists `/#/delete-account` |
| `.well-known/assetlinks.json` | 307 | **new** — Digital Asset Links (fingerprints ship as placeholders) |
| `.well-known/.htaccess` | 876 | **new** — `Require all granted`, so the parent's `*.json` deny rule cannot 403 Google |

Not packaged (never are): `.htaccess` (host-managed), `data/`, `uploads/`,
`config.php`, `setup-mysql.php`, billing files, the keystore.

---

## Before you start

1. **Full `public_html` backup** from hPanel (Files → Backups).
2. Confirm live is 181+: `https://shivaa.in/api/version` → `"rel": 181`.
3. Have your **CMS admin password** ready for `upgrade-sql.php`.
4. Read `playstore/README.md` and settle **Gate 1** (what kind of Play Console
   account this is) *before* you build anything.

---

## Install (extract — 2 minutes)

1. Download `shivaa-update-v183.zip`.
2. hPanel → File Manager → `public_html/` → **Upload** the ZIP → **Extract** it
   there, allowing overwrite. The ZIP is root-relative: `.well-known/` lands at
   `public_html/.well-known/`.
3. Open **`https://shivaa.in/upgrade-sql.php`**, enter your CMS admin password,
   press **Run** (it is idempotent — safe even if v182's run already happened).
4. `https://shivaa.in/api/version` → expect `"rel": 183` with
   `"stamp": { "matched": true, "index": 183, "app": 183, "sw": 183 }`.

### Confirm the file Google actually fetches

```bash
curl -s https://shivaa.in/.well-known/assetlinks.json
```

It must return the JSON, **not** a 403 and not your site's HTML. If it 403s, the
`.htaccess` in `.well-known/` did not land — paste the block from
`playstore/htaccess-wellknown.txt` at the very end of the site's `.htaccess`.

---

## Then: the two fingerprints (this is the step that makes it an app)

Everything else in the app works without this. **This** is what turns the app
from "a browser tab in a window" into "a full-screen app that owns shivaa.in".

1. Create the upload keystore on a machine you control — **and back it up
   twice, offline**. Lose it and the app can never be updated again:
   ```bash
   keytool -genkeypair -v -keystore shivaa-upload-key.keystore \
     -alias shivaa -keyalg RSA -keysize 2048 -validity 10000
   ```
2. `cd ~/shivaa-twa && cp <repo>/playstore/twa-manifest.json . && cp shivaa-upload-key.keystore .`
3. `bubblewrap fingerprint` → copy the SHA-256 it prints.
4. Paste it into **both** `playstore/assetlinks.json` and
   `cms/.well-known/assetlinks.json` — replace
   `REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT`.
5. When you create the app in Play Console, choose **Play App Signing**; Google
   then shows a second SHA-256. Paste that into
   `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` in both files.
6. Re-upload the two files (or re-extract the ZIP) and re-run the `curl` above.

**Recommended order to avoid a second upload:** do steps 1–5 *before* the first
extract, rebuild the ZIP with `python3 tools/mega/make-v183-zip.py`, then extract
once. `bubblewrap build` reads the manifest and icons from the live site, which
already serves them, so the bundle can be built before v183 is deployed.

---

## Using the new "Privacy & my data" page

`#/delete-account` — reachable from **Account → Privacy and my data**, and the
URL Play Console is given as the account-deletion link.

1. The page says plainly what erasing does and does not do.
2. **Send code** → a 4-digit code to the registered mobile (same OTP engine as
   login, same 5-minute window).
3. Type **DELETE**, confirm.
4. The account is anonymised at once, every device signed out, the code burned.

Orders, invoices and KYC records survive — the privacy policy's own section 6
promises tax and PMLA retention, so the app must not pretend otherwise. The
owner account and B2B partner accounts refuse self-erasure.

---

## Verify (3 minutes)

1. `https://shivaa.in/api/version` → `rel: 183`, `stamp.matched: true`,
   `db.mode` still `mysql`.
2. `curl -s https://shivaa.in/.well-known/assetlinks.json` → JSON, HTTP 200.
3. `https://shivaa.in/#/delete-account` → the page opens, "Send code" works.
4. `https://shivaa.in/#/privacy` → unchanged.
5. `node playstore/verify.mjs` → exit **0** (exit **2** while it is still waiting
   on the fingerprints or the phone screenshots).
6. In a browser, open the site and check the footer band still behaves (it must
   **not** appear inside the installed app — that is the v140/v178 law).

---

## Rollback

- Restore the `public_html` backup taken before extracting. The two new folders
  are additive, so removing them returns the site to its v181 behaviour.
- Nothing in this release changes a route a shopper uses, the catalogue, money
  code or orders. The only behavioural addition is the erasure page.
- Never deploy an older tree over this one. **Forward only from 183.**

---

## What was verified, and what was NOT

**Executed, on the shipped ZIP bytes** (extracted into an isolated tree and run
with `SMOKE_CMS`):

- `v183-check.js` **9/9** — lockstep 183 stamps across all four sites, 56 `?v=183`
  in `index.html` and 51 in `sw.js`, zero 182/181 leftovers, MEDIA untouched;
  both manifests carry `id`/maskable/512 and are byte-identical; assetlinks is a
  well-formed 1-element delegation whose package name matches
  `twa-manifest.json`; `.well-known/.htaccess` grants what the parent denies; the
  launch kit exists, is internally consistent and carries no credential; no
  keystore or generated Android project is tracked in git; the erasure route and
  page are present and wired.
- `v183-php-run.js` **9/9** (real PHP 8.3) — the erasure route's actual
  behaviour: anonymous/unproven requests refused, the session path, the OTP path
  (with a code exactly as `/auth/send-otp` writes it), the confirmation word,
  protected admin and partner roles, per-connection and per-number throttling,
  an expired code, and byte-identical answers for "wrong code" vs "no such
  number" so the route cannot enumerate accounts.
- `v182-php-run.js` 9/9 · `v169-php-run.js` 28/28 · `v168-php-run.js` N40 12/12,
  all re-run against the **extracted** bytes — v183 disturbs none of the v182
  catalogue, billing-bridge or v169/v168 behaviour.
- Belt: **190 checks passing** (deploy gate 20 · v183-check 9 · v183-php-run 9 ·
  v182-php 9 · v181-php 6 · v180-php 8 · v179-php 25 · v169 pages 25 · v169 PHP
  28 · v168 boundaries 39 + N40 12).

**NOT verified — state this plainly:**

- **No AAB was built or signed.** The build sandbox has no JDK, no Android SDK
  and no route to `dl.google.com`; `bubblewrap build` runs on the owner's machine
  (`playstore/README.md` step 4).
- **No live site was probed.** The sandbox cannot reach `shivaa.in`. Every
  `curl` above is the owner's to run.
- **No phone screenshot was captured or invented.** `make-graphics.py` refuses
  to fabricate app UI and says so instead — see
  `playstore/screenshots/CAPTURE.md`.
- **Google's own app-link verification and Play's review have not run.** Nothing
  here proves Google will accept the link or the listing.
- **The real Cashfree payment inside a Trusted Web Activity is untested.** It is
  the highest-risk part of a TWA and must be tested on a real phone before any
  public release (`playstore/CHECKLIST.md` step G).
- **v179-relay fails 7/7 in this sandbox, identically on the pristine HEAD tree**
  (verified with a clean worktree). Pre-existing and unrelated to v183 — the
  relay is not deployed and the site no longer depends on it.

No main merge, no Hostinger deployment, no real payment was performed.
