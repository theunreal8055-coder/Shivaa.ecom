> ## CURRENT STATE — **v253 “Bridge” PACKAGED, AWAITING THE OWNER'S YES** (16 Nov 2026). Run `bash qa/where-am-i.sh` first, then read `docs/NEXT-CHAT-HEAD.md`.
>
> - **v253 “Bridge” is the newest release** — packaged 16 Nov 2026, **not deployed**. The only zip to
>   install: `shivaa-update-v253.zip` — **777 files · 45,562,801 B ·
>   `8f752196d38dce6e6d16ceaa4e59f53ad2ed102f18034fd45aacdef9fcd837f6`**. **Next release number: v254.**
>   Contains v237–v252 (including v250 “Still”, v251 “Alive” and v252 “Silk”). Session branch: `arena/a20b3005-shivaa-ecom`.
>   v253 ships: `cms/billing-sync.php` + `cms/docs/shivaa-connector.php.txt` + `cms/css/v253.css` + lazy-loaded
>   `cms/js/admin.js` `#billingSyncCard` + `billing-connector/shivaa-connector.php` + `billing-connector/CLAUDE-PROMPT-FOR-BILLING-SITE.md`
>   + `docs/BILLING-SYNC-CONTRACT.md`, proof-minified `css/shivaa.min.css` (8,807 rules verified 1:1), and
>   sha256-verified `js/app.min.js` + `js/rel.min.js` (**0 B added to shopper JS**; v252 speed preserved).
> - **TWO-WAY SHOWROOM BILLING SYNC.** Connects the owner's separate, already-live Hostinger PHP/HTML/JS
>   billing website to `shivaa.in` (dark `403` until a sync key is saved in **Admin → Settings**):
>   - **Website → Billing (auto, 0 ms shopper wait):** customers (OTP register/login, profile, addresses, Shivaa
>     Black, B2B), all 9 lead channels (contact, services/appointments, custom order, metal exchange, partner KYC,
>     Swarna Nidhi, rate alert, abandoned cart, newsletter) and online orders (`order.created`, `order.paid` with
>     GST `invoiceNo`, `order.updated`) push post-response via SSRF-safe DNS-pinned HTTPS HMAC-SHA256 webhooks
>     plus signed `GET /api/billing/{rates,stock,customers,leads,orders,events}` & `POST /api/billing/events/ack`.
>   - **Billing → Website (auto PDF bills + stock):** `POST /api/billing/bills` (JSON base64 or multipart) verifies
>     real `%PDF-`/image bytes, saves `0600` in `.shivaa-private-bills` outside `public_html`, deduplicates by
>     `externalId`, optionally deducts SKU stock, and links by 10-digit mobile to customer `#/my-bills` (View &
>     Download only — even for walk-in customers registering later); plus `bill-void` and idempotent `stock-movement`.
>   - **Connector & Admin:** `shivaa-connector.php` works with both MySQL (`shivaa_synced_*`) and locked private
>     JSON (`.shivaa-billing-sync`), `shivaa-hooks.php` callbacks, PHP SDK & staff JS bridge; Admin → Settings manages
>     URLs, write-only masked key (`••••`), 5 toggles, Test Connection, Backfill, Retry, 1-click Connector download & log.
> - **Gates:** `node qa/browser/t-v253-bridge.mjs` (**71**) · `t-v229-bills` (**102**) · `t-v252-silk` (**48**) ·
>   `t-v251-alive` (**46**) · `t-v250-still` (**34**) · `t-v249-steady` (**36**) — **337/337 passing, 0 red**;
>   `qa/phpbal.py` BALANCED on all 3 PHP files; `python3 qa/check-handoff.py` 0 red.
>
> - **v252 “Silk” (history, superseded by v253)** — packaged 16 Nov 2026 (`c78ef0f`), `shivaa-update-v252.zip`
>   (774 files · 45,524,517 B · `6a6b57c2d0d9b585f45a399d7dc0fb7172c6d22758ba3ac03e59a317083306db`).
> - **v251 “Alive” (history, superseded by v252)** — packaged 16 Nov 2026 (`ccd80aa`), `shivaa-update-v251.zip`
>   (772 files · 45,504,067 B · `c03ff713453d3d2c7c3ed2c93168419f8d6b5eb06b3927471eb22a81c4fa60fa`).
>   It contains v237–v250. v251 layers: `js/v251.js` + `css/v251.css`, plus the **minified stylesheet**
>   `css/shivaa.min.css` that `index.html` now loads (new `tools/build-css-min.mjs`), and the rebuilt minified
>   pair `js/app.min.js` + `js/rel.min.js` (`tools/build-min.mjs`).
> - **Why v251 exists.** The owner, after v250: *“The app should feel more live and smooth and the smoothness
>   must be on the next level, it should load faster and without decreasing the quality, make the next update,
>   improve more smoothness.”* v250 had taken the phone's continuous animation away — and with it, every sign
>   that the shop is alive. v251 gives the sign back out of the budget a phone can spare: **motion that answers
>   the shopper is free, motion that runs on its own is not.**
> - **SMOOTHER.** Every surface a thumb actually touches — cards, tiles, chips, tabs, drawer rows, icon buttons —
>   answers a press in 90 ms with `scale(.977)` on the universal `--sx-*` rhythm (they had no press at all;
>   only buttons did). `filter` is explicitly removed from the press path: v107 repainted on every press.
>   Every new rule is scoped to `html.shv-mobile`; a desktop keeps its blur and its hover vocabulary (asserted).
> - **LIVE.** A pending price breathes (opacity only, 1.4 s) instead of sitting as a frozen grey bar; the
>   utility strip carries a 6 px live dot; the first row of the grid settles in 24 ms steps travelling 10 px
>   (opacity never changes, so it cannot blink); the bag badge pops for 320 ms when its number changes
>   (MutationObserver on `#cartCount`/`#wishCount`, not a poll); a fresh rate sweeps one gold hairline on the
>   `rates` event. **On a settled page exactly one of them is running.**
> - **POSITION.** A 2 px gold read bar, created by the script (no markup, no bar without JavaScript), filled
>   with `transform: scaleX()` from **one rAF per scroll frame**. The page height is measured on resize and
>   after a route — never inside the scroll handler.
> - **FASTER, AND PROVABLY THE SAME SHEET.** `index.html` loads the minified build of the one stylesheet:
>   **965,451 → 876,841 B (−9.2 % raw, gzip ≈ 191 KB → 174,636 B)**. `tools/build-css-min.mjs` **refuses to
>   write it** unless it is structurally identical to `cms/css/shivaa.css` — 8,758 effective rules compared
>   with their media context, 9 `@font-face`, 264 `@keyframes`, csso with `restructure:false` so no rule is
>   ever merged or moved. The readable bundle stays in the repo and in the package: **a rollback is one `<link>`.**
>   Additionally every `<img>` the app writes carries `decoding="async"` (43 template sites), with a runtime
>   backstop that reports anything a future template forgets.
> - **Instrument:** `Shivaa.v251.report()` →
>   `alive 251 · phone · live pulses 1 · pending prices 0 · sync-decode fixups 0 · page 0%`;
>   also `.pulses()`, `.pop()`, `.tick()`, `.progress()`, `.syncImages()`.
> - **Gates:** `node qa/browser/t-v251-alive.mjs` (**46**) · `t-v250-still` 34 · `t-v249-steady` 36 ·
>   `t-v248-instant` 37 · `t-v247-premium` 53 · `t-v246-light` 58 · `t-v245-scroll` 39 · `t-v244-butter` 54 ·
>   `t-v243-header` 36 · `t-v242-taps` 41 · `t-v241-perf` 43 · `t-v240-rip` 16 — all 0 red;
>   `python3 qa/check-handoff.py` green.
>
> - **Why v250 exists (history).** The owner, after v249: *“The website still legs and there are flickering issues and
>   scrolling also strucks and the page doesn't move anywhere sometimes … even if I don't have mention them find
>   them and fix them.”* So this release **measured the phone's compositor** instead of guessing. On the rendered
>   390×780 home screen (1284 elements) it found: **21 `backdrop-filter` passes** (one per card button),
>   **6 `mix-blend-mode` groups**, **4 full-surface blur filters**, **31 layer promotions**, and **25 animations
>   that never stop** — 14 spinning QR badges, 4 floating blurs, orbiting beams, a breathing glow, and 70 star
>   pops inside a marquee that is itself moving. After: **animated 141 → 15 · infinite 25 → 2** (the two
>   transform-only marquees) **· blur 0 · blend 0 · filter-blur 0 · promoted 0.** Scoped to `html.shv-mobile`,
>   set during parsing; a desktop keeps all of it (asserted in the gate).
> - **The flicker was v248's own rule.** It switched every entrance animation off while `html.shv-scrolling` was
>   on — and v244 sets that class at the first scroll event of every gesture, so an animation mid-flight was cut
>   and restarted on every scroll. Retired.
> - **The blink was older than v248/v249.** `#view > *{animation:viewIn .45s both}` and `#view{animation:viewIn}`
>   faded every page — and the whole view — in from `opacity: 0` on every render; `.rv-item`, `v210Rise`,
>   `v211Rise` and `starPop` all started at zero opacity too. Fixed at the source (`css/styles.css`, `v210`,
>   `v211`) plus a `#view,#view > *` guarantee.
> - **“Scrolling strucks”:** the shop page held the storefront's **only non-passive `touchmove`** listener on
>   `#view` (pull to refresh) for its whole life — the browser waited on the main thread for every frame of every
>   gesture. Armed only while a pull is in progress now; `overscroll-behavior-y: contain` stops Chrome's own
>   pull-to-refresh fighting it; hover transforms that stick after a tap are neutralised on phones.
> - **“The page doesn't move anywhere”:** `lockScroll()` is a counter and one missed release left
>   `html.no-scroll` set with nothing open. `js/v250.js` watches for that shape (it checks the overlay is
>   *visible*, not merely present) and hands the page back via `Shivaa.forceUnlockScroll()`.
> - **Instrument:** `Shivaa.v250.audit()` / `Shivaa.v250.report()` — what the phone is compositing right now.
> - **Why v249 exists.** The owner, after v248: *“Screen blinks and still slow loading.”* Two reports, two
>   different causes, both of them removals.
>   **A · THE BLINK was a page that showed nothing for a frame.** `#view.shv-rise > *` animated from
>   `opacity: 0`; `.rv` blocks sat at `opacity: 0` until an observer agreed to show them; `.rv-in` and
>   `.shv-img-in` started from nothing. Every one of those is blank page between the tap and the content.
>   `css/v249.css` keeps the motion and removes the invisibility: entrance motion travels 6 px, it never fades
>   up from zero.
>   **A2 · the expensive blink: a SECOND FULL RENDER.** When the boot cap beat the batch, `calmBoot(0)` rewrote
>   #view — every photograph requested again, decode, layout, scroll reset. `boot()` now adopts the late batch
>   quietly (`adoptLateBatch()`: state + `.js-price` patch + `rates`) whenever the first paint already showed
>   real products; `js/v166.js`'s background catalogue repair does the same through `Shivaa.softCatalogue()`
>   instead of `redraw()`.
>   **A3 · the curtain itself.** A full-screen maroon splash was painted on every reload and faded away.
>   `index.html` now sets `html.shv-warm` from localStorage **before the first frame** for a device that already
>   holds the catalogue, and the splash is never painted at all. Cold first visits keep the brand moment. The
>   warm paint cap also drops **700 → 250 ms**.
>   **B · SLOW LOADING was bytes and parse.** `app.js` + `rel.js` are minified by `tools/build-min.mjs` with a
>   sha256 banner that `qa/check-handoff.py` verifies, so a forgotten rebuild is a red gate and never a silent
>   old release: **1,282,512 B → 787,267 B raw (−39 %)**, 383 KB → 243 KB gzip, ~40 % less to parse.
>   index.html loads `app.min.js` + `rel.min.js`; the sources stay on disk and in the zip, so a rollback is two
>   script tags. Top-level names are never mangled (inline `onclick="…"` handlers call them by name).
> - **New instrument:** `Shivaa.v249.report()` — start (warm/cold), unasked repaints, and when they happened.
>   The old one still answers the other half: `Shivaa.v248.report()` = how long a tap took.
> - **Why v248 exists.** The owner: *“whenever you click any option or any button it waits for 3 seconds and
>   then starts loading the next page … it feels stuck … and loads very slowly for the first time also and
>   whenever we scroll after that.”* Three seconds is not slow rendering (a hash change plus one innerHTML is
>   ~90 ms here) — it is a **deferral**, and the audit found exactly three:
>   **1 · the view transition** (`js/v226.js`) called `preventDefault()` on the link, rasterised a snapshot of
>   the old page and only then set the hash, inside a callback behind a 300 ms cap and an rAF. It made the
>   document non-interactive while the browser painted two full-page snapshots — on a phone, on every tap.
>   **It is opt-in now** (`?vt=1`) and off by default.
>   **2 · `window.scrollTo({top:0})` under `html{scroll-behavior:smooth}`** — the new page rendered at the OLD
>   scroll offset and the document glided home, so a tap looked like *nothing … nothing … it starts*.
>   The router now asks for `behavior:'instant'`, `css/v248.css` makes `auto` the last word, and a 700 ms hold
>   around any tap keeps it that way.
>   **3 · rail centring** (a smooth `scrollIntoView`) on the very chip that was about to be replaced — skipped
>   for any link that navigates.
> - **First load is no longer a curtain.** `index.html` already ships a page skeleton; the opaque preloader used
>   to cover it until the whole boot batch answered. It now lifts at **260 ms** in every case, and the cold
>   paint ceiling drops **6 s → 4 s** (every unknown price is a skeleton, never ₹0). With every request made to
>   hang forever, the skeleton is still on screen — that is a test (`opts.stall`).
> - **Scrolling after a tap:** `lazySweep` ran three times per navigation (0 / 900 / 2600 ms), each run forcing
>   style+layout on every image — now once on the next frame plus the 2600 ms one; entrance animations and image
>   fades stand down while `html.shv-scrolling` is on; the 110 KB of decorative scripts (v117 → aurum/motion/
>   boost) wait for **700 ms of real quiet** instead of an idle window that opened mid-gesture.
> - **The next report must be evidence, not adjectives.** A tap meter records press → hash → page → paint for
>   the last 12 taps and every long task: `window.Shivaa.taps()`, `window.Shivaa.v248.report()` (one line to
>   paste), or `?tapdiag=1` for the numbers on screen.
> - **Before anything else:** `bash qa/where-am-i.sh` → exit 0 FORWARD (exit 3 = this tree is behind;
>   stop and move to the release branch it names). Then `python3 qa/check-handoff.py` and
>   `node qa/browser/t-v250-still.mjs` (34).
> - **The owner's two reports, in order.** v246 answered “doesn't load everything fast” (5,113 KB → 1,832 KB
>   of pictures on the phone home screen, 33 script requests → 2). He then wrote *“it is better than before
>   but still not as perfect as I want a smooth UI UX … like a premium designer”* — so v247 is about how the
>   page FEELS, and the feeling was being spent on decoration:
>   **1 · a page at rest cost money.** `will-change: transform` and `transform-style: preserve-3d` on ten
>   card families, a BASE `transform: scale(1.08)` on every card photograph, `.pc-body{translateZ(10px)}` on
>   the text inside every card, and a 24 s infinite Ken Burns across the first screen. Measured on the home
>   screen: **37 elements in a 3D context and 23 compositor layers → 1 and 14** (the 14 are magnetic-press
>   buttons; a thumb cannot hover, so the phone drops those too). Hover keeps its lift, under
>   `@media (hover:hover) and (pointer:fine)` only.
>   **2 · v215 hid every content image by default** (`opacity:0`, waiting for motion.js to add `.img-ok`). A
>   picture that missed that class was invisible for good. v247 fades from the VISIBLE side: the image is
>   visible from the start, and animates in on its own load event with a 4 s failsafe.
>   **3 · touch now answers in 90 ms** — no grey tap rectangle, `touch-action: manipulation` (no 300 ms
>   double-tap hesitation), press feedback, focus-visible rings, and a **16 px input floor** so iOS never
>   zooms the page on focus.
>   **4 · one motion vocabulary** — five tokens in `css/v247.css` (`--sx-*`), opacity/transform only,
>   balanced headline wrapping, tabular numerals for money, a 240 ms route rise, and
>   `prefers-reduced-motion` last so it wins. `?nofx=1` kills the layer too.
> - **Speed this release:** the home screen paints at **700 ms** when the device already holds the
>   catalogue, instead of waiting for the gold rate. The price slot renders as a **skeleton** (`.pr-sk`,
>   never ₹0 and never ₹NaN) and the `rates` event patches every `.js-price` in place. The **six second**
>   ceiling still stands for a cold device, a deep link and every other route. The campaign banner and the
>   nine film posters now have 560/320 webp siblings: the phone home screen is **1.46 MB** of image markup,
>   from 5.11 MB at v245.
> - **Two real bugs found while measuring:** the trending strip and the recently-viewed strip printed
>   **₹NaN on every card** — the API's `price` field is an object (`{metalValue, gst, total…}`) and both
>   templates did `Math.round(x.price)`. They now use the same `moneyOK()/priceHTML()` path as the grid.
> - **HARD RULES (do not re-learn these the hard way):** no `content-visibility`; no `overflow-x: hidden`
>   on `html/body`; never write `images[0]` into `src=` (every picture goes through `thumbAttrs()`); never
>   add a `<script>` tag per layer (add it to `tools/js-bundle-order.txt` and rebuild `rel.js`); never
>   leave an image hidden by default; never `will-change` a card at rest.
> - **Gate status — be honest about it:** `t-v247-premium` **53/53** · `t-v246-light` **58/58** ·
>   `t-v245-scroll` **39/39** · `t-v244-butter` **54/54** · `t-v243-header` **36/36** · `t-v242-taps`
>   **40/40** · `t-v241-perf` **43/43** · `t-v240-rip` **16/16** · `check-handoff.py` 0 red — **339 checks**.
>   jsdom sweep of 8 routes × phone/PC: 0 page errors, 0 hidden pictures, no NaN.
>   **jsdom has no scroll engine, no compositor, no animation clock and no network** — the layer counts, the
>   byte counts and the cascade are real here; the *feel* is the owner's device.
> - **If he still says it feels heavy:** ask for `?perfdiag=1` + the phone model, and look in this order —
>   (1) is `rel.js?v=247` the script in the Network tab, (2) does `window.Shivaa.v247.audit()` report
>   `compositedLayers` ≤ 15, (3) the `/api/rates` round trip, (4) `?nofx=1` to take every animation out of
>   the picture.
> - **v246 and older detail stays below as history.**




# Shivaa — agent working guide

> **The one-line answer (21 Oct 2026): LIVE is v232, next is v233, work on
> `arena/e8a470c6-shivaa-ecom`, and run `bash qa/where-am-i.sh` before touching a file.**
> Machine truth: `docs/release-ledger.json`. Paste-first handoff: `docs/NEXT-CHAT-HEAD.md`.
> Everything below that calls v180–v222 "live" or "newest" is **history** — it is kept for the
> lessons, not for the current state.

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
