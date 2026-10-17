> ## CURRENT STATE — read first (updated at v227, 17 Oct 2026)
>
> - **Branch reality:** work continues on the Arena session branch
>   `arena/e8a470c6-shivaa-ecom`, which is branched from `arena/09f3c79f-shivaa-ecom` at its v220 tip
>   (`4a9e239`) — the two trees were byte-identical when v221 started there. `arena/09f3c79f-shivaa-ecom`
>   was **not** modified, so PR #106 on it is untouched. PR base: `arena/5529f0ec-shivaa-ecom`.
> - **Live site: v205** (owner confirmed). Nothing newer is live. Owner approval needed for every release.
> - **Pushed, not live:** v206–v227. Newest is **v227** ("The Reading Layer"): the owner reported that
>   the black-card "Verify & create" button does nothing on a product page, that forgot-password shows an
>   email OTP when it should ask for the mobile and then a new password, and asked for the home page's
>   bugs and the "design elements and design physics and design texts" to be made better. (1) The claim
>   was **dead on every PDP**: `blackReadIntake()` looked for `[data-black-claim] [data-bc-intake]`, a
>   form that exists only on `#/black-card`, so on a PDP it returned "Enter your name…", `beginBlackClaim`
>   took the wrong error branch, and the status writer targeted `.bc-claim-status`, which was not on the
>   page either — no sheet, no message, nothing. The reader is form-aware now, the PDP invite card carries
>   its own `.bc-commerce-status` line, the claim falls back to the account name (and sends a nameless
>   account to `#/black-card`), and the post-login auto-claim prefills first — it had been broken for
>   every first-time visitor. The intent is armed **only after validation passes** (the old code armed it
>   at the top, so a refused empty claim fired itself on the next sign-in — the new suite caught it).
>   Proven end to end on `#/product/p_smp_rings_01`: signed out the sheet opens and remembers the return
>   hash; signed in, OTP → card `SBM284596` (expires 2027-04-18) → back on the piece showing
>   "Save ₹854 on this piece". (2) **Forgot password** is mobile-first: the 4-digit code goes to the
>   registered mobile (even when the shopper starts from an email), then new password + repeat with a
>   real 30 s resend; `api.php` accepts `{phone}` or `{email}`, rate-limits per identifier and always
>   texts the registered mobile. Proven: the new password signs in 200, the old one is refused 401.
>   (3) **Home**: the rate ribbon printed `₹₹6,998/g` on every figure (the template added a sign `fmt()`
>   has printed since v120), the legacy hero hint was a bare injected `<div>` that ate taps (now a real
>   `<button data-hero-cue>`, 44 px on coarse pointers), `ub-rates`/`btn-lg` can wrap at 768 px, and the
>   news logo + mega feature art are deferred and sized. (4) **The reading layer** (`cms/css/v227.css` +
>   `cms/js/v227.js`, last bundle layer): `--shv-mnav-h` is measured from the real `.mnav` (64 px CSS
>   fallback) and drives the footer bleed, `scroll-padding-bottom` and `#backTop`; images that mount after
>   the first sweep are still deferred; the rail centres its active chip with `scrollLeft` arithmetic
>   (never `scrollIntoView`) and jumps under reduced motion; the `.fv-base`/`.fvt-id` gold floors are
>   lifted to legibility; press states reuse `--shv-press`. New suites: blackcard 28, reset 31, design 41;
>   the whole older gate green (butter 61, appfeel 80, corners 64, smooth 39, bundle 36, cleanup 34,
>   billing-gone 13, depth 22, sidebar 13, alive 96, flip all, t7 4). Package: **357 files · 37,266,250 B ·
>   sha256 `c4cbf83d6efb06fc518a3882af9b6b8727a6dd1743e40ff5fe657602769ccc0f`**. Next release number:
>   **v228**.
> - One release back is **v226** ("The Butter Release"): every press answers. 265 of 1058 visible controls
>   had no `:active` rule; `cms/css/v226.css` gives each family a transform press under the **union** of
>   `(pointer: coarse)` and `(hover: none)` (the union matters: a touchscreen laptop is both), and
>   `cms/js/v226.js` adds the v89 gold ripple (tap-only on big surfaces), one 5 ms haptic per real tap,
>   rail centring, wish/compare badge pops, `html.route-jump`, a 180 ms pace bar, and `startViewTransition`
>   cross-fades. Suite `qa/browser/t-v226-butter.mjs` 61/0.
> - Earlier: **v225** ("The App-Feel Release"): the chrome's scroll work moved into ONE
>   passive listener + ONE rAF (`cms/js/v225.js`, `window.__shvHub`) — `app.js` and `aurum.js` used to
>   read `scrollHeight`/`clientHeight` on every frame, and a six-event scroll burst now reads the
>   document **zero** times; writes are quantised (bar 0.1%, ring 1/120 turn) and the two infinite
>   `background-position` loops (`mSkeleton`, `auProg`) became composited `translate` sweeps. **v224**
>   ("The Every-Corner Release") took the layout animations and provided four DOM-rebuilding timers off
>   the critical path (**~35 → ~2 DOM writes/sec**). **v223** ("The Smooth Release") made the films lazy
>   — a fresh home page fetched **0 video bytes**; **v222** ("The Load Release") bundled 58
>   render-blocking stylesheets into one.
> - Full handoff (release table with zip shas, QA commands, open items): **`docs/NEXT-CHAT-HEAD.md`**. Read it first.
> - Sandbox resets between turns: `git fetch origin arena/e8a470c6-shivaa-ecom && git reset --hard FETCH_HEAD`
>   first (`arena/09f3c79f-shivaa-ecom` is the twin branch and works the same way).
>   **v222 stylesheet rule:** never hand-edit `cms/css/shivaa.css` and never re-derive its order from
>   `index.html` (that file links ONLY the bundle, so a script reading it would bundle the bundle
>   into itself). Edit the layer under `cms/css/`, then `python3 tools/build-css-bundle.py --write`.
>   The cascade order lives in `tools/css-bundle-order.txt` — it is load-bearing, do not reorder it.
>   A new layer is only live once it is appended to that file AND the bundle is rebuilt.
>   **v223 media rule:** films load only via `wake()` in `cms/js/v125.js` — never put `src` or
>   `preload="auto"` back on those `<video>` tags, and never treat a released film as broken.
>   **v224 animation rule:** never animate a layout property (`margin`, `left`, `width`, `top`, …) or a
>   `filter`/`blur` in a loop — use `translate`/`transform`/`opacity`; never put a per-second `innerHTML`
>   rebuild back into a timer. `qa/browser/t-v224-corners.mjs` fails if either returns.
>   **v225 scroll-frame rule:** the chrome's scroll work lives in `cms/js/v225.js` (`window.__shvHub`) —
>   never add a second scroll listener that reads `scrollHeight`/`clientHeight` per frame, never call
>   `getBoundingClientRect()` inside a frame, and never animate `background-position` (a repaint loop no
>   browser can composite — use a `translate` sweep on a pseudo-element). `app.js` and `aurum.js`
>   feature-detect the hub and stand down; `qa/browser/t-v225-appfeel.mjs` spies the getters and fails if
>   a scroll burst reads them.
>   **v226 click-feel rule:** one ripple system only — `motion.js` owns `.rip` on `.btn`, `js/v226.js`
>   owns every other surface with the *same* span class. A tap is down+up with <8px of movement: never
>   ripple or buzz a drag, and never ripple a rail child on the down of a flick. A host is clipped
>   (`.rip-live`) only while its ripple is alive and gets `position:relative` (`.rip-pos`) only if it was
>   `static` — never add a permanent `overflow:hidden`/`position:relative` to a card. A finger press
>   needs `@media (pointer: coarse), (hover: none)` **and** `!important` (mobile.css's neutraliser is
>   `!important`); never touch `transition` as a shorthand on a family you do not own. One navigation has
>   one motion owner: `html.route-jump` + `html.vt-run` live for one navigation, `motion.js` checks
>   `vt-run` before replaying `.pg`, and the pace bar is armed after 180 ms and created lazily so a fast
>   route leaves no DOM behind. `qa/browser/t-v226-butter.mjs` fails a drag that ripples and a fast route
>   that leaves a spinner.
>   Rebuild `cms/data/db.json` with `python3 qa/build-test-db.py` (v221: it now emits `makingCharges`
>   too — the shim serves that route and 500s without the key); reinstall jsdom to /tmp.
>   **Before blaming the code for a flaky suite, check for stray `node` processes.** A single stuck
>   probe at ~60% CPU on this 2-core box slowed every jsdom boot from ~2.6 s to ~36 s and made the
>   timing-based suites fail. Killing it returned the whole gate to green.
> - Open: billing-app AI chatbot is BLOCKED (owner has not provided the billing app code). 10g colour, offer tilt,
>   smoother-scroll feel on a real phone, and sign-in look are unverified in a real browser or on a phone.
>   **v227 carries:** the claim journey and the reset flow are proven end to end in jsdom against the
>   shim, but **no real phone, SMS or PHP has run this**
>   — that is the 3-minute checklist in `DEPLOY-v227.md` §9 (the claim from any product page, signed out
>   and in / a reset by mobile, then a new password / the ribbon reads `₹6,998/g` / the last footer
>   line clear of the bottom nav on a notched iPhone). `touch-action:
>   manipulation` in 8 older rules is still left alone (a tap-latency choice; changing it alters
>   double-tap behaviour the owner has not asked about), and the six designed sheen loops
>   (`posterShine`, `phSheen`, `auShine`, `shimText`, `mPlShimmer`, `rateShim`) still animate
>   `background-position` — one is `background-clip: text`, so a composited sweep needs a wrapper element
>   first. JS bundling stays a future option (deferred scripts already parallelise; `app.js` holds 308
>   top-level declarations) and `content-visibility: auto` is a future candidate **only** in its
>   `contain-intrinsic-size: auto` form — see `docs/NEXT-CHAT-HEAD.md`. `cms/css/bot.css` and
>   `cms/css/v108.css` are dead (never linked, no loader for `bot.js`/`v108.js`) — cleanup candidates.
>   The passive-listener hunt is a dead end (23 of 25 listeners are already passive; the one blocker is
>   the deliberate gallery drag).

