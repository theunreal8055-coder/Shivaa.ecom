# demo48 — PGS BATCH 2 staging (48 rings, PGS5066–PGS5113)

Source: `PGS.pdf` on GitHub `main` (48 pages, one men's ring per page, salmon supplier tag).
Owner order 13 Sep 2026: upload all 48 with title, description, weight, **12% making charges**,
and **four e-commerce photos each** — model (worn), macro (studio), detail (editorial),
detail (gift). No videos (v44 house rule for rings).

| Path | Purpose |
|------|---------|
| `work/batch2_ledger.json` | ground truth: page → SKU, supplier tag, weight (g), name |
| `work/designs.json` | batch design list (house pipeline format; auto_sync skips it — no videos) |
| `media/{SKU}/shot_{studio,editorial,worn,gift}.jpg` | finished 4-shot set (896×1195, badged) |
| `media/{SKU}/meta.json` | upload record generated from db.json (batch2_stage.py) |

References (tag-inpainted) live in `cms/images/designs/rings/{SKU}.jpg`.
db tooling: `tools/photoshoot/batch2_db.py` (create / wire) · `tools/photoshoot/batch2_stage.py`.
Live deploy (ADD-ONLY, tablet): `deploy/batch2_upload_bridge.php` after merge to `main`.

Status: 8/48 shot (PGS5066–PGS5073) — ledger in HANDOFF.md "v45" section.
