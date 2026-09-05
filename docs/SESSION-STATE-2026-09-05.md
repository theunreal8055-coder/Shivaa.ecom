# SESSION STATE — 5 Sep 2026 (arena/01a07082-shivaa-ecom)

## What happened
The fresh-install RAR (`shivaa-FULL-fresh-install-v37.rar`) contained ONLY
`shivaa-FULL-fresh-install-v37.zip` → `shivaa/{cms,pipeline,qa,docs,README}`.
**`demo65/` (the 65-ring batch workspace) was NOT in it** — no designs.json,
no crops, no status.py, no completed exemplar shots beyond what `cms/` shipped.
Everything batch-related was rebuilt from scratch in this session.

## Rebuilt state (verified)
- Repo layout per GITHUB-UPLOAD-v37: `cms/ pipeline/ qa/ docs/` at root.
  cms == v37 update zip byte-for-byte (`?v=37` ×7, app.js md5 `b0da639ba9`).
- `demo65/` scaffold: `config.json` (out_dir=media, 720²/CRF27 kenburns,
  template metadata, upload dry_run), `status.py`, `tools/` (extract_tags.py,
  make_sheets.py, build_groundtruth.py), `suppliers/tags.csv`,
  `work/page_map.csv`, `work/designs.json` (65 rows), `media/designs/*.jpg` (65 crops).
- **Ground truth**: all 65 green supplier tags read visually (contact sheets in
  git history of this doc's session; page order is ARBITRARY — page 1 = PGS5065).
  `PGR5001` tag = supplier typo for PGS5001 (weight 1.870 matches live db).
  Cross-checks: PGS5004 tag 3.830 = live db 3.83 ✓ · PGS5001 1.870 = live 1.87 ✓.
  Contiguity PGS5001–5065 asserted in build_groundtruth.py.
- Names for the 63 non-exemplar designs are creative copy (heritage theme);
  live names kept for PGS5001 "Rajkumari" / PGS5004 "Mughal Moti".
  stoneDesc seeded from live db for the 2 exemplars only; blank elsewhere
  (never fabricate specs).
- Stage 4 verified: 720×720, CRF27, ~0.7 MB, 10 s, SHIVAA.IN watermark.
- META 65/65 via stage 5 `template` provider (review queue 0).

## Environment quirks (this sandbox)
- apt BROKEN (port 80 + TLS to deb.debian.org blocked). pip works
  (`--break-system-packages`). npm + PyPI + github.com work; GitHub release
  asset CDN (objects.githubusercontent.com) BLOCKED; **shivaa.in UNREACHABLE**
  (egress blocked) → stage 6 upload cannot run from here.
- No PHP, no docker → cms cannot run locally as-is.
- ffmpeg: static 7.0.2 via pip `imageio-ffmpeg` at /home/user/tools/bin/ffmpeg
  (symlink; recreated per session: `pip3 install --break-system-packages
  imageio-ffmpeg` + symlink). Lacks `drawtext`; overlay drops per-pixel PNG
  alpha → watermark done via blend=screen (see 04_render_video.py patch).
  ffmpeg-7 also rejects legacy pad label `[v0]` → use `[0:v]` (patched).
- RAR5 extraction: pip/npm `node-unrar-js` (7za 16.02 cannot read RAR5).
- generate_image paths are relative to the REPO root; reference crops live in
  `demo65/media/designs/{SKU}.jpg`.
- Tools kept in /home/user/tools (bin/ffmpeg, bin/7za) — outside the repo.

## Batch progress at commit
CROPS 65/65 · SHOTS 18/260 · COMPLETE 4/65 (PGS5065, PGS5064, PGS5004, PGS5001)
· VIDEOS 4/65 · META 65/65. Next: finish PGS5063 (gift, editorial), then
PGS5062, PGS5061, PGS5026 … at 10 shots/message.

## Open decisions (asked user 5 Sep)
1. pace of the remaining ~242 shots
2. upload path given shivaa.in unreachable from sandbox
3. duplicate root `PGS-1 (1).pdf` (13 MB) — delete?
4. local site preview (no PHP): python shim vs none