# Shivaa — agent working guide

## Plan session (24 Sep 2026) — read before touching SQL/billing/catalogue work

- The agreed master roadmap for the SQL-at-3-lakh migration, the standing ZIP
  update ritual, the auto-catalogue review-queue, and the owner's billing-software
  deployment is `docs/PLAN-SQL-BILLING-CATALOGUE-2026-09-24.md`. **Phase 1+2
  (SQL runtime) is now BUILT as v180** (dual-mode overlay + mirror-on-save +
  ZIP-only `upgrade-sql.php` reconciler; belt 41/21/0 + chain 171/171 + sweep
  212/0) — delivered as `shivaa-update-v180.zip` + `DEPLOY-v180.md`, **not
  deployed** (owner yes required). Billing upload + catalogue gate choice
  still pending. Live is 179; forward-only 180+.
- Verified fact, updated for v180: **product catalogue reads/writes now
  ENGAGE MySQL when `db_driver => 'mysql'`** (overlay + mirror-on-save with
  the JSON safety net — see the v180 CURRENT STATE section in
  `docs/AGENT-HANDOFF.md`), but **orders/settings SQL tables are still empty
  and money routes still run on extract-only JSON until Phase 3.** Until
  v180 is deployed AND `upgrade-sql.php` has run, live behaviour is still
  pure JSON. "Tables exist" ≠ "site runs on MySQL" — `db.mode` on
  `/api/version` is the truth. **Never add a helper called from inside
  `db_load`/`db_save` without a `function_exists` guard** — legacy suites
  extract only those two bodies and fatal otherwise.

