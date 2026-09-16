# AGENT HANDOFF — read this first, every new chat (updated 16 Sep 2026)

**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

## CURRENT FORWARD BASELINE — v123 (16 Sep 2026)

The storefront baseline is **v123** — the v119 baseline plus the v120 bug-fix/mobile pack, the v121 smoothness pack, the v122 B2B design desk, and the v123 category-photo refresh. **It is merged and live:** PR **#48**, merge commit **`bfc3908`** on `main`, and the **owner live-verified it on 16 Sep 2026 — `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`.** Deliverable `shivaa-update-v123.zip` (22 files, root layout) + `DEPLOY-v123.md`. **Everything v119 and v118 guarantee still stands** (see the lists below) and must not be reverted.

- **Category tiles (v123):** all 17 homepage/shop category-slider tiles are the owner's own photographs, AI-cleaned (third-party watermarks / ad text removed — NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), 420×420, centred circle-crop-safe, in `cms/images/categories/`. Never re-publish the v113b placeholder art. Owner-source jpgs for every tile live at the repo root and map 1:1 onto the `CATS` keys (see `MEMORY.md` → *Mapping (for swaps)*); `punach` currently carries the delicate leaf-chain set, the one forced fit the owner may swap on a word.
- **Version triple:** `__SHIVAA_REL` / `APP_REL` / SW `SHELL` are all **123**, all six category-photo render sites + the pre-boot `v116` list carry `?v=123`, and the SW precache pins `app.js?v=123` + `v116.js?v=123`. Any new release bumps **all of them together** and makes the older suites forward-compatible (house pattern) rather than editing them down.
- **v120 pack:** rates page patches values in place (no more blank-white page, alert typing survives a poll tick); every category photo has the logo→hide fallback plus the monogram underlay, so a tile can never render as bare text; tap haptics; back button owns search/modals/drawers; safe-area + `dvh` + 16 px inputs mobile CSS. Suite `tools/mega/smoke/v120-check.js` (24).
- **v121 pack:** phone-sized hero banner (`poster-heritage-m.jpg`, srcset + matching head preload), cards drop permanent GPU layers + `content-visibility` on phones, banner shine repaints only on the visible slide, tickers rest while the tab is hidden. Media cache deliberately stays `shivaa-media-v120` (no gratuitous purge). Suite (14).
- **v122 pack:** B2B design desk `#/catalogues` — name/SKU search (debounced, persisted) + 5-way sort incl. selected-first; sticky bill bar gated on the top total; second gallery shots load near-view only; card-photo logo fallback; wishlist crash guard; honest empty-catalogue note. Billing math verified byte-identical. Suite (22).
- **Rates:** untouched since v119 — `premium.gold22 = 398` and the anchor formula are **owner-locked**; `api.php`, `.htaccess` and `db.json` shipped in **none** of the v120–v123 zips.
- **Catalogue:** master PGS set is **77** rings (the 65 signature rings + Ladies-67 tranche 1, PGS5066–5077, via PR #46); each still carries four images.
- **Gates required before any later release:** `v113b-check.js` (32) · `v117-check.js` (27) · `v118-check.js` (18) · `v119-check.js` (27) · `v120-check.js` (24) · `v121-check.js` (14) · `v122-check.js` (22) · **`v123-check.js` (14)** · php-sweep (211/0) · catalogue 77 with four images each — all re-run on the built zip overlay, plus a real-PHP probe of the shipped `api.php` whenever it changes.
- **Deploy caution:** the auto-sync cron did **not** fire for PR #45; never trust push-to-deploy until a merge is seen reaching shivaa.in on its own. The zip extracted into `public_html` ROOT is the fast path; `main` is the durable one.

## Previous baseline — v119 (15 Sep 2026)

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
