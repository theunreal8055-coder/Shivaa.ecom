# AGENT HANDOFF — read this first, every new chat (updated 18 Sep 2026 — ✅ PAYMENT CORRECTNESS PASS MERGED to `main` as PR #69: v135 → v138. Invoice, loyalty points and stock now committed on payment, not at checkout. **Deploy `shivaa-update-v138.zip` only — it supersedes v135/v136/v137.** ⚠ The payment path was never executed — no PHP binary in the sandbox. v127 remains live underneath this.)

**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

## ✅ NEWEST — v135 → v138 PAYMENT CORRECTNESS PASS — MERGED to `main` (18 Sep 2026, PR #69, branch `arena/01a0b25e-shivaa-ecom`)

**Owner's report that started it:** *"even if someone does not pay and comes back
silently then Shiva automatically issues invoices against but the right thing to be
done is when a customer pace then only we should issue invoice."* It had **not** been
fixed and was in **no** prior audit — it became finding **#25**. Chasing it found the
same defect class twice more: **loyalty points (#16)** and **reserved stock (#26)**.

**The unifying lesson — now a standing review question for this codebase:** whenever
anything is granted, deducted or reserved, ask *"what happens to it if the purchase
never completes?"*

### What shipped

| Release | Commit | Fix |
|---|---|---|
| v135 | `b95ec74` | 13 payment findings from the Part-2 audit |
| v136 | `b1a47e9` | GST Tax Invoice issued on `Paid`, not at checkout |
| v137 | `4eefb91` | Points earned on `Paid`, clawed back on full refund, restored on cancel |
| v137.1 | `73df782` | **Fix to v137** — double-earn hazard on pre-existing orders |
| v138 | `abae753` | Reserved stock returned on cancellation |

Plus `c61498b` (the shell pointed at `/js/app.js?v=133`, a file that does not exist in
`cms/js`, so `cms/` could not boot), `4b1624d` + `74c8cc1` (the audit and its gate),
and `a3d4c0c` / `13fa83e` / `fec5e9c` (audit notes).

### 🔴 The lesson that matters most

**Deferring a side effect creates a migration hazard on the rows that already exist.**
Moving point-*earning* from creation to `Paid` meant every order already in the
database — which had banked its points at creation and carried no marker — could be
credited **a second time** when later marked Paid. Guarding on the *new* flag alone is
not enough. The fix: **stamp an explicit marker at creation (`pointsDeferred`) and make
the new helper refuse to act without it.** Found in self-review, shipped as v137.1
before the owner ever saw v137.

Second: **a rebuilt fix invalidates the zip you already handed over.** The first v137
zip predated that fix and would have deployed the bug. After any post-build edit,
**grep inside the zip for the fix marker and re-publish the md5.**

### Deploy

**`shivaa-update-v138.zip` — md5 `e3e48f6ad116b7bbaaaffc381f32c948`, 5 files, stamps
138/138/138**, root layout into `public_html` ROOT. Verified a **strict superset** of
v135+v136+v137 by diffing every fix marker across all four zips. **Deploy v138 only and
delete the other three.** `boost.js` deliberately stays `?v=134`.

### ⚠ Four things the next agent must not get wrong

1. **No PHP binary exists in the sandbox — nothing was executed.** The `php-parser`
   check is clean (125 top-level nodes, proven against a broken negative control) but a
   parse check is **not** a run. No `php -l`, no 211-route php-sweep, **no payment path
   exercised.** Do not retry obtaining PHP — apt unreachable, asset hosts blocked,
   `@php-wasm/node` throws `PHPLoader.processId must be set before init`. **A live
   Cashfree sandbox test is still owed before this is trusted with real money.**
2. **`.htaccess` is EXCLUDED from the Hostinger auto-sync.** This release tightens the
   CSP there (drops the PayU hosts v128 deleted and a stale `*.onrender.com` relay), so
   **that fix ships only via the zip, never via auto-deploy.** Safe to drop: nothing in
   `cms/` calls PayU any more and `angelRelayUrl` is unset.
3. **The Hostinger FTP secrets are STILL not set** — all 4 historical runs of
   `hostinger-deploy.yml` failed at preflight with *"Nothing was deployed."* Merging
   PR #69 therefore deployed nothing. **If those secrets are ever added, merging any PR
   touching `cms/**` becomes an unconfirmed live deploy** — the v126 failure mode, one
   secret away.
4. **Finding #27 must not be fixed the easy way.** A lazy expiry sweep cannot run on the
   read path: `shv_wants_write_lock()` returns `false` for `GET`/`HEAD`/`OPTIONS`, so the
   `orders` GET holds no lock and a `db_save()` there writes a stale snapshot back over
   the whole database — reintroducing finding #10. Any sweep must live on a lock-taking
   POST or acquire the lock explicitly and re-read under it. There is no `cron` route and
   no scheduler. **No expiry window has been chosen — do not invent one.**

### Still open — all blocked on the owner, not on code

**#14** settlement reconciliation (live settlement data) · **#27** abandoned-order points
(expiry window) · **#2** receipt email · **#4** EMI · **#5** unpaid-order recovery ·
**#6** Payment Links.

**#2 is NOT blocked on credentials.** `cms/mail.php` is a real working `mail()` mailer —
`shivaa_mail_send()` at :90, `-f<from>` envelope attempt then plain-`mail()` fallback,
header-injection guard, per-IP relay cap; required at `api.php:25`. The blockers are its
**OTP-only `/^\d{4,6}$/` guard at :96** and the owner's wording. **Do not repeat the old
"blocked on mail credentials" claim without opening the file — it was wrong once already.**

### Traps re-confirmed this session

- **Sandbox reset** wipes `/tmp` and `node_modules` **and rewinds local git history to the
  branch point** while leaving the tree intact. Recovery: `git fetch origin <branch>`
  (the default refspec covers only `main`, so the branch has no local tracking ref),
  confirm the tree already equals the remote tip, then `git reset --mixed <remote-tip>`.
  **Never force-push. Always verify a push landed** via `git ls-remote`.
- **Gate allow-lists come in three shapes** — regex alternation `|137)`, quoted array
  `'137']`, **and bounded character class `13[0-7]`**. Bumping to 138 broke 15 assertions
  until all three were found; a single regex sweep misses the third.
- **`\+` in a BRE grep pattern is a quantifier, not a literal `+`** — it made a
  "stock is never restored" scan match the decrement and nearly produced a false finding.
  Verify with python fixed-string matching.
- **A fixed-width `sed` window over a function body lies** — brace-match with python.
- **`grep -c` returning 0 breaks a `&&` chain** and silently truncates the rest of a script.
- **Never build a directory symlink and write through it** — that writes into the real repo.
- **Zip recipe: build from `git diff --name-only <branch-point> -- cms/`, never `HEAD`**,
  else files committed in a prior release silently drop out.
- **`shivaa.in` is unreachable from the sandbox** — no live behaviour is verifiable here.

### Standing owner rules, unchanged

Owner is **non-technical** — talk plainly. **Never fabricate** supplier, payment, courier,
notification, legal, BIS, HUID, GSTIN, certificate or analytics data; no mock success
fallbacks. **Backup before deploy; nothing ships until the owner says so; a repair must
not swap `sw.js`** (rule #3). Rates are **owner-locked** (`premium.gold22 = 398`, anchor
formula). Never hand-edit live `db.json`; products only via API/upsert. Every release
bumps every `?v=` in `cms/index.html` together. **Forward-only history: merge commits,
never squash or rebase onto `main`.**

### Forward baseline from here

**v125 + v127 + v135/v136/v137/v138.** Preserve all of it. The v127 layer still owns the
sidebar and search-palette taps.

---

## ✅ NEWEST — v127 NAVIGATION REPAIR — LIVE + OWNER-VERIFIED (17 Sep 2026, branch `arena/01a0ad8d-shivaa-ecom`)

**Owner's word (17 Sep 2026, verbatim):** *"The version 127 update is working very fine and I
installed it and extracted in public HTML folder and its working fine now."* → **v127 is the
live, owner-confirmed state of shivaa.in.** He extracted `shivaa-update-v127.zip` into the
`public_html` ROOT himself; the auto-sync cron was not involved in that install.

**Independently re-checked from the sandbox:** `fetch_page` on `https://shivaa.in/js/v127.js`
returned **HTTP 200 with the full, correct file**. The `<script src="/js/v127.js?v=127">` tag
in the live shell was **not** directly read — the fetch tool strips `<script>` elements — so
that half is inferred from the owner's working buttons, not observed.

**⚠ HOW TO CONFIRM IT IS LIVE — the old trick no longer works.** Reading
`https://shivaa.in/sw.js` will still show `SHELL = 'shivaa-shell-v125'` **and that is
correct, not a failed deploy** — v127 is a repair and deliberately left `sw.js` and the
version triple alone. The live proof is `https://shivaa.in/js/v127.js` returning real
JavaScript, and `<script src="/js/v127.js?v=127" defer>` in the view-source of
`https://shivaa.in/`.

**Forward baseline from here: v125 + v127.** Preserve both. The v127 layer owns the sidebar
and search-palette taps, so anything editing drawer or palette markup must keep `#mainNav`,
`#searchSugg`, `a.sugg-cat` and the `href="#/…"` contract intact, and must re-run
`v127-check.js` (27) alongside the other gates.

### The repair itself

The owner asked for exactly two things and nothing else: the **search-bar category chips**
and **every sidebar row** were landing on the home page instead of their own page. Cause:
`app.js` dismissed the sheet *inside* the click and let the anchor's default action navigate,
while `js/v120.js`'s back-button helper answered a sheet closing with `history.back()` — the
traversal out-raced the navigation (search bar); and the drawer rows never performed a
navigation at all, leaning entirely on the native anchor action (sidebar). Fix: **new
`cms/js/v127.js` + one `<script defer>` line in `cms/index.html`**, loaded last, taking those
taps in the capture phase — `preventDefault()` → arm `window.__shvNavigating` (the flag
`v120.js` already honours) → navigate through the hash itself → *then* close the sheet.
**It is a REPAIR, not a release: `__SHIVAA_REL`/`APP_REL`/`SHELL` all stay 125 and `sw.js` is
NOT in the zip (owner rule #3).** `v117-check.js` carries a documented `NETWORK_ONLY`
allow-list for the one deliberately-unpreached file. Deliverable `shivaa-update-v127.zip`
(2 files, 11 KB) + `DEPLOY-v127.md`. Gates 252/252 on source and on the zip overlay,
php-sweep 211/0. **Owner live-verification pending — do not record it until he reports it.**
Full detail: `HANDOFF.md` → § v127, `MEMORY.md` → Session 2026-09-17 #2.

**v126 contamination check (the owner asked directly; answered with reads, 17 Sep 2026): NO.**
The zip holds 2 files; the string `126` occurs **0 times** in either; no `v126` file exists
under `cms/js/` or `cms/css/`; `git ls-tree -r --name-only origin/main | grep -i 126` is
**empty**, and so is the same command on this branch. The branch changes exactly 2 files
inside `cms/`. `sw.js` / `app.js` / `boost.js` / `boost.css` / `.htaccess` / `api.php` /
`db.json` are untouched and the triple stays **125**. The only "126" left in `cms/` is colour
values (`rgba(228,201,126,…)`) and QR tables in `js/qr.js` — neither is a version reference.

### ✅ STATE — v127 is MERGED to `main` (17 Sep 2026, 05:15 UTC, merge commit `5ed09a5`)

**`main` tip = `5ed09a5`. A new chat branching from `main` sees v127 as the newest, live,
owner-verified state — no recovery step is needed.** The owner was asked directly and chose
to merge; it was a fast-forward from `4be9a54`, so no conflicts were possible.

The PR had been held back earlier because merging fires the Hostinger auto-sync cron within
~5 min and would have deployed `cms/` before the owner took his `public_html` backup (owner
rules #1 and #4 — the v126 failure mode). That reason expired when he took his own path:
extracted the zip himself and live-verified it. By merge time `main`'s `cms/` was
byte-identical to what was already live, so the cron re-deploys the same two files — a no-op
for the shopper. It excludes `data/` and `uploads/`, so the live DB and media are untouched.
(The cron has failed silently once before, v119/PR #45; if it does not fire, nothing is lost.)

Verified after the merge by reading `origin/main`, not assumed: `cms/js/v127.js` present
(8465 bytes) · `cms/index.html` references `/js/v127.js?v=127` (1×) ·
`shivaa-update-v127.zip` present (10896 bytes, md5 `a3bc6214eaff1b19f43a6da9465966c0`) ·
`git diff origin/main HEAD -- cms/` **empty** · `git ls-tree -r --name-only origin/main |
grep -i 126` still **empty**.

Gates, re-run on the shipped zip's own contents: **252/252** (v113b 32 · v117 27 · v118 18 ·
v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · v127 27) + php-sweep
**211 routes · 0 exceptions**.

**Still open, deliberately untouched:** `js/v120.js` stores `openHash[id] = location.hash`,
which is the empty string on a bare `shivaa.in/` visit — falsy — so on the home page the
close branch never runs and *every* class mutation while a sheet is open pushes another
history entry (instrumented: 2 pushStates for one drawer open). It pollutes the Back button;
it does not bounce navigation. Fixing it means editing `v120.js` — **ask the owner first.**

## CURRENT FORWARD BASELINE — v124 (16 Sep 2026)

The storefront baseline is **v124** — the v119 baseline plus the v120 bug-fix/mobile pack, the v121 smoothness pack, the v122 B2B design desk, the v123 category-photo refresh and the v124 slider faces (Punach + New In). **v123's provenance (restored this session after its own doc commits were lost):** merged as PR **#48**, merge commit **`bfc3908`** on `main`, and **owner live-verified on 16 Sep 2026 — `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`** (owner-reported; the sandbox has no route to shivaa.in). Deliverables: `shivaa-update-v123.zip` (22 files) + `DEPLOY-v123.md`, then `shivaa-update-v124.zip` (7 files) + `DEPLOY-v124.md`. v124's merge/live record is the newest entry in `HANDOFF.md`'s session step log. **Everything v119 and v118 guarantee still stands** (see the lists below) and must not be reverted.

- **Slider faces (v124):** 18 faces live in `cms/images/categories/` — the 17 `CATS` keys plus `newin.jpg`, which the New In chip now uses instead of borrowing `/images/products/mangalsutra-modern.jpg` (product imagery is never category art). `punach.jpg` is the owner's kundan-kada photo (`ponchi-500x500.jpg`), which retired the v123 "forced leftover fit" tile. Every face is 420×420 q82, cropped centred on the trimmed content box so the round tile crop cannot clip a piece. **A bump must sweep BOTH `?v=` and the `&v=` branch** of the tile URL builder — a `?v=`-only sweep silently leaves half the tiles on the old stamp.

- **Category tiles (v123):** all 17 homepage/shop category-slider tiles are the owner's own photographs, AI-cleaned (third-party watermarks / ad text removed — NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), 420×420, centred circle-crop-safe, in `cms/images/categories/`. Never re-publish the v113b placeholder art. Owner-source jpgs for every tile live at the repo root and map 1:1 onto the `CATS` keys (see `MEMORY.md` → *Mapping (for swaps)*); `punach` currently carries the delicate leaf-chain set, the one forced fit the owner may swap on a word.
- **Version triple:** `__SHIVAA_REL` / `APP_REL` / SW `SHELL` are all **124**, all six category-photo render sites + the pre-boot `v116` list carry `?v=124` (and `&v=124` in the already-queried branch), and the SW precache pins `app.js?v=124` + `v116.js?v=124`. The media cache intentionally stays `shivaa-media-v120`. Any new release bumps **all of them together** and makes the older suites forward-compatible (house pattern) rather than editing them down.
- **v120 pack:** rates page patches values in place (no more blank-white page, alert typing survives a poll tick); every category photo has the logo→hide fallback plus the monogram underlay, so a tile can never render as bare text; tap haptics; back button owns search/modals/drawers; safe-area + `dvh` + 16 px inputs mobile CSS. Suite `tools/mega/smoke/v120-check.js` (24).
- **v121 pack:** phone-sized hero banner (`poster-heritage-m.jpg`, srcset + matching head preload), cards drop permanent GPU layers + `content-visibility` on phones, banner shine repaints only on the visible slide, tickers rest while the tab is hidden. Media cache deliberately stays `shivaa-media-v120` (no gratuitous purge). Suite (14).
- **v122 pack:** B2B design desk `#/catalogues` — name/SKU search (debounced, persisted) + 5-way sort incl. selected-first; sticky bill bar gated on the top total; second gallery shots load near-view only; card-photo logo fallback; wishlist crash guard; honest empty-catalogue note. Billing math verified byte-identical. Suite (22).
- **Rates:** untouched since v119 — `premium.gold22 = 398` and the anchor formula are **owner-locked**; `api.php`, `.htaccess` and `db.json` shipped in **none** of the v120–v123 zips.
- **Catalogue:** master PGS set is **77** rings (the 65 signature rings + Ladies-67 tranche 1, PGS5066–5077, via PR #46); each still carries four images.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · `v119-check.js` (27) · `v120-check.js` (24) · `v121-check.js` (14) · `v122-check.js` (22) · `v123-check.js` (14) · **`v124-check.js` (20)** · php-sweep (211/0) · catalogue 77 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php` whenever it changes.
- **Deploy caution:** the auto-sync cron did **not** fire for PR #45; never trust push-to-deploy until a merge is seen reaching shivaa.in on its own. The zip extracted into `public_html` ROOT is the fast path; `main` is the durable one.

## Earlier baseline — v123 (16 Sep 2026)

The baseline was **v123** — 17 real AI-cleaned owner tiles + `?v=123`; merged as **PR #48 (`bfc3908`)**, owner live-verified 16 Sep (`sw.js` = `shivaa-shell-v123`). Nothing in v124 reverts it: v124 only retook the `punach` face and gave the New In chip its own.

## Earlier baseline — v119 (15 Sep 2026)

The baseline was **v119** — the v118 baseline plus the owner-locked rate decision and the first-paint/mobile pack. Deliverable `shivaa-update-v119.zip` (10 files, root layout). **Everything v118 guarantees still stands** (see the v118 list below) and must not be reverted.

- **Rates (owner-locked, do not change the numbers):** the 22K retail premium is **₹398/g, desk physical** (`settings.gold22Premium`, default 398, admin-editable). `/api/rates` publishes `premium.gold22` **and** `anchorLevel {mode, goldPerG, silverPerG, …}`, and `jaipur.gold22` is derived from that one anchor: `round(anchorLevel.goldPerG × 0.9167) + 398`. The 24K/18K lines keep `jaipurPremium` (55) and an admin override still wins. Every 22K piece is ₹343/g dearer than v118.
- **First paint:** `index.html` ships a skeleton inside `<main id="view">` and `skeleton → body.shv-ready` retires it.
- **Shop slices:** the grid renders 20 cards at a time and grows through `#shopSentinel` (IntersectionObserver) — the filtered list is still computed whole.
- **HUID chip (honesty rule applies):** the PDP chip prints a HUID **only** when the catalogue carries one (`p.huid` or `hallmark.entries[].huid`); otherwise it is a labelled *HUID check* guide linking to the BIS Care walkthrough. Never invent a HUID.
- **Install chip:** appears from the **second visit** onward, only when the browser fires `beforeinstallprompt`; Close is remembered per device.
- **Pinch zoom:** Quick View photo zooms 1×–4× with two fingers without swiping shots; double-tap/pan unchanged.
- **.htaccess:** brotli (guarded) + `immutable` caching for `?v=` assets; deflate kept. **Merge, never blind-overwrite** if panel rules exist.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · **`v119-check.js` (27)** · php-sweep (211/0) · catalogue 65 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php`.

## Earlier baseline — v118 (15 Sep 2026)

The baseline was **v118**, branch `arena/01a0a48d-shivaa-ecom`, commit `0f699f8`, PR #41, deliverable `shivaa-update-v118.zip`. The owner installed/tested it and reported all fixes working. Preserve it in every future change.

- Product pages reliably navigate all four photos by arrows, button dots and horizontal swipe/drag; pointer capture and vertical-intent handling must remain.
- Quick View opens on captured final `click`, never `pointerup`, and must stay in its modal rather than navigate.
- Category links are key-guarded, same-hash taps redraw, empty categories show the honest cataloguing page, and phone category thumbnails eagerly load with fallback.
- PayU submits only to HTTPS `*.payu.in` through the native form prototype and always retains visible Continue/Try again/Return recovery controls.
- Release handshake and SW shell are 118. Catalogue remains exactly 65 PGS rings with four images each; v118 changed no DB/API/payment keys/orders/customer data.
- Required gates before any later UI release: `v113b-check.js` (32), `v117-check.js` (27), `v118-check.js` (18), PHP sweep (211/0), catalogue 65 + four images each.

**Forward-only law:** do not revert any v118 mechanism, overwrite it with an older ZIP/file, or branch future work from pre-v118 code. Check `ARENA-STATE.md`, `HANDOFF.md`, and `MEMORY.md` for the detailed ledger before starting.

## Current feature work (6 Sep 2026)

Feature 13 **Compare + Shareable Shortlist** is live per owner and must be
preserved. The current task is the owner's 1–21 roadmap, **one feature at a
time**, starting with Feature 1 (BIS hallmark / HUID lookup).

Read [`FEATURE-ROADMAP.md`](FEATURE-ROADMAP.md),
[`FEATURE-01-HUID.md`](FEATURE-01-HUID.md) and
[`FEATURE-02-TRUST.md`](FEATURE-02-TRUST.md).

- **Feature 1 is live**, released via PR #5 (`77d5069`); public status, entrypoint
  and HUID JS confirmed on 6 Sep 2026. Automatic BIS verification is still **not
  connected**. Accepted format and staff references never mean BIS verified.
- **Feature 2 is live**, released via PR #6 (`fad5aca`), with the live API and
  v40 JS/CSS confirmed on 6 Sep 2026. Why Trust Shivaa uses only the existing
  owner-confirmed CIN, UDYAM, address and GSTIN (published in v105).
  Certificates stay empty pending real files. The profile is not a government registry result or product
  certificate.
- Stop after Feature 2. The rest of the original owner list
  is not in this checkout; ask for the exact Feature 3 specification.

Owner rule: **never fabricate supplier, payment, courier, notification, legal,
BIS, HUID, GSTIN, certificate or analytics data.** Existing legacy placeholders
are not evidence that any such integration is live. Do not add mock success
fallbacks. New HUID tests use only labelled temporary QA fixtures and leave the
repository DB untouched.

## FIRST MESSAGE for a new chat (paste this)
> Repo connected. Read `docs/AGENT-HANDOFF.md` fully, run `demo65/status.py`
> (or the current batch folder's), verify state against
> `work/designs.json` + git log, then continue where the ledger stops.
> Admin password for shivaa.in: I'll give when needed (never stored in repo).

## The automation architecture (already live — do not rebuild)
1. **You (agent)**: intake (PDF/photos/info from owner in chat) →
   `pipeline/01_ingest_pdf.py` (crops) → read supplier tags VISUALLY
   (green tags; contact sheets via `demo65/tools/`) → `suppliers/tags.csv`
   (real codes+weights; NEVER invent) → `02_normalize` → shots via
   `generate_image` (10/message cap; reference `media/designs/{SKU}.jpg`;
   **men's styling: worn shots on a man's hand** — owner directive) →
   `04_render_video.py` (720², CRF27, SHIVAA.IN mark) → `05_metadata.py`
   (provider `template`, spec-lock) → **commit + push**.
2. **Owner's Hostinger server (cron, every 5 min)**: `~/auto_sync.php`
   pulls the latest **default branch (main)** from GitHub (PAT tarball),
   then: (a) **auto-deploys `cms/` code** to public_html — excluding `data/`
   and `uploads/`, php -l gate, 1-gen backup in `~/shivaa-deploy-backup/`;
   (b) **auto-uploads** every design with 4 shots + film + meta that isn't in
   `~/shivaa-sync-ledger.json` (media POST /api/media, product upsert by SKU;
   category + `mens`-style tag per owner's section). Config: `~/.shivaa-sync.json`
   (0600). Logs: `~/shivaa-sync.log`. Owner set this up once via
   `deploy/upload_bridge.php` (self-destructed afterwards).
3. Therefore: **push to main (via PR) = goes live within ~5 min.** New chats
   branch from main → see everything; finish work → PR into main → live.

## Branch/PR rules (Arena)
Work on your session branch (`arena/…`); commit+push there every turn
(**media is TRACKED in git — snapshots respect .gitignore, untracked media
dies on sandbox restarts**); open a PR `arena/… → main` and merge at milestones
/ session end so future chats and the sync worker (main) pick it up.

## Sandbox survival kit (restarts happen between turns!)
- Workspace may reset to the branch base: `git fetch origin <branch> &&
  git reset --hard FETCH_HEAD` recovers everything pushed.
- pip + /home/user/tools vanish: `pip3 install --break-system-packages
  imageio-ffmpeg pymupdf`; `mkdir -p /home/user/tools/bin &&
  ln -sf $(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") /home/user/tools/bin/ffmpeg`
- apt is BROKEN (egress); RAR5 via npm `node-unrar-js`; shivaa.in UNREACHABLE
  from sandbox (uploads happen on the server, never from here).
- `generate_image` paths are repo-root-relative.
- ffmpeg-7 quirks already patched in `04_render_video.py` (no drawtext →
  blend-screen watermark; `[0:v]` pad labels).

## Ground-truth rules (owner's law)
Never fabricate weight/purity/price/stones. Weights come only from supplier
tags (visual read; page order is ARBITRARY — verify contiguity, cf.
`demo65/work/page_map.csv`). Unreadable tags → quarantine, ask owner.
Names/SEO copy may be creative. Exemplar live names stay: PGS5001
"Rajkumari", PGS5004 "Mughal Moti".

## Current batch state (demo65, men's rings, 65 SKUs PGS5001–5065)
On branch `arena/01a0768e-shivaa-ecom` (6 Sep 2026): COMPLETE 39/65
(shots+films+meta), SHOTS 156/260, VIDEOS 39/65, META 65/65, CROPS 65/65.
**Rule: never merge a PR containing a shot that failed visual QA** — the
Hostinger auto-uploader reads `main` and would publish it. (First case:
PGS5036 — all 4 shots failed first pass: "AU 750" 18K engraving / pink
stones / brand on box / supplier tag. Reshoot 2nd pass PASSED 4/4, film
re-rendered + frame-verified 6 Sep 2026.)
Queue order = `work/designs.json` order; `status.py` prints next batch
(now: PGS5040, PGS5020, PGS5019 … 26 designs / 104 shots).
Work per turn: ≤10 shots → visual QA each (read back; regenerate failures
within the same 10) → films for completers → commit → push. At 65/65: verify
via owner screenshots (sandbox can't reach site); build
`shivaa-batch65-media.zip` in `deploy/` only if owner asks.

### Shot QA protocol (6 Sep 2026 — from the PGS5036 failures)
Guarded prompts in `demo65/config.json` (no tag / no text / no branding /
stones-as-reference) are MANDATORY for every new shot. After generation, READ
BACK each shot (10/turn) and check: supplier tag · any engraving or text
(purity must be 22K — "AU 750" = 18K is a fail) · brand names/monograms on
boxes · stone colour vs the reference crop. `demo65/tools/tag_scan.py` is a
bright-tag first pass ONLY (misses dark-scene tags — documented failure).
The other 30 completed designs were not re-QA'd; if the owner reports odd
shots on the live site, reshoot that SKU + re-render + re-upload.

### Catalog batch (10–15k images/hr target) — PLANNED, not started
Owner wants the full 3-lakh-design catalogue at 10,000–15,000 images/hr.
Agreed in chat (6 Sep 2026): in-chat `generate_image` (10/turn) can't do that
— it needs a batch job on a VPS calling Replicate directly with parallel
workers + a hard budget cap. Decisions: provider = Replicate; A/B test models
= FLUX.1 schnell (Apache-2.0, ~$0.003/img) vs FLUX.2 pro (~$0.03/img) —
FLUX.1/2 [dev] are EXCLUDED (non-commercial licence; this is a commercial
site); test-first gate = paid A/B on 20 designs before any full run. Owner to
provide: Replicate token (pay-as-you-go), a VPS (or confirm their Hostinger
plan is a VPS), and per supplier drop: weights CSV + photos zip. NOTHING is
built yet (that chat was interrupted); owner's priority = finish demo65 first.

## Site-change requests (features/fixes)
Edit `cms/` on your branch; bump every `?v=` in `cms/index.html` (currently 11 refs) whenever
js/css change; PR → main → cron auto-deploys. NEVER edit live db.json by
hand; products only via API/upsert. Warn owner: hand-edits in hPanel File
Manager get overwritten by the next auto-deploy — changes go through chat.

## Key files
`pipeline/*` stages · `demo65/{config.json,status.py,tools/}` ·
`deploy/{upload_bridge.php,auto_sync.php,UPLOAD-RUNBOOK.md,AUTOMATION.md}` ·
`qa/php_router.php` (isolated PHP QA/read-only preview; never deploy) ·
`qa/preview_shim.py` (older read-only Python shim; does not implement Feature 1) ·
`docs/SESSION-STATE-2026-09-05.md` (history + lessons).
