# SHIVAA JEWELLERY — HANDOFF DOCUMENT

**Last updated: 2026-09-08 (v44 in progress — creamy-white face pass, branch `arena/01a07e8c-shivaa-ecom`)**
**Live site: https://shivaa.in · Repo: theunreal8055-coder/Shivaa.ecom**
**THIS FILE IS THE SINGLE SOURCE OF TRUTH. It is on GitHub. Any new chat reads this and continues.**

---

## ⚠️ DISCREPANCY NOTE (2026-09-08) — verified ground truth vs. earlier chat claims

An earlier chat reported "39 creamy-white `_face.jpg` images generated and committed
locally (`bd2c1eb`)". **Verified false on 2026-09-08:** commit `bd2c1eb` exists on no
branch (local or origin), and zero `_face.jpg` files existed anywhere in history.
What IS true (all verified against origin):
- PR #14 merged to `main` (`ba3f69c`): 65/65 PGS rings full photoshoots ✅
- PR #14 also included "white-bg batch 1/7" (`ef6ef73`): the `_shot_studio.jpg` of
  PGS5001–PGS5010 was REPLACED in place with a creamy-white version (not saved as `_face.jpg`)
- Corner-luminance scan of all 65 studio shots: **34 already have a creamy-white face**
  (5001-5010, 5014, 5015, 5022, 5023, 5025-5027, 5029, 5032, 5033, 5035, 5036, 5043-5045,
  5047, 5049, 5050, 5058, 5061-5065) and **31 were still dark** at the start of this pass.
Treat any other claim from that chat as unverified until checked on disk/origin.

---

## 🎯 v44 — CREAMY-WHITE FACE + RING RESET (owner-approved) — REPO WORK ✅ COMPLETE

Plan approved by the owner (do NOT re-ask):
1. ✅ Creamy-white face for every dark PGS ring → `cms/images/designs/rings/{SKU}_face.jpg`
   (31 generated this session; the other 34 already had white `_shot_studio.jpg` covers).
2. ✅ db.json wired: `images[0]` = white face cover, `images[1..3]` = editorial/worn/gift,
   **`video` removed from all 65 PGS rings**. 405 products intact, every image verified on disk.
   (Frontend needs no change — `app.js` renders the FILM badge/slide only when `p.video` exists.)
3. ✅ `demo65/media/{SKU}/` staging synced: `shot_studio.jpg` = white face cover, `video.mp4`
   deleted, `meta.json` images updated + video key removed (65/65).
4. ⏳ LIVE SITE (the only remaining step — needs a non-sandbox machine; PR #16 MERGED to main
   on 2026-09-08, so all media/meta are fetchable from GitHub main):
   **delete all 85 rings → re-upload 65 (4 images, no video)** — two equivalent paths:
   - **Tablet/phone (no terminal): `deploy/ring_reset_bridge.php`** ← owner is on a tablet.
     hPanel File Manager → create secret folder in public_html (e.g. `rst-x7k2q`) → upload
     this one file → open `https://shivaa.in/<folder>/ring_reset_bridge.php` → login →
     Step 1 Delete → Step 2 Upload (tap ~17×, 4 rings/tap; server pulls media itself from
     raw.githubusercontent.com main) → Step 3 Verify (65 rings, 0 videos) → SELF-DESTRUCT,
     delete folder, rotate admin password. Ledger-resumable, rings-only.
   - Laptop/SSH: `python3 deploy/ring_reset.py --email … --password …` (dry-run), then `--live`.
   NOTE: the auto_sync.php cron (if ever installed) requires video.mp4 per design and thus
   will NOT sync this no-video batch — the bridge/script above is the correct path. Also
   remember to deploy the new `cms/` code (db.json face covers) via zip or auto-sync AFTER
   the reset, or product pages will still reference old media on stale caches.

### Face-pass ledger (31 dark rings) — ALL DONE ✅
- batch 2 (10, `b1545df`): PGS5011 5012 5013 5016 5017 5018 5019 5020 5021 5024
- batch 3 (10, `37de002`): PGS5028 5030 5031 5034 5037 5038 5039 5040 5041 5042
  (5037 ref had a white price tag — cropped out before generation)
