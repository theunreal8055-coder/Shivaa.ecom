# AGENT HANDOFF — read this first, every new chat (updated 6 Sep 2026)

**Owner:** Shivaa Jewellers (shivaa.in), non-technical. Talk plainly, no jargon
dumps. **Repo = single source of truth.** Live site = PHP CMS in `cms/`
(v37) + JSON db on Hostinger; batch automation in `pipeline/`; current batch
workspace pattern `demo65/` (one folder per supplier batch).

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
  owner-confirmed CIN, UDYAM and address. GSTIN/certificates stay empty pending
  real details/files. The profile is not a government registry result or product
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
