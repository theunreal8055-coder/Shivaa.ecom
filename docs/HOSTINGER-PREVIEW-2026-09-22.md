# HOSTINGER PREVIEW (DRY-RUN) — 22 September 2026

**Requested:** run the Hostinger preview / dry-run only; no live deployment.
**Result: the real preview run has NOT been started — the Arena session token is
read-only for GitHub Actions (HTTP 403 on the workflow-dispatch endpoint, the
same sandbox limit this repository has recorded before).** Everything else a
preview decides has been reproduced locally and is green. One owner click
starts the real dry-run (see “Start the real preview” below).

No production write occurred. Neither this document nor the replica touches
`shivaa.in`, the FTP credentials, `data/`, `uploads/` or any live file.

## 1. Why the workflow could not be dispatched from here

| Attempt | Command | Result |
|---|---|---|
| CLI | `gh workflow run hostinger-deploy.yml --ref main -f mode=preview` | `HTTP 403: Resource not accessible by integration` |
| REST | `POST /repos/…/actions/workflows/360344481/dispatches` | `HTTP 403: Resource not accessible by integration` |
| Secrets | `GET /repos/…/actions/secrets` | `HTTP 403` (secrets are write-only by design) |

The token can read repository content, runs and workflows but cannot create
workflow dispatches. No other credential exists in the sandbox, and the FTPS
values are deliberately never shared with the agent.

## 2. What was verified locally instead — replica of the workflow preflight

Tool: `tools/mega/hostinger-preview-replica.js` (tracked; read-only; extracts
`origin/main` into a temp directory and mirrors the workflow’s own greps).

```bash
cd tools/mega/smoke && npm ci          # provides php-wasm (real PHP 8.3)
node tools/mega/hostinger-preview-replica.js
```

```
tree: (temp) extracted from origin/main
sha:  9e8b2b9897720c69d8d492ab65d4e6fdc0beca75

[1] Approval gate          PASS  mode=preview: no phrase/branch restriction (deploy checks not exercised)
[2] Preflight
      PASS  critical files present            index.html, api.php, sw.js, js/app.js
      PASS  cms/config.php is not tracked
      PASS  all four release stamps readable  index=169 app=169 worker=169 api=169
      PASS  release handshake matches         all four = 169
      PASS  service-worker shell matches      shivaa-shell-v169
      PASS  PHP syntax clean on all cms/*.php 10 files (php-wasm 8.3.33, token_get_all TOKEN_PARSE)
      PASS  negative control: a deliberately broken file IS refused
[3] Anti-downgrade
      WARN  repo 169 < live 170 → preview proceeds; mode=deploy would abort ("Nothing was uploaded")
[4] FTPS transfer plan (local half)
      808 files / 263.8 MB in cms/  →  760 sync candidates / 247.9 MB after the exclude list
      48 files / 15.9 MB withheld     (.htaccess, setup-mysql.php, data/**, uploads/**)
[5] Contract
      PASS  preview can never write (dry-run driven by mode)
      PASS  a live deploy is impossible from this tree (169 < 170 + phrase required)

=== REPLICA RESULT: 10 passed, 2 warning(s), 0 failed ===
```

The repository’s own deployment gate was re-run as well:

```
node tools/mega/smoke/deploy-approval-check.js
Deployment approval gate: 20 passed, 0 failed
```

The live release was read through the Arena web-fetch proxy (the sandbox has no
direct TLS route to `shivaa.in`):

```json
{"ok":true,"rel":170,"shell":"shivaa-shell-v170","builtAt":"2026-09-21T17:16:52+05:30",
 "forceLatest":true,"stamp":{"index":170,"app":170,"sw":170,"matched":true}}
```

## 3. Start the real preview (owner action, ~1 minute, writes nothing)

GitHub → **Actions** → **Hostinger Deploy (approval required)** → **Run workflow**
→ branch **main** → `mode` = **preview** → **Run workflow**.

Or the CLI equivalent:

```bash
gh workflow run hostinger-deploy.yml --ref main -f mode=preview
```

Expected sequence in the run log:

1. *Validate manual production approval* — “Preview mode: FTPS will run with
   dry-run enabled”.
2. *Preflight* — the three FTPS secrets are read for the first time ever,
   critical files + `config.php` boundary + stamps + PHP syntax pass, live
   release reads back as 170.
3. **`::warning::ANTI-DOWNGRADE`** — repository 169 is older than live 170.
   Preview continues by design; a `deploy` run would stop here.
4. *FTPS sync with `dry-run: true`* — connects to Hostinger, lists the remote
   tree, logs what it **would** upload/compare, and writes nothing.
5. Summary: “dry-run only; no production files were intentionally changed.”

A green run proves GitHub Actions can reach Hostinger with these credentials and
is **not** permission to deploy.