- batch 4 (8, `ba45553`): PGS5046 5048 5051 5052 5054 5055 5056 5059
- final (3, this commit): PGS5053 (re-rolled: first gen broke the shank), PGS5057
  (re-rolled: pavé bars offset), PGS5060

---

## 🚀 HOW ANY NEW CHAT STARTS (owner: just do these two things)

1. Open a new chat (any branch session) and connect it to this GitHub repo.
2. Say: **"Read HANDOFF.md first before doing anything"** — then paste/ask your task.

The agent reads this file + `tools/photoshoot/SESSION-STATE.md` and knows:
what exists, what is done, what is pending, how to deploy, and what never to touch.
**No information needs to be re-explained. Ever. This file is always updated after every work session.**

---

## ⛔ STRICT RULES — NEVER BREAK (carried from v42, still law)

1. DO NOT delete any existing products, data, features, or files unless the owner explicitly asks
2. Read `cms/data/db.json` BEFORE making changes — understand what exists
3. Back up before major changes — `git add -A && git commit -m "backup before [change]"`
4. After changes, verify nothing was lost — count products, count images
5. When adding new data, verify it actually got added — count and confirm
6. Ask the owner before removing anything — even if it seems unused
7. **Update THIS HANDOFF (or `tools/photoshoot/SESSION-STATE.md`) after EVERY work session — every step, every product**
8. Only move FORWARD — never undo working features
9. COMMIT EVERY TURN and `git push origin <branch>` — sandbox resets can wipe uncommitted work
10. Work only on the current session branch (the `arena/…` branch Arena gives you). Never switch branches.

---

## 📡 DEPLOYMENT — HOW IT WORKS (read this before saying "deploy")

**Hard fact (verified 7 Sep 2026):** the Arena chat sandbox CANNOT reach shivaa.in.
DNS resolves but the firewall kills the TLS handshake (`SSL_ERROR_SYSCALL`, curl exit 35,
3/3 attempts). No chat — this one or any future one — can call the live site's API directly.
That is why `deploy/UPLOAD-RUNBOOK.md` and `deploy/AUTOMATION.md` exist.

**Therefore deployment = GitHub push + server-side auto-sync:**

1. **One-time owner setup (~5 min, per `deploy/AUTOMATION.md`):**
   - On the Hostinger server: put `deploy/auto_sync.php` in the home dir.
   - Save its config (`~/.shivaa-sync.json`, 0600) with: admin email + password,
     `repo: theunreal8055-coder/Shivaa.ecom`, **`branch: arena/01a07bb3-shivaa-ecom`** ← the
     branch the agent works on (older docs mention `arena/01a07082-…` — that is WRONG now),
     optional read-only GitHub PAT, `deploy_code: true`.
   - hPanel cron: `php /home/<USER>/auto_sync.php` every 5 minutes.
2. **From then on, EVERY deploy from EVERY chat is just:** finish the work →
   `git add -A && git commit && git push origin <branch>`. Within ~5 minutes the server
   pulls the branch and automatically:
   - deploys changed `cms/` code to `public_html` (verified + smoke-tested + auto-rollback;
     **never** touches live `data/` or `uploads/`), and
   - uploads every design in `<batch>/media/{SKU}/` that has complete media
     (4 shots + `video.mp4` + `meta.json`, staged by the agent) to the live catalogue
     via `/api/media` + `/api/products` (upsert by SKU, ledger-deduped, resumable).
3. **Manual alternative paths** (if cron not installed):
   - Zip: `shivaa-update-v43-rings-batch1.zip` (9 rings) — see `DEPLOY-v43-RINGS-BATCH1.md`.
   - API from any online machine: `python3 pipeline/06_upload.py --config demo65/config.json --live --only <SKUs>`.

