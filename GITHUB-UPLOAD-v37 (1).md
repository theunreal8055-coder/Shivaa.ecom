# GITHUB UPLOAD — how to do it + will I run out of chat?

## What you upload (the ONE repo)
Build your **private** repo `shivaa` from the contents of `docs/` zips:
- Now: `shivaa-FULL-fresh-install-v37.zip` **is** the repo skeleton — extract it,
  you get the `shivaa/` folder (cms, pipeline, demo65, qa, docs, README).
- Later (at batch completion, 65/65 media): I add `shivaa-batch65-media.zip`
  (all 65×4 shots + 65 films) → drop its contents into `demo65/media/` and
  commit. Same repo, two commits.

## Steps
1. Create a **private** GitHub repo `shivaa` (private: it has CMS source + demo DB).
2. Upload the **contents** of the extracted `shivaa/` folder (not the folder itself):
   `Add file → Upload files → drag cms/, pipeline/, demo65/, qa/, docs/, README.md`.
   Largest single file = 13 MB (65rings.pdf) — fine (web limit 25 MB).
3. (Or git CLI: `git init -b main && git add . && git commit -m "Shivaa v37" &&
   git remote add origin https://github.com/<you>/shivaa.git && git push -u origin main`)
4. Open a **new chat** in this app, connect your GitHub repo, and paste
   `HANDOFF-GITHUB-v37.md` as the first message.

## ⭐ Your question: "will I get unlimited chat if I upload everything to GitHub?"
Honest answer — the important part of your instinct is right, but be precise:

**What stays the same:**
- The agent's working sandbox (workspace) is still capped — roughly **128 MB** of
  files it can hold, and per-message tool limits (e.g. **10 AI images per
  message**) do not change just because you use GitHub.
- Each conversation is also independent: a brand-new chat starts with an empty
  workspace (that's why the handoff doc exists — it's the memory).

**What GitHub buys you (the real win):**
- **Durable, large storage.** GitHub repos hold multi-GB; your 65 films + 260
  photos (~120 MB) live in the repo, not in the 128 MB workspace. The agent
  pulls only what it needs into its workspace and pushes finished work back or
  leaves it in the repo.
- **Fresh workspace every chat.** No accumulation, no "workspace full" — each
  new chat starts clean and reads the repo.
- **Restart-proof.** If the sandbox resets, the repo is untouched.

**In practice:**
- Per-chat agent work feels effectively unlimited in *data* (repo) and is capped
  only in *speed* — ~10 images per message, so the 65-design batch needs ~26
  messages of "continue" (you've seen this), no matter what.
- One real limit to respect: **files ≤ 25 MB each for web upload** (100 MB via
  git CLI). Our biggest file is 13 MB — fine. If a future batch has a big video,
  keep it in `demo65/media/` and upload via git CLI, or split.
- Keep `demo65/config.json` **out of secrets** — it never contains keys
  (providers read env vars).

**Bottom line:** with the repo as the source of truth you don't fight the
128 MB workspace at all; you only "pay" per message for AI image generation
(10/message). That's the platform's rate cap, not a storage limit — a fresh chat
gets a fresh budget every time.
