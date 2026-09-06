# STANDING DIRECTIVE — 400,000+ designs (recorded 6 Sep 2026)

**Owner's order:** the website must carry **400,000+ designs**, each with 4 photos,
title, description and full specification, uploaded automatically.

**This is now the primary design constraint for every decision.** Any tool, format
or workflow that cannot survive 400k must be rejected, however good it looks at 65.

## The arithmetic that governs everything
| | count |
|---|---|
| designs | 400,000 |
| images @ 4 each | **1,600,000** |
| agent-generated images @ 10/message | **160,000 messages — IMPOSSIBLE** |

**Conclusion: an agent generating images one message at a time can never do this.**
The 65-ring batch was a hand-run demo. 400k requires a *headless, parallel,
API-driven* pipeline that runs unattended for days. That pipeline is
`pipeline/03_photoshoot.py` + `pipeline/07_bulk.py`, not the agent.

## What must be true before 400k can run
1. **An image-generation API key** (env `PHOTOSHOOT_API_KEY`) — the agent's
   built-in image tool cannot be called from a script.
2. **Outbound network** from wherever the pipeline runs. This sandbox has none
   (only PyPI); verified 6 Sep 2026.
3. **Object storage / CDN** — 1.6M images at ~150 KB is **~240 GB**. This cannot
   live in Git (128 MB cap) or on shared Hostinger disk.
4. **A real database.** `cms/data/db.json` is a single JSON file loaded into PHP
   memory on every request. At 400k products it is ~1 GB — the site would die.
   **MySQL/Postgres + paginated APIs + a search index are mandatory.**
5. **Cost budget.** At ~$0.02/image, 1.6M images ≈ **$32,000**. This is the single
   biggest number in the project and must be approved before anyone starts.

## Status
Items 1-2 blocked in this sandbox. Item 4 is a code change that can start now.