## Deployment control update — owner approval required (22 Sep 2026)

- PR #90 is merged on `main` (`2393a7949852b9bb1f16cdbfa8b138f83da8235e`):
  MySQL/PDO support, the installer/template and manufacturing-weight workflow are
  retained. The owner reports the 77-product Hostinger migration completed.
- The public `/api/version` last reported **release 170** with matching
  index/app/worker stamps. The newest published package is **v178** (source commit `0c8cd29`). **Never deploy an older tree over a newer live site, and never
  deploy anything without the owner's explicit yes.** Any next application
  release must move forward from **179** and pass the anti-downgrade gate.
- Production is now manual-only by owner policy. A push/merge must never update
  Hostinger or the live catalogue. Explain the proposed deployment and ask the
  owner first; one explicit yes authorizes only that one run.
- `.github/workflows/hostinger-deploy.yml` requires a manual dispatch from `main`
  plus `DEPLOY SHIVAA LIVE`; catalogue and ring-reset workflows have separate
  explicit phrases. Protected data/uploads/config/installer/`.htaccess` stay excluded.
- The owner must store Hostinger FTPS values only as GitHub Actions secrets and
  disable the old Hostinger `auto_sync.php` code writer (`deploy_code:false`). Never
  request credentials in chat. See `HOSTINGER-AUTO-DEPLOY.md`.
