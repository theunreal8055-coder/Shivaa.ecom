# HOSTINGER DEPLOYMENT — ARENA → GITHUB → LIVE, WITH OWNER APPROVAL

**Production rule:** GitHub pushes and PR merges do **not** update the website.
Arena must explain the proposed live change and ask the owner first. Only after
the owner explicitly approves may Arena start the manual GitHub Actions deploy.

This replaces the old automatic-on-merge behavior.

## Current safety state

- Repository: `theunreal8055-coder/Shivaa.ecom`
- Production URL: `https://www.shivaa.in`
- Deployment workflow: `.github/workflows/hostinger-deploy.yml`
- Workflow trigger: manual `workflow_dispatch` only
- Live deploy source: protected `main` branch only
- Exact live confirmation phrase: `DEPLOY SHIVAA LIVE`
- Live catalogue writes and destructive ring resets have separate manual approval
  phrases and can no longer be triggered by a push.
- The workflow never transfers `data/`, `uploads/`, `.htaccess`, `config.php`,
  `.env*`, `backups/` or `setup-mysql.php`.
- The workflow compares `/api/version` with the repository before uploading and
  blocks a downgrade.

**Important as of 22 September 2026:** the public website reports release **170**,
while GitHub `main` reports release **169**. Therefore the current repository
must not be deployed over production. The next approved application release
must move forward (normally release 171 or later); the anti-downgrade gate will
block a 169 → 170 rollback automatically.

## One-time owner setup — secrets stay inside GitHub

Never paste FTP credentials into Arena chat, an issue, a commit or a document.

1. In Hostinger hPanel, open **Websites → shivaa.in → Files → FTP Accounts**.
2. In GitHub, open:
   **Shivaa.ecom → Settings → Secrets and variables → Actions**.
3. Add or update these repository secrets:
   - `HOSTINGER_FTP_SERVER`
   - `HOSTINGER_FTP_USERNAME`
   - `HOSTINGER_FTP_PASSWORD`
4. Do not send their values to the agent. GitHub secrets are write-only and the
   workflow can use them without displaying them.
5. In Hostinger, inspect the old server-side `auto_sync.php` setup. In the home
   folder's `.shivaa-sync.json`, set `"deploy_code": false`, or disable that
   cron entirely. Otherwise an old cron could still overwrite production
   without the new approval gate. Catalogue-only automation may remain enabled
   only if intentionally required.

## Safe connection test — no website changes

After the three GitHub secrets exist, Arena may run a preview without production
approval:

```bash
gh workflow run hostinger-deploy.yml \
  --ref main \
  -f mode=preview
```

The FTPS action runs in dry-run mode. It validates credentials, PHP syntax,
release stamps, protected-file exclusions and the current live release, then
shows what would transfer. It does not intentionally write website files.

A green preview proves GitHub Actions can reach Hostinger. It is not permission
to deploy.

## Live deployment procedure

For every release, without exception:

1. Arena finishes the work on its Arena branch and runs the required test suite.
2. Arena opens the PR and reports exactly what would change.
3. The owner decides whether to merge the PR.
4. After merge, Arena reports the source release, current live release, test
   results and protected-file boundary.
5. Arena asks: **“Deploy this release to shivaa.in now?”**
6. Only a clear owner **yes** authorizes this one deployment.
7. Arena starts:

```bash
gh workflow run hostinger-deploy.yml \
  --ref main \
  -f mode=deploy \
  -f approval='DEPLOY SHIVAA LIVE'
```

8. Arena watches the run to completion and checks `/api/version` plus the live
   release handshake before reporting success.

Approval is single-use. Approval for one release never authorizes later releases,
catalogue changes, database migrations or destructive maintenance.

## What the code deployment never touches

- `data/` — live orders, users and fallback JSON data
- `uploads/` — customer/product uploads
- `config.php` — Hostinger MySQL credentials
- `.env` / `.env.*` — environment credentials
- `setup-mysql.php` — one-time installer
- `.htaccess` — host-managed Apache rules
- `backups/` — server backups

The MySQL tables and their live rows are not replaced by the FTPS code sync.
Database/schema changes require their own reviewed migration and separate owner
approval.

## Catalogue and destructive maintenance

- Catalogue PRs may run validation/dry-run checks.
- A push or merge can never perform a live catalogue write.
- A live catalogue dispatch requires `live=YES` and the exact phrase
  `DEPLOY CATALOGUE LIVE`, after owner approval.
- Ring Reset remains manual-only and additionally requires the exact phrase
  `RESET RINGS LIVE`. It should be treated as destructive recovery, not normal
  deployment.

## If a run fails

- A failed preflight uploads nothing.
- A newer live release blocks an older repository release.
- A wrong branch or confirmation phrase blocks production mode.
- If post-deploy verification fails, stop and inspect the run; do not repeatedly
  rerun production syncs or guess at live data.
- Roll forward with a corrected, tested release. Never force-push or restore old
  application files blindly.
