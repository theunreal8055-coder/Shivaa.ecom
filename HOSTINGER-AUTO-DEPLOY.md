# HOSTINGER AUTO-DEPLOY — uploads go live by themselves (from 17 Sep 2026)

**What changed:** every time Arena work is merged to `main`, GitHub Actions now
syncs `cms/` straight into your Hostinger `public_html/` over secure FTPS —
only the changed files, usually 1–3 minutes — then checks that shivaa.in really
serves the new release. **No more manual zip uploads.**

You do **one 5-minute setup below, once**. After that it just works.

---

## 0 · One-time setup (owner, 5 minutes, phone-friendly)

**Step 1 — get your FTP details from Hostinger (2 min)**

1. Log in at **hostinger.com → hPanel → Websites → Manage** next to shivaa.in.
2. Open **Files → FTP Accounts** (on some plans: Dashboard → **FTP details**).
3. Note down: **FTP hostname** (looks like `ftp.shivaa.in` or a server name),
   **Username** (looks like `u375397497`), and your FTP **password**.
   If you don't know the password, reset it on that same page.

**Step 2 — save them as GitHub secrets (2 min)**

1. Open **github.com/theunreal8055-coder/Shivaa.ecom → Settings → Secrets and
   variables → Actions → New repository secret** (repeat 3 times):
   - Name `HOSTINGER_FTP_SERVER` → value = the FTP hostname from Step 1
   - Name `HOSTINGER_FTP_USERNAME` → value = the FTP username
   - Name `HOSTINGER_FTP_PASSWORD` → value = the FTP password
2. Secrets are encrypted — even the agent can never read them back. Only the
   deploy workflow can use them, and only to upload your own site files.

**Step 3 — test it (1 min)**

1. GitHub repo → **Actions → Hostinger Deploy → Run workflow → dry_run: YES →
   Run workflow.** The log lists what WOULD upload. Nothing changes.
2. Run it once more with **dry_run: NO**. Watch it go green (~15–30 min the
   very first time — it uploads the full photo set once; later deploys send
   only changed files). Green check = shivaa.in verified serving the release.
3. On your phone: close all shivaa.in tabs, reopen — the site is current.

**Step 4 — retire the old cron deploy (1 min, after Step 3 is green)**

The old server cron (`auto_sync.php`) also copies code and must not fight the
new pipeline. In Hostinger **File Manager**: turn on **Show hidden files**,
open your **home folder** (one level ABOVE `public_html`), edit
`.shivaa-sync.json`, and either:

- set `"deploy_code": false` (recommended — keeps the cron's catalogue sync,
  stops it touching code), **or**
- make sure `"branch": "main"` if you want to keep it as a backup writer.

Also confirm on that file that `branch` is `main`, not an old `arena/…`
branch — an old branch would push stale code over the live site.

Done. From now on: **Arena finishes → merged → live, automatically.**

---

## How it works (plain words)

1. Arena merges finished work to `main` (unchanged — same as today).
2. The **Hostinger Deploy** workflow wakes up, but ONLY if the merge touched
   website files (`cms/`). Doc-only merges don't deploy anything.
3. **Safety checks first:** FTP secrets exist · release stamps match
   (`index.html` ↔ `app.js` handshake) · every PHP file passes a syntax lint.
   Any failure = red cross, nothing uploaded.
4. **Sync:** changed files go up over encrypted FTPS (port 21).
5. **Proof:** the workflow fetches your live homepage and refuses to go green
   until shivaa.in serves the new release number.

## What it NEVER touches

- `data/` — your live orders, customers, and catalogue database.
- `uploads/` — product photos and films uploaded through the site.
- `.htaccess` — your panel's server rules. On the rare release that changes
  this file, the agent will tell you the exact lines to merge by hand.
- Anything else already on the server stays put (files the repo deleted are
  left alone — the agent will tell you if one ever needs manual cleanup).

## Skipping one deploy

- Editing the merge message in the GitHub app/website: add `[skip deploy]`
  anywhere in it and that push will not deploy.
- Or: **Actions → Hostinger Deploy → … → Disable workflow**, re-enable later.

## If a deploy ever goes red

1. Open the failed run — the log says exactly which step failed, in plain words.
2. Nothing half-uploads: the safety checks run BEFORE any file moves.
3. Rollback = merge a revert PR (the agent does this) — the revert itself
   auto-deploys, restoring the previous release. Every `main` push also keeps
   a one-click backup tag (see the main-guard workflow).

## FAQ

- **First run slow?** Yes, once (~15–30 min, ~236 MB of theme photos). Every
  run after that syncs only what changed (1–3 min).
- **Catalogue (rings/products)?** Unchanged — products still go live through
  **Catalogue Deploy**, never through this file sync.
- **Do I still verify on my phone?** A quick eyeball after big releases is
  still wise — but the workflow already proves the new code is live.
- **Can the agent see my FTP password?** No. Secrets are write-only; the agent
  can use the pipeline but can never read the password back.