- No live deployment was performed while installing these controls.

## Read first

1. **The *CURRENT STATE — v183 BUILT* section of `docs/AGENT-HANDOFF.md`
   and `MEMORY.md`, plus `DEPLOY-v183.md` and `playstore/README.md`.** These are
   the build record for the Play Store release (live remains **181** until the
   owner deploys v183, which is a superset of the never-deployed v182).
   `DEPLOY-v177.md` / `DEPLOY-v176.md` and those sections are history
   (v177 and v176 stay shipped).
   `DEPLOY-v176.md` and the v176 section are history (v176 stays shipped).
2. `docs/SESSION-STATE-2026-09-21-v169.md` and `DEPLOY-v169.md` for the v169
   baseline, then `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `HANDOFF.md`,
   `ARENA-STATE.md`. Older “current/newest”, no-ZIP and release-freeze banners
   are historical — the v169 “final state” is history, not a restore
   instruction.
3. Actual branch, diff and code. Documents have contained stale counts/labels;
   verify before repeating them.

## Current source state (9 October 2026) — release 183 (built; live 181)

- **Storefront/source release 183** — the **Play Store release**: Shivaa goes to
  Google Play as a **Trusted Web Activity** of `shivaa.in`. 11-file ZIP:
  `api.php` · `index.html` · `js/app.js` · `js/admin.js` · `sw.js` ·
  `upgrade-sql.php` · `manifest.json` · `manifest.webmanifest` · `sitemap.php` ·
  `.well-known/assetlinks.json` (NEW) · `.well-known/.htaccess` (NEW).
- **The three web pieces the app depends on:** Digital Asset Links
  (`/.well-known/assetlinks.json`) — and the **trap** that the parent
  `.htaccess` denies every `*.json`, which 403s exactly that file; fixed by
  shipping a `.htaccess` *inside* `.well-known/`, because a deeper `.htaccess`
  merges after its parent. Plus a stable `"id": "/"` in both web manifests, and
  the erasure page listed in `sitemap.php`.
- **The one Play blocker that had to be built:** `POST /api/auth/delete-account`
  and the "Privacy & my data" page. Play's User Data policy requires in-app
  account deletion plus a web URL; emailing the Grievance Officer does not count.
  The route anonymises the row exactly as `admin/user-data/*/anonymize` has since
  v86, revokes every token, keeps order/KYC rows for tax + PMLA retention, and
  never hard-deletes. Session **or** a freshly verified OTP — and the OTP must be
  checked against the code itself, because the page never calls
  `/auth/otp-login`.
- **`playstore/` is the launch kit** — `README.md` is the step-by-step plan with
  the two gates (account type; identity verification), `CHECKLIST.md` the
  runbook, `listing.md` the paste-ready copy and App-content answers,
  `twa-manifest.json` the Bubblewrap config, `verify.mjs` 17 offline checks.
  Run `python3 playstore/graphics/make-graphics.py` for the icon, the 1024×500
  feature graphic and the screenshot framer.
- **Verified live, not from memory:** Play requires **target API 36** for new
  apps since 31 Aug 2026 (Bubblewrap 1.26's template already targets 36), and a
  **personal account created after 13 Nov 2023 needs a closed test with 12
  testers over 14 continuous days** before production access. Say that plainly
  whenever "launch today" comes up.
- **Belt: 190 passing** (deploy gate 20 · v183-check 9 · v183-php-run 9 ·
  v182-php 9 · v181-php 6 · v180-php 8 · v179-php 25 · v169 pages 25 · v169 PHP
  28 · v168 39 + N40 12), re-run on the **extracted ZIP bytes**. v179-relay fails
  7/7 identically on pristine HEAD in this sandbox — pre-existing.
- **Not verified:** no AAB built or signed (no JDK/Android SDK/dl.google.com
  here), no live site probed, no screenshot invented, Google's app-link
  verification and Play's review not run.

## HISTORY — release 180 built, live 179 (24 September 2026)

- Storefront/source release **180** (SQL runtime, built this session; live
  is still **179** until the owner deploys); hardened media cache
  deliberately stays **168** because no media changed. v180: 6-file ZIP
  (api/index/sw/app/admin/`upgrade-sql.php`), stamps 179 → 180 lockstep,
  dual-mode SQL overlay + mirror-on-save + installer, compute_price
  hardening, admin Data-Source strip; suites `v180-check` 7/7 +
  `v180-php-run` 8/8; superseded stamp-exact suites SKIP-forward.
  Builder: `tools/mega/make-v180-zip.py`. See `DEPLOY-v180.md`.
- (Prior source release **177** record follows.) Release stamps move in lockstep
  (`__SHIVAA_REL=177`, `APP_REL = 177`, `shivaa-shell-v177`, `REL=177`,
  `'rel' => 177`) plus every `?v=` asset stamp in `index.html` and `sw.js`.
- v178 is the in-footer PWA app band the owner asked for ("download the
  app without the Play Store"): a quiet footer card with a client-drawn
  QR of `https://shivaa.in/` (qrcode-generator 1.4.4 vendored verbatim,
  MIT) and a CTA; the captured `beforeinstallprompt` fires only on the
  tap; the iPhone/Android/desktop guide sheet is tap-only and closes
  instantly; the dismiss persists (30-day re-show); standalone never
  shows the band. The v140 law (no floating install chip, no auto
  pop-ups, instant persisted dismiss) is asserted by `v178-check.js`.
  New assets `css/v178.css` (last sheet) + `js/v178.js` (last deferred
  layer); stamps 177 → 178 lockstep; MEDIA stays `shivaa-media-v168`;
  no API/admin/money changes. `v178-check.js` 17/17 +
  `v178-php-run.js` 17/17; belt 158 checks, 0 failures. Builder:
  `tools/mega/make-v178-zip.py`. See `DEPLOY-v178.md`.
- v177 is the owner-requested rework of v176: five defects repaired (the
  confirmed purge 500'd on undefined `JSON_UNESIGNED_*` constants, the GET
  preview ignored `?scope=`, same-second backups could clobber each other,
  the day-book COD tile was structurally always ₹0, and legacy rows could
  500 stats/the preview). New executed suites `tools/mega/smoke/v177-php-run.js`
  (17/17, PHP 8.3) and `v177-check.js` (11/11) guard each repair; the belt is
  40 pass / 16 retired skip / 0 fail. Builder: `tools/mega/make-v177-zip.py`.
- This session's branch: `arena/01a0d168-shivaa-ecom` (branched from
  `bc666f3`, the PR #93 merge carrying v171–v176 onto `main`). v177 commits:
  `a77dacf` + `29e2c0d` (ZIP built from `29e2c0d`).
- Prior ledgers:104 repairs; v169 adds **36**, for **140 cumulatively recorded**.
  B20 is separately identified hardening, not a claimed cross-customer exploit.
  **v170–v178 are separate owner-requested releases recorded in the handoff, not
  new ledger rows — do not recount them as bugs.** (The five v177 defects were
  genuine defects in the shipped v176 release, fixed forward — not ledger
  re-counts.)
- **Published, NOT live-deployed.** v177: `shivaa-update-v177.zip`, 7 files,
  427,896 bytes, SHA-256
  `2c9fff1a8b39e186093e44ecac0980189e7ca783337be677e35d5bea6b35dec2`, built
  from source `29e2c0d` (commits `a77dacf`/`29e2c0d` on this session branch);
  requires full v165+; see `DEPLOY-v177.md`. The v176 ZIP/link is unchanged
  and must stay available. No DB/uploads/credentials/media/host configuration
  is packaged.
- Actual ZIP overlay checks pass:25/25 page,28/28 PHP,39/39 v168 boundaries,
  12/12 signatures,17/17 v164 PHP,24/24 direct checkout,36/36 v167.
  Existing v168 ZIP is unchanged; the new archive is reproducible using
  `tools/mega/make-v169-zip.py` and the documented source commit.
- Current session branch: `arena/01a0c31d-shivaa-ecom`. Obey the active Arena
  session's branch restrictions; do not switch branches or merge main on the
  strength of an old handoff instruction.
- App: `cms/` (PHP 8 API, vanilla JS hash-routed SPA, JSON-backed production data).
- Do not mistake the static preview's fixture responses for a live backend.

## Forward-only / do not repeat completed work

**FORWARD ONLY — the owner restated this rule at the close of the v176 session;
it is absolute.**

- Preserve the latest verified source (currently **v180** — built, awaiting
  owner deploy; live 179). New fixes are targeted forward commits; **no
  release reset or revert, no old-file or old-ZIP restoration, no rewritten
  or force-pushed history. The next release is 181 or higher — never reuse
  or renumber a shipped release, never deploy an older tree over a newer
  live site.** The old v125 freeze was superseded by owner-requested
  releases through v180; rejected v126 and Truecaller must remain retired.
- Consult the completed v168/v169 ledger IDs and tests before changing a path.
  Missing scratch logs do not mean a fix is absent. Do not replay non-idempotent
  `work/audit169/backend.py` / `frontend.py` patch scripts.
- The complete product/test/package inventory and remaining work are recorded
  in `docs/SESSION-STATE-2026-09-21-v169.md`. Do not redo or recount those repairs.
- A docs-only update needs no new app release or replacement archive. Preserve
  the published ZIP/hash and immutable download link. Do not call it installed
  or live without owner/host evidence.
- Historical merge/deploy instructions are not new authorization. Stay on this
  session's branch; do not merge main or trigger live workflows for continuity.

## Safety and owner rules

- Work forward from the current source. Preserve the approved design, category
  tiles, films, direct Cashfree checkout and six campaign studs.
- Never invent supplier weights, purity, prices, legal/HUID verification,
  government data, analytics, payment/courier status or customer confirmations.
- Do not edit `cms/data/db.json`, customer orders, credentials or uploads to make
  tests pass. Use isolated, clearly labelled QA fixtures.
  **v176 collision, already resolved — do not resolve it the other way.** The
  owner asked to "delete all the sales data", which read literally means editing
  the live `db.json`. House law forbids that, and this workspace's copy has
  `orders: []` anyway, so the purge ships as a server-side, admin-only,
  backup-first dashboard action (`/api/admin/purge-unpaid`) instead. Any future
  "delete the data" request gets the same treatment: build the guarded tool,
  never hand-edit the database.
- Never restore the retired verification integration or the rejected v126 work.
- `.htaccess` is host-managed for deployment. Review its tiny Apache comment fix
  separately; never overwrite the live file wholesale or package it in a ZIP.
- Never replace `sw.js` alone. Index, app, worker, API release and every asset
  URL must move coherently. Staff loader follows APP_REL. Only Shivaa-owned cache
  namespaces may be purged.
- Source fixes are not production fixes until deployment is approved and checked.
  Live gateway limits cannot be repaired by frontend code.
- Communicate plainly; no “100 bugs fixed” by counting tests, lint warnings or
  speculative findings. Keep defect IDs and distinguish new/cumulative counts.

## Verification

```bash
cd tools/mega/smoke
npm ci --no-audit --no-fund
npm test
npm run test:regression
cd ../../..
node tools/mega/php-sweep/sweep.mjs
```

- Last verified belt (v180 close): **41 active suites pass, 21 retired/
  superseded-feature suites skip, 0 fail** · chained `npm test` **exit 0,
  171 executed checks** (relay may flake T05/T06 under chain load —
  standalone 7/7) · php-sweep **212 routes / 0 exceptions** · deploy-approval
  **20/20**. The runner explicitly distinguishes SKIP from PASS; five
  stamp-exact v177–v179 suites SKIP-forward on trees newer than their
  release (forward-only made mechanical).
- PHP can execute via the installed PHP-WASM dependency. A parser pass is not
  runtime proof; test the relevant real PHP block/endpoints too. (The v176
  purge 500'd on nonexistent `JSON_UNESIGNED_*` constants while every parser
  and the Python simulation were green — this is why the v177 suites execute
  the real endpoints.)
- v169 gates: **28/28 executed PHP**, **25/25 executed page/print cases**.
  Same tests on published v168: **1/28** and **0/25**. Tests are not bug counts.
  `SMOKE_CMS` selects isolated code; PHP fixtures use a separate in-memory DB.
  Never point mutating tests at production. New helpers live in tracked
  `tools/mega/smoke/php-api-fixture.js`; scratch logs stay in `work/audit169/`.
- `db_save` rejects stale snapshots with409. Do not blindly retry money-changing
  POSTs. Any future nested `db_load` must not permit saving an older outer array.
  Native locking/load/gateway tests remain separate from deterministic fixtures.
- `work/` and `node_modules/` are transient/ignored. Keep reusable tests and
  findings in tracked `tools/mega/`, not only in scratch directories.
- After edits update the memory, handoff and agent guide with measured results,
  honest deployment status and remaining checks. Keep generated bulk media out
  of this audit unless the owner explicitly requests it.