**When the owner says "deploy" in a chat, the agent's job is:** finish + verify staging,
commit, push, confirm in HANDOFF that batch N is pushed, and remind the owner the server
cron deploys it within ~5 min (or run Path B manually if no cron).

---

## ✅ CURRENT STATE (v43 COMPLETE — 65/65 full photoshoots)

### Product counts (405 total in db.json — MUST stay 405 unless owner orders otherwise)
| Category | Count | Status |
|----------|-------|--------|
| Rings | 85 = 65 PGS + 20 original | ✅ ALL 65 PGS full photoshoot (4 shots + film each) |
| Necklaces, Earrings, Bangles, Bracelets, Pendants, Mangalsutra, Nosepins, Silver, Bajubandh, Rakhdi, Aad, Sheeshphool, Hathphool, Punach, Bridal Anklets, Chains | 16 × 20 = 320 | Untouched, live |

### PGS RING LEDGER (all 65 — agent: keep this exact table current)
**✅ Full photoshoot since v42 (39):**
PGS5001 5002 5003 5004 5005 5006 5007 5014 5015 5016 5017 5018 5022 5023 5024 5025 5026 5027 5029 5032 5033 5035 5036 5043 5044 5045 5046 5047 5049 5050 5051 5057 5058 5060 5061 5062 5063 5064 5065

**✅ Full photoshoot completed in v43 (26):**
PGS5008 Mehndi · PGS5009 Jharokha · PGS5010 Marudhara · PGS5011 Sheesh Mahal ·
PGS5012 Hawa Mahal · PGS5013 City Palace · PGS5019 Heera · PGS5020 Panna · PGS5021 Manik ·
PGS5028 Banas · PGS5030 Thar · PGS5031 Shekhawati · PGS5034 Udaipur ·
PGS5037 Kumbhal · PGS5038 Ranakpur · PGS5039 Dilwara · PGS5040 Nahargarh ·
PGS5041 Baori · PGS5042 Sindoor · PGS5048 Kesar · PGS5052 Kundan ·
PGS5053 Jadau · PGS5054 Thewa · PGS5055 Minakari · PGS5056 Rani Padmini ·
PGS5059 Kanchan
(each: 4 AI shots 896×1195 + 10s 720×720 film, in `cms/images/designs/rings/`, wired in db.json,
 media staged in `demo65/media/{SKU}/` for the uploader)

**✅ MILESTONE REACHED — all 65 PGS rings now have full photoshoots** (39 pre-v42 + 26 in v43).

**Owner's "31 rings / 93 images" note:** ground truth on repo = the 26 PGS rings above
(all 26 were pending when v43 started). No PGS5066+ exists anywhere.

### Key files
| File | Purpose |
|------|---------|
| `cms/data/db.json` | Product DB (405). api.php serves it. Byte-faithful round-trip: `json.dumps(db, indent=2, ensure_ascii=True)` |
| `cms/images/designs/rings/` | All ring media (refs + shots + videos) |
| `tools/photoshoot/` | make_refs.py · finalize.py · video.py · db_update.py · badge assets · SESSION-STATE.md |
| `demo65/` | Batch-1 staging: `work/designs.json` (65 designs) + `media/{SKU}/` for the uploader |
| `deploy/auto_sync.php` | Server cron worker (pull + deploy + upload). Setup: `deploy/AUTOMATION.md` |
| `pipeline/06_upload.py` | Manual API uploader (Path B) |
| `DEPLOY-v43-RINGS-BATCH1.md` | Batch-1 deploy instructions (zip + API paths) |

### Gold rates (per gram): 24K ₹15,600 · 22K ₹14,300 · 18K ₹11,603 · Silver ₹239

---

## 📝 SESSION STEP LOG (newest first — append every session)

