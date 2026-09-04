# Shivaa.ecom — Project Analysis & Continuation Plan

> Source analysed: Google Drive folder **`Shivaa.v37`** (`1TKT2pJO_VG6LoWWc7r6wEAc3wOFDaGPZ`)
> Source of truth recovered from GitHub: `shivaa-FULL-fresh-install-v37.rar` → nested zip
> Date: 2026-09-04 · Repo version: **v37**

## 1. What this project is

**Shivaa Jewellers (shivaa.in)** — a production e-commerce website for a jewellery
brand, plus a **65-ring AI automation pipeline** that:

1. Ingests supplier PDFs.
2. OCRs and normalises product data into verified "ground truth" (`work/designs.json`).
3. Runs an AI **photoshoot** (4 shots/design: studio, worn, gift, editorial).
4. Renders a **Ken-Burns product film** per design.
5. Generates metadata (metal value + making charges + GST = computed price).
6. Uploads everything to the CMS via a REST API.

The repo is the **source of truth**; the codebase is versioned as **v37**.

## 2. The Google Drive folder (`Shivaa.v37`) — 7 files

| File | Type | Purpose |
|---|---|---|
| `DEPLOY-v37.md` | doc | How to go live: update an existing site, or fresh install. Hostinger steps, PHP/extensions caveat, `?v=37` cache-bump rule. |
| `GITHUB-UPLOAD-v37 (1).md` | doc | How to build the GitHub repo from the zip + honest answer about chat/image limits. |
| `HANDOFF-GITHUB-v37 (1).md` | doc | Repo layout + current state + the job. The doc to paste into a fresh chat. |
| `HANDOFF-NEXT-v37.md` | doc | Deeper state: deliverables, site audit (v35 live, v36/v37 fine), batch status, env, workflow rules. |
| `REPAIR-SITE-v37.md` | doc | Site diagnosis (live reverted to v35), proof v36/v37 isn't buggy, deterministic redeploy, 19-point security audit. |
| `shivaa-FULL-fresh-install-v37.zip` | 27.7 MB | The repo skeleton: `cms/`, `pipeline/`, `demo65/`, `qa/`, `docs/`, `README.md`. Fresh-install site (clean demo DB 342 products, 20 catalogue PDFs, 2 exemplar products PGS5001/PGS5004 with photos + film). |
| `shivaa-update-v37.zip` | 157 KB | The 4-file live update: `index.html` (`?v=37` ×7), `api.php`, `css/styles.css`, `js/app.js`. Deployed to Hostinger `public_html`. Never touches `data/`/`uploads/`. |

## 3. Repo layout (as documented in the handoffs)

```
cms/            website files (php -S 0.0.0.0:8090 inside cms/ for local test)
                · demo DB 342 products, admin@shivaa.in
                · uploads/: 20 catalogue PDFs + 2 exemplar products (PGS5001, PGS5004)
                · index.html (?v=37 ×7), api.php (POST /api/media), css/styles.css, js/app.js, .htaccess
pipeline/       stages 01_ingest_pdf → 01b_ocr_tags → 02_normalize_data → 03_photoshoot
                → 04_render_video → 05_metadata → 06_upload  +  lib_common + config
demo65/         the batch:
                · config.json (out_dir = "media" — never "out/")
                · raw/65rings.pdf
                · suppliers/
                · work/designs.json   (65 SKUs, 22K purity, REAL gram weights, sizes, tags, img paths — OCR-verified)
                · work/ledger_*.csv   (progress ledgers)
                · media/designs/*.jpg (65 crops)
                · media/PGS5xxx/      (shots / video / meta)
                · status.py
qa/             qa_v36.py · smoke_media.py
docs/           DEPLOY-v37.md · REPAIR-SITE-v37.md · PIPELINE.md
deploy/         deliverable zips (shivaa-update-v37.zip, shivaa-FULL-fresh-install-v37.zip, shivaa-batch65-media.zip)
README.md
```

## 4. Current state (per HANDOFF-NEXT-v37 / HANDOFF-GITHUB-v37)

Batch status via `cd demo65 && python3 status.py`:

- CROPS **65/65** ✓
- COMPLETE **7/65** (PGS5001–5007) — i.e. 7 designs fully shot + filmed
- SHOTS **28/260**
- VIDEOS **7/65**
- META **65/65** ✓

**Remaining: 58 designs (232 shots)** at ~10 shots/message ≈ 24 "continue" messages.

Site audit: **live shivaa.in is on v35**. The v36 deploy did not stick; the v36/v37
code itself is provably fine (Chrome-verified: hero, 4 posters, bestsellers, PDP
film gallery, 0 console errors). Fix = extract `shivaa-update-v37.zip`.

## 5. The job remaining (in order)

1. `cd demo65 && python3 status.py` → **verify, don't trust.** Any file a ledger says
   is done must exist on disk (>20 KB). Do not regenerate what the ledgers say is done.
2. **Finish the 58 designs** the same way as the previous session:
   `generate_image` ×10 per message with reference `demo65/media/designs/{SKU}.jpg`
   (4 prompt templates in `demo65/config.json`: studio / worn / gift / editorial),
   then `python3 ../pipeline/04_render_video.py --only <SKU>`, then `status.py`.
3. When 65/65: set `demo65/config.json` → `upload.base_url = "https://shivaa.in"`,
   `dry_run = false`; get a login token (ask user for the admin password — **not**
   in repo; advise rotating it after); `python3 ../pipeline/06_upload.py --all`.