If the run fails: the previous ten runs of this workflow were all `push`-event
runs that failed fast (30–57 s) before the approval gate existed — i.e. the
secrets had never been exercised. Capture the failed step’s log and treat a
first-run FTPS/connection error as a configuration matter, not a code matter.

## 4. Observations for the owner (no action taken)

- **Preview writes nothing** — safe to repeat.
- **`mode=deploy` is currently impossible**, twice over: the anti-downgrade gate
  (169 < 170) and the exact phrase requirement. The next application release
  must move forward (normally 171+).
- **Housekeeping (not a deployment):** three historical archives sit inside
  `cms/` — `shivaa-update-v161.zip`, `shivaa-update-v162.zip`,
  `shivaa-update-v163.zip` (≈3.4 MB each) — plus `samples-payload.json`
  (430 KB). They are inside the synced directory and are not matched by the
  exclude list, so a future code deploy would upload them. Removing them is an
  owner decision and was **not** done here.
- **Optional:** if the owner grants the Arena GitHub connection Actions **write**
  permission, future previews can be dispatched from chat. Until then, the
  preview button is an owner action.

## 5. Boundary statement

- No live deployment, no FTPS write, no catalogue change, no database
  migration, no uploads or credentials touched.
- Live site remains release **170** with a matched handshake; repository `main`
  remains release **169**.
- This is a preview preparation record, not a release, and not approval for one.

## 6. Retry after the owner added the three FTPS secrets (22 Sep 2026, later the same day)

The owner reported that all three Hostinger secrets are now added and asked for
the preview/dry-run again. **The dispatch was retried and is still refused — and
the two blockers are different things:**

| Blocker | Status after the retry | Where it is cleared |
|---|---|---|
| FTPS secrets missing in the repo | Owner reports **added**; cannot be listed from here (`actions/secrets` → HTTP 403, secrets are write-only by design) | Inside the run: step *Preflight — credentials, release handshake and PHP syntax*. If they are still absent it fails there with “Hostinger FTPS secrets are not configured”. The last real run (`35680829125`, 1 h before this retry) failed on exactly that message. |
| Starting the run at all | **Still blocked — HTTP 403** | Only GitHub Actions **write** permission can clear it. The Arena session GitHub connection has read-only Actions access (it can read runs, workflows and repo content, but cannot create a dispatch). Adding secrets does not and cannot change this. |

Retry evidence (unchanged from §1, reproduced this turn):

```
$ gh workflow run hostinger-deploy.yml --ref main -f mode=preview
could not create workflow dispatch event: HTTP 403: Resource not accessible by integration
  (https://api.github.com/repos/theunreal8055-coder/Shivaa.ecom/actions/workflows/360344481/dispatches)

$ POST /repos/…/actions/workflows/360344481/dispatches   {"ref":"main","inputs":{"mode":"preview"}}
{"message":"Resource not accessible by integration", … ,"status":403}
```

What *was* refreshed locally this turn, so the owner knows the run is worth
starting:

```
node tools/mega/smoke/deploy-approval-check.js   → Deployment approval gate: 20 passed, 0 failed
LIVE_VERSION_JSON='{"rel":170,…}' node tools/mega/hostinger-preview-replica.js
  → REPLICA RESULT: 10 passed, 2 warning(s), 0 failed   (origin/main 9e8b2b98, stamps 169 lockstep,
                                                         php-wasm 8.3.33 clean on 10 files,
                                                         760 sync candidates / 247.9 MB, 48 withheld)
live /api/version → {"rel":170,"shell":"shivaa-shell-v170","stamp":{"…","matched":true}}   (unchanged)
```

So the moment the owner presses **Run workflow** (`mode` already defaults to
**preview**), the expected log is exactly §3 above: secrets read successfully →
preflight green → `::warning::ANTI-DOWNGRADE` (169 < 170) → FTPS dry-run →
“dry-run only; no production files were intentionally changed”. Nothing can
deploy: preview forces `dry-run: true`, and a `deploy` run would abort on the
anti-downgrade gate before any upload.

**Why the secrets alone could not start the run — and what can:** dispatching a
workflow is a GitHub Actions *write* operation. The Arena GitHub connection is
read-only for Actions, so this session can plan, verify and read results but not
press the button. Two ways forward, both owner-side:

1. Press it: GitHub → **Actions** → **Hostinger Deploy (approval required)** →
   **Run workflow** → branch **main** → `mode` = **preview** → **Run**. Works on
   desktop or in the GitHub mobile app.
2. Optional, for future turns: if the Arena GitHub connection is granted Actions
   **write** permission, later previews can be dispatched straight from chat.

Either way the sandbox can read the finished run (`gh run list` / `gh run view`)
and report the preview result here.