**2026-09-07 — v43 batch 1 (this session)**
1. Read HANDOFF v42; found 26 PGS rings with reference photo only (their `_shot_studio.jpg` was a byte-copy of the raw photo incl. green price tag).
2. Built + tested photoshoot toolchain (now in `tools/photoshoot/`): tag-free ref cropper, house-style finisher (896×1195 + Shivaa INC. badge), ken-burns video renderer (10s 720×720 25fps — matches the 39 existing films), byte-faithful db updater.
3. Generated full photoshoots for 9 rings: PGS5008 5009 5010 5011 5012 5013 5019 5020 5021 (36 shots + 9 films), every shot QA'd against the reference; re-rolled off-design renders (PGS5010 studio/gift, PGS5021 editorial prop-card) until faithful.
4. Wired all 9 into db.json (images[4] + video + mediaNote). 405 products intact before/after.
5. Staged `demo65/media/{9 SKUs}/` (shots + video + meta.json) for the auto-sync/manual uploader.
6. Built `shivaa-update-v43-rings-batch1.zip` (14.7 MB, 46 files) + `DEPLOY-v43-RINGS-BATCH1.md`.
7. Opened PR #13 (`arena/01a07bb3-shivaa-ecom` → `main`); all work pushed.
8. Verified sandbox→shivaa.in blocked (TLS killed) → documented auto-sync deployment path (above).
9. Rewrote this HANDOFF as the permanent single source of truth.
10. (same session, later turns) +2 rings: PGS5020 Panna, PGS5021 Manik (5021 editorial re-rolled for garbled prop text). +2 rings: PGS5028 Banas, PGS5030 Thar. +2 rings: PGS5031 Shekhawati, PGS5034 Udaipur (074f020). +2 rings: PGS5037 Kumbhal, PGS5038 Ranakpur (04d6509; 5037 ref needed white-tag removal — median-fill inpaint). +2 rings: PGS5039 Dilwara, PGS5040 Nahargarh (c48a8a4, first-pass clean). +2 rings: PGS5041 Baori, PGS5042 Sindoor (e9b5aff). +2 rings: PGS5048 Kesar, PGS5052 Kundan (aae17f7). +2 rings: PGS5053 Jadau, PGS5054 Thewa (e04a557). All 4-shot+film+db+uploader-staged. 3 rings pending (PGS5055 5056 5059). Deployment zip from step 6 covers the first 9; auto-sync cron deploys all 13 automatically once set up.
11. (new chat, branch `arena/01a07cae-shivaa-ecom`) +2 rings: PGS5055 Minakari, PGS5056 Rani Padmini — full photoshoots, 25 of 26 complete, pushed. PGS5059 Kanchan is the last remaining (studio+editorial generated this turn; worn+gift pending the 10-img/turn cap).
12. (same chat) +1 ring: PGS5059 Kanchan — worn+gift shots, film, db wiring, staging. **26/26 v43 batch done → all 65 PGS rings now have full photoshoots.** Verified: 65/65 db-wired + 65/65 disk media + 26/26 demo65 staged + 405 products intact. Committed a5c9743, pushed to `arena/01a07cae-shivaa-ecom`.

**Pre-v42 (summary):** 65 PGS rings imported; 39 photographed; v42 bug-fix set (see git tag `v42-stable`).

---

## ⛔ DO NOT TOUCH
- `cms/deadstock.html` — owner explicitly said leave it alone
- Existing product data (weights, purities, prices) — unless explicitly asked
- Carousel/gallery auto-advance — tuned, don't disable
- Live `data/db.json` + `uploads/` on the server — only via API upsert / cron; never clobber via manual file copy if live orders exist (Path A zip warning in `DEPLOY-v43-RINGS-BATCH1.md`)

---

## 💡 OWNER QUICK RECIPES
- **Continue ring photoshoots:** new chat → connect repo → "Read HANDOFF.md first, continue the ring photoshoots" (agent follows `tools/photoshoot/SESSION-STATE.md`, 2 rings/turn).
- **Deploy what's done:** new chat → "Read HANDOFF.md first, deploy" (agent verifies staging, commits, pushes; server cron finishes within ~5 min — or agent gives you the one Path B command if no cron yet).
- **One-time auto-deploy setup:** follow `deploy/AUTOMATION.md` (5 minutes), then deployment is fully automatic forever.