4. **Verify live** (never declare done otherwise): `/api/products?q=PGS` → 65 items,
   each 4 images + video + computed price; spot-check 3 PDPs (film = first gallery
   slide, FILM badge) + 1 homepage render — screenshots required.
5. On any 4xx/5xx → rerun `--only SKU` (idempotent upsert).

## 6. Rules (must never be violated)

- **Never fabricate** weight / purity / price — `work/designs.json` is ground truth.
- **Never hand-edit** `cms/data/db.json` — API only.
- Bump `?v=` in `cms/index.html` (7 refs) whenever JS/CSS changes.
- `curl -F` >1 KB to `php -S` fails (http=000) — use Python `http.client` (see `qa/smoke_media.py`).
- PyMuPDF is not thread-safe (≤3 workers).
- Clear stale `work/ledger_*.csv` when regenerating media.
- No `out/`-named dirs — media lives in `demo65/media/`.
- Large uploads via `06_upload.py` only.
- Out of scope this round: new suppliers, SMS gateway go-live, scaling beyond 65 (ask first).

## 7. Environment needed

pip: `pymupdf pytesseract opencv-python-headless openpyxl pillow numpy requests`
apt: `ffmpeg php-cli php-curl tesseract-ocr`
php dev server: `php -S 0.0.0.0:8090 -t cms cms/router-dev.php`
Site runtime: PHP 8.1+ (tested 8.4), extensions `finfo json curl mbstring` (all default on Hostinger). Hostinger PHP limit 64 MB; upload cap 25 MB/file.

## 8. Security audit summary (from REPAIR-SITE-v37)

Strong (verified live): `data/db.json`, `data/sms-config.json`, `samples-payload.json`,
`migrate-repair.php`, `router-dev.php` all 403; no directory listings; `sms.php` no-op
without config; 6 security headers (CSP `default-src 'self'`, X-Frame-Options DENY,
nosniff, HSTS, Referrer-Policy, Permissions-Policy); no secrets in package (env-var only).

Action items:
1. **Rotate the live admin password** (top item — shared with this project).
2. CSP keeps `script-src 'unsafe-inline'` (legacy inline handlers) — acceptable; escape user input with `esc()`.
3. SMS gateway: keep `sms-config.json` absent until go-live, then add a shared-secret check.
4. Login brute-force: `loginFails` tracking exists; add IP throttle before public launch.
5. Dev-only: `php -S` doesn't serve HTTP Range → `ERR_ABORTED` in logs is harmless.

## ⚠ Network note

This sandbox's egress proxy blocks **Google Drive** but allowlists **GitHub**. The
zips could not be pulled from the Drive links directly in bash. The user instead
uploaded `shivaa-FULL-fresh-install-v37.rar` (24.3 MB) to the GitHub repo. I pulled
it via git, compiled a RAR5-capable `unrar` (7.23) from the `pmachapman/unrar`
mirror (the bundled `7za` was too old and `apt` was blocked), and extracted the
nested zip. Recovery complete — see §9.

## 9. ACCOUNTING — what the recovered zip actually contains (2026-09-04)

Extracted from `shivaa-FULL-fresh-install-v37.zip` (33 MB, 202 files):

**Present ✅**
- `cms/` (164 files) — full site: `index.html` (?v=37), `api.php`, `css/`, `js/`,
  `data/db.json` (**342 products**, verified demo DB), `.htaccess`, `sms.php`,
  `migrate-repair.php`, `samples-payload.json`, `images/` (banners, product samples,
  reviews), `uploads/catalogs/` (**20 catalogue PDFs**), `uploads/designs/rings/`
  (8 exemplar jpgs), `uploads/videos/rings/` (2 exemplar films), `docs/`.
- `pipeline/` (11 .py, all compile clean) — full 7-stage automation.
- `qa/` (2 scripts, compile clean).
- `docs/` — `DEPLOY-v37.md`, `PIPELINE.md`, `REPAIR-SITE-v37.md`.
- `README.md` (project).
- `deploy/shivaa-update-v37.zip` — the 4-file live fix (index.html, api.php,
  css/styles.css, js/app.js), verified contents.

**Missing ❌ (critical)**
- **`demo65/` directory is absent** from the FULL zip. There is no `status.py`,
  no `raw/65rings.pdf`, no `suppliers/`, no `work/designs.json` (the 65-SKU
  OCR-verified ground truth), and no `demo65/media/` (65 crops + generated
  shots/films/meta). The README and `GITHUB-UPLOAD-v37.md` explicitly state
  `demo65/` is part of the FULL skeleton — so this archive is **incomplete** and
  does **not** match what the handoffs describe.

**Implication:** the primary job — "finish the 58 remaining designs" — cannot start
until `demo65/` is in the repo, because:
- `work/designs.json` is the ground-truth source for SKU codes, weights, purities,
  sizes, tags, and image paths. Without it, generating designs would risk
  **fabricating weight/purity/price (a hard rule we must never break)**.
- `media/designs/{SKU}.jpg` crops are the exact reference images the AI photoshoot
  (`03_photoshoot.py`) needs as `img2img` input.
- `demo65/config.json` (with the 4 prompt templates + upload settings) is the batch
  config; only `pipeline/config.example.json` is present, and it is an example.

I need the **`demo65/` folder** (or a fresh archive containing it) uploaded to the
repo to proceed with the batch. Everything else needed (site, pipeline, QA) is in.
