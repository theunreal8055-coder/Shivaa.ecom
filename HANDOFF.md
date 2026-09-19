# SHIVAA JEWELLERY — HANDOFF DOCUMENT

**Last updated: 2026-09-19 (v157 — SHIVAA EVERYWHERE · the last Jaipur survivors · THREE MORE BUGS DEAD. Branch `arena/01a0babd-shivaa-ecom`, branched off main `60a0896` (the v156 tip). The owner re-sent the v156 brief verbatim, so this session first RE-VERIFIED v156 with a full fresh belt (incl. executed PHP 8.3 — jsdom + `@php-wasm/node` installed in the sandbox) and then finished what it had missed: **(1) the sweep's four survivors** — the buyback hero badge `LIVE JAIPUR RATE` → **`LIVE SHIVAA RATE`** (v156's exact-string dead list could not see the reordered phrase), the PWA manifests (`Shivaa Jewellers — Jaipur` → **`Shivaa Jewellers`**, both descriptions), **77 product descriptions** ("…the live Jaipur bullion rate…") rewritten in `db.json` **and** normalised at the display boundary by the new `cms/hallmark.php · shv_storefront_copy()` inside `hallmark_product()` (the live DB is never shipped — storefront copy flips to Shivaa on extract, the stored row/Admin/partner views keep the raw text; executed-PHP proven, incl. a pin that real geography is never rewritten), and admin-generated **customer collateral** (rate-card image `BIS HALLMARKED · SHIVAA`, poster subtitle, the two rate-engine labels) while the geographic address line stays. **(e) the true last survivor was in shipped MARKUP, not copy — the rate-card wrapper class `jaipur-hero` → `shivaa-hero`**, caught only after a new gate was written for it: `tools/mega/smoke/v157-render.js` boots the real shell, renders 34 B2C routes and sweeps the rendered text AND markup case-insensitively, allow-listing real geography (8 mentions) — final verdict 0 rate-brand mentions. Because the rename lives in CSS as well as JS, `css/styles.css` now rides in the zip (byte-identical to the v107 drop outside the rename, verified) and its `?v=` stamp moved 107 → 157 in BOTH index.html and the sw precache, so no browser can pair the new markup with the year-immutable old stylesheet. **(2)** the **24K ₹398/g premium** (v156) is carried forward and now reaches the last bypassing surface: the **Finale 10 g prize** read the raw fine anchor (₹398/g low) → now `state.rates.gold24` first, 10 g = **₹1,54,820**. **(3) three more real bugs**, all the poll-rerender family, reproduced before / proven after: **B4** the compare page rebuilt every 1 s tick (table `scrollLeft` 120→0, node replaced, mid-tick taps swallowable) → `refreshComparePage()` patches `data-cmp-*` hooks in place; **B5** the buyback "LIVE" valuation was frozen at render → `_bbLive` re-runs the maths in place (input + slider survive; ₹1,42,260 → ₹2,84,520 on a doubled market); **B6** Swarna Nidhi promised grams at the render-time rate → `_svLive` re-projects in place (8.44 g → 4.22 g; ₹ input + slider untouched). Both listeners self-detach when their calculator leaves the DOM. Stamps 157 lockstep (index `__SHIVAA_REL` + loader `?v=157`, sw `shivaa-shell-v157`, APP_REL, api `'rel' => 157`). **Deliverable: `shivaa-update-v157.zip` (md5 `db0b867c2c2c7a203f05c123cfc6d723`, sha256 `6e0afa26…b1b9ef78`, 9 files — api.php, css/styles.css, hallmark.php, index.html, manifest.json, manifest.webmanifest, sw.js, js/app.js, js/admin.js; NO db.json/.htaccess) → extract into `public_html/cms/` → verify `/api/version` rel:157 → deploy guide `DEPLOY-v157.md`.** QA: **v157-check 27/27 · v157-live 26/26 jsdom×4 · v157-php-run 14/14 executed PHP-8.3**, all three green on the zip overlay too; regression belt green (v156-check 33/33 with forward-tolerant stamp pins, v156-cart 24/24, v155-check 34/34, v155-direct 24/24, v154-php-run 11/11, v139–v142, v113b–v127 incl. v125 27/27) · php-sweep 208 routes/0 exceptions (same inventory as v156). NEXT CHAT: owner extracts → live shows LIVE SHIVAA RATE on the buyback page, zero "Jaipur rates" copy, product descriptions say "the live Shivaa rate of the day", compare/buyback/savings follow the feed; B2B/RTGS untouched. ** )**

*** Previous: 2026-09-19 (v156 — SHIVAA RATES · 24K PREMIUM ₹398/g · THREE BUGS DEAD. Branch `arena/01a0ba4b-shivaa-ecom`, branched off main `b3e7f6d` (the v155 tip). Three owner orders, all B2C-only: (1) EVERY customer-facing "Jaipur" rate string renamed **Shivaa** — ticker `SHIVAA LIVE`, rates badge `✦ SHIVAA LIVE RATE`, all four rate tiles, both premium rows, terms/FAQ/cart/quote/compare/buyback/savings/metal/certificate copy, v107 tracking line, sidebar, contest quiz — while real geography (Jaipur/Nagaur pickup, city chips, reviewer hometown) keeps its name and **B2B (bullion desk · partner portal · RTGS board · admin console) is byte-untouched and pin-proven**. (2) The **24K line now carries the SAME ₹398/g desk premium as 22K** (owner chose "same total"): new `gold24_premium()` + `gold24Premium` admin knob (default 398) feeding `jaipur_from_anchor()` AND the `current_rates()` fallback; `premium.gold24` published; the Live Rates card shows BOTH premiums (+₹398/g 24K above +₹398/g 22K, live-patched). Legacy ₹55 jaipurPremium now feeds ONLY the 18K line (×0.75). 22K/18K/silver math byte-identical; the executed-PHP run proves the RTGS block is identical with the premium at 398 vs 500 — **the B2B desk never noticed**. (3) Bugs: **B1** the v120.js openHash-'' history leak (the bug documented at v127 and held for the owner's word) — one drawer-open on a bare visit pushed one dead history entry per class mutation; now sentinel-initialised + strict compares. **B2** the 1 s rates poll rebuilt the WHOLE cart page, wiping the pincode delivery input mid-typing — `refreshCartPage()` patches in place; only the free-shipping structural flip re-renders, carrying the pincode (jsdom-proven with focus + DOM markers through the real `online`→`loadRates` path). **B3** drawRateChart divided 0/0 on a single-stamp/dead-feed history — positive-finite filter + ≥2 points now. Stamps 156 lockstep (index __SHIVAA_REL + loader `?v=156`, sw SHELL+PRECACHE, APP_REL, api `'rel'   => 156`). **Deliverable: `shivaa-update-v156.zip` (md5 `b5c1c6ea9fae91c5bb3e15c50be72518`, sha256 `a6b8bc4a…2e0b12`, 7 files — api.php, index.html, sw.js, js/app.js, js/admin.js, js/v107.js, js/v120.js) → extract into `public_html/cms/` → verify `/api/version` rel:156 → deploy guide `DEPLOY-v156.md`. QA: v156-check 33/33 · v156-cart 24/24 jsdom · v156-php-run 14/14 executed PHP 8.3 — also all green on the zip overlay via SMOKE_CMS; full regression belt green (v155-check 34/34 with its new ≥156 era-guard, v155-direct 24/24, v154-php-run 11/11, v139 56/56, v140 17/17, v141 5/5, v142 13/13, v113b 32/32, v117–v127 all green incl. v119's two Jaipur-copy pins era-guarded to the Shivaa copy). NEXT CHAT: owner extracts → live shows SHIVAA LIVE + both premium rows + 24K ≈ anchor+₹398 + unchanged RTGS board; admin has the new 24K premium knob (moves only 24K, php-proven).** )

*** Previous: 2026-09-19 (v155 — THE SILENT LANE, the owner's release order EXECUTED. Third repeat of "redirect customers directly to the cashfree payment portal…" now means ZERO Shivaa pixels between tap and portal: the lane is ONE boundary order + ONE fresh Cashfree session opened the instant it mints — overlay machinery (exBusy/exShell/#shvExCard) deleted, the order-view helper's retry-hardening left to the order view, declined handoffs land silently on the order view (Retry+QR+pin), refused orders toast once. Reclaim resume: order view FIRST, silent re-mint on top — can re-PAY, never re-PLACE. v155 ALSO killed a race alive since v153: busy-flag is now claimed before any await, so double-taps cannot place two orders (storm-tested). Server physics = v154 BYTE-IDENTICAL (exact boundary signature + owner switch + live Cashfree arm it; paid sweep promotes Cashfree-verified contact onto the order; switch off ⇒ classic checkout + guest lane 401). The whole v152→v155 arc is one zip: `shivaa-update-v155.zip` (md5 `1c79556e77fc7277d6e56fb849422784`, 5 files) — but it is ALSO MERGED INTO MAIN now: owner said "push all the changes to main repository and push the PR and merge" → **main = truth: PR #74 (the only PR this head-branch can have) was RETITLED to "v150–v155 · The great amputation" and MERGED @ `8d23968` on the owner's repeat-order — merge delivers the TIP tree (v155), so the old v147 framing never re-enters main; verified: rel 155, zero Truecaller, zero overlay machinery.** QA 37/37 + 24/24 + 11/11 executed-PHP, source AND prod-shaped overlay; era-guarded legacy suites skip-and-survive. Deploy = extract v155 into public_html/cms/ → /api/version rel:155 → tap from any device lands on Cashfree with nothing visible in between; paid orders carry the REAL swept contact in Admin. **SESSION CLOSED with the merge. #65/#67 stay open-stale BY DESIGN; Truecaller revival (if ever asked) = rebuild on main, since #74 merged the CLEAN v155 tip. ** )

*** Previous: 2026-09-19 (v150 — TRUECALLER ENDPOINT NORMALISATION + SELF-REPORTING DOCTOR. Hiccup root: the fetch was hitting the bare profile host — /v1/default was never appended. api.php-only fix: normaliser + UA + redirects + digit-masked snippet evidence + JSON-in-string + split refetch error. Zip shivaa-update-v150.zip md5 94c592867c2373519d9ea640f7f6713f PUSHED, UNDEPLOYED until owner extracts; rollback = v149 zip. **SESSION CLOSED 19 Sep — `be2c57c`+`3c0cf59`+`589c34a` pushed, final gates green, owner replied with root cause + deploy steps; PR #74 stays OPEN unmerged. Next chat: follow the ▶ NEXT-CHAT PLAYBOOK in ARENA-STATE.md §1 — deploy confirmed → mark LIVE-VERIFIED everywhere; hiccup residual → the config JSON (lastEp + masked snippet) tells the fix.** Prior: v149 — INSTANT ONE-TAP + SELF-HEALING PROFILE READ. UNDEPLOYED until the owner extracts `shivaa-update-v149.zip` (md5 `7b4b08912fe874ea6b153b8323b9361d`, 4 files, root layout; rollback = v148 zip). Two live-verdicts fixed: the "reading the number hiccuped" (doctor-proved: profile 200 but v148 read only two keys → now a deep recursive extractor + body fallback + a same-token server REFETCH before any re-tap + key-name diagnostics; failed entries keep tk/ep, files chmod 0600) and the owner's flow order (Buy Now/Checkout now fire the Truecaller sheet IN PLACE with a floating pill — no Express page on the happy path — verified number places the order silently and Cashfree is the FIRST page; declines hand off to #/express with the same nonce; reclaimed tabs resume at boot. Cashfree's page cannot host third-party JS, which is why the tap moved before it instead of onto it.) Stamps 149/149/149/149, admin loader stays ?v=147. All gates ✦: v149-check 31/31 · v149-php-run 12/12 · v149-tc-instant 20/20 · 19 legacy suites + patience + autobuy + pay-audit 10/10 on the stacked overlay. PR #74 OPEN, unmerged. v148 is LIVE (sw.js verified).)*** Previous: 2026-09-19 (v147 — TRUECALLER ONE TAP → CASHFREE, zero typing. **✅ LIVE — the owner extracted it 19 Sep; agent verified the stamps on the site and a REAL Truecaller consent callback landed with `dataWritable:true`.** Git tip `3e8d8b9`; PR #74 still OPEN, unmerged. Zip `shivaa-update-v147.zip` md5 `5e8e5af76d31aac5bcea7eed761aad4c`, 5 files, extract into public_html ROOT + `DEPLOY-v147.md`. After the tap the verified number arrives via Truecaller's server callback and the page places the order + opens Cashfree BY ITSELF — typing is fallback only. The make-or-break owner step — setting the Callback URL at developer.truecaller.com — is DONE: the deployed doctor shows the console posting to `https://shivaa.in/api/auth/truecaller/callback` (apex form) and has already recorded a real consent callback (Admin → Payments → Truecaller keeps the doctor for future checks). QA note for agents: real PHP execution now works in the sandbox via @php-wasm/node — the "no PHP binary" era is over.)** Previous: 2026-09-19 (v146 — cart checkout crash + Truecaller rebuilt. Live was v144. Zip `shivaa-update-v146.zip` md5 `a78fbe885808a4e8cdc9a66210a50674`, 5 files. Extract into public_html ROOT. Truecaller: type the number you saw after returning from the app — do not wait on the Hostinger callback.) Previous: 2026-09-18 (✅ v142 AUTOMATIC GUEST CHECKOUT MERGED to `main` as PR #71; v140 → v141 → v142.) Owner brief: *"Make the most advanced and Fully automatic checkout, without even otp, still verifying the name number address and payment methods automatically — once a person clicks make it yours then it's automatically purchased, just the customer needs to fill their UPI pin or NetBanking password, everything else is automated."* Tap **Make It Yours** (signed-out) → order placed instantly → Cashfree's page → name/number/address auto-verified + saved payment method shown → the customer types **only** their PIN/password. Ships **OFF by default** (Admin → Settings → Payments → "⚡ Automatic Guest Checkout (One-Tap Buy)"); deploy `shivaa-update-v142.zip` (md5 `87f56fb46b63af6a4b793ca95abad6a9`, 6 files). Cashfree's rule: a brand-new number verifies once on Cashfree's page; every later purchase is tap → PIN → done. A live sandbox ₹1 order is still owed.
**v139 STATUS: MERGED TO `main` AS PR #70 (18 Sep 2026).** Whether that merge auto-deployed is UNCONFIRMED (`gh secret list` 403) — ask the owner.**
**v124 STATUS: MERGED — PR #49, merge commit `5145ab2` on `main` (16 Sep 2026). v123 STATUS: MERGED + LIVE — merged as PR #48 (`bfc3908`) into `main`; owner live-verified 16 Sep, `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'`.**
**Forward baseline: v125 ONLY (owner-frozen 16 Sep 2026). No new release, no stamp bump, no file swap, no "repair" — until the owner explicitly asks for a change. Never restore the v113b placeholder category tiles. v126 and the v125-fix zip are dead — do not resurrect, reference or re-deploy them (see `MEMORY.md` → OWNER'S RULING).**
**Live site: https://shivaa.in (owner-confirmed v125 after his own restore) · Repo: theunreal8055-coder/Shivaa.ecom**
**THIS FILE IS THE SINGLE SOURCE OF TRUTH. It is on GitHub. Any new chat reads this and continues.**

---

## ⛔ v125 FROZEN — v126 REVERTED + OWNER RULING (16 Sep 2026, branch `arena/01a0ab0c-shivaa-ecom`)

**The live website is v125 and STAYS v125 — the owner's explicit, final word: "my website should be v125 only and no changes."**

**Timeline (owner-reported + repo facts):**
1. v125 shipped (PR #51, `b2eb791`): the nine owner films — Revolving Case (4) + Gold Thread (5). Owner confirmed good.
2. v126 (PR #53, `b6c0432`) deployed by the owner → **the live site became "ugly — all elements scattered and all images blurred"** (owner's words). Root cause never forensically pinned down (mixed-version serving / partial upload are the candidates; the v126 code itself passed 264/264 gates). **Do not relitigate it.**
3. The owner restored it himself: full `public_html` backup zip → extract → `shivaa-update-v125.zip` over the top → "now everything is ok".
4. A follow-up 3-file "v125-fix" zip (sw.js v125 shell + restored `js/boost.js` + `css/boost.css`, byte-identical v125-era files) was then deployed by the owner → **made the site bad again in his judgment.** The fix artifacts were removed from the branch tip and are referenced nowhere.
5. v126 was **REVERTED to v125 film behaviour via PR #55** (merge `43eae10` on `main`). `cms/` is pure v125.
6. Owner ruling (verbatim): "please dont be oversmart now i just feel my store right, you just forget everything you did for v126 and for v125 fix zip, ok?" → **Standing law, recorded in `MEMORY.md`: v125 = the stable live baseline. Do not propose, build, upload or reference v126, `shivaa-update-v126.zip`, or the 3-file fix in any session — unless the owner himself explicitly asks.**

**Lessons (labelled lessons, not facts):**
- "Byte-identical to an old file" ≠ "safe to deploy". On this site, swapping `sw.js` out-of-band makes every visitor's service worker wipe + re-fetch its whole cache, and the v125-era `boost.js` re-mounts ~47 MB of eager autoplay films. Both churn what the owner experiences, regardless of the bytes' provenance.
- The owner's recovery pattern is the official one: **download the full `public_html` zip first → extract the last-known-good zip over the top.** He has run it twice successfully.
- Any future change, only if the owner asks: (1) owner backup zip FIRST; (2) ONE small numbered zip, root layout, minimum files; (3) `sw.js` never swapped in a "repair" — only in a full release that re-stamps everything; (4) owner extracts, owner verifies, nothing is "shipped" until he says so.

**Repo state (re-verified 17 Sep 2026, branch `arena/01a0ad8d-shivaa-ecom`):** fix zip + `DEPLOY-v125-FIX.md` deleted from the branch tip; `main` = `43eae10` (v125, PR #55 revert) + handoff updates only. **Correction to the 16 Sep note above: nothing named v126 exists in the repository any more** — `git ls-tree -r --name-only origin/main | grep -i 126` returns empty, and so does the same command on every later branch. `shivaa-update-v126.zip`, `DEPLOY-v126.md` and the v126 tools are gone from the tree, not merely inert; no cleanup is pending. The word "126" survives in `cms/` only as colour values (`rgba(228,201,126,…)` in `styles.css`) and QR-code tables in `js/qr.js` — neither is a version reference.

---

## 🔧 v127 — THE NAVIGATION REPAIR: search-bar categories + every sidebar button (2026-09-17, branch `arena/01a0ad8d-shivaa-ecom`)

**Owner's brief (17 Sep 2026):** *"in the search bar whenever you click on any category it
directly shifts us to the homepage rather than that category … in the sidebar whenever you
click any button — Live Rates, Swarna Nidhi, Gold Buyback — it directly takes us to the home
page. They are perfect in line, shape and text, but they do not direct us to anything; the
buttons are there but they are not functional. Make the buttons of the search bar and
sidebar perfect and functional. Do not touch anything other than that. Just give me an
update zip, only these two changes."*

**This is a REPAIR on top of frozen v125, not a release.** `__SHIVAA_REL` / `APP_REL` / SW
`SHELL` all stay **125**. **`sw.js` is not in the zip** — owner rule #3 (the worker is never
swapped in a repair). No `app.js`, `v120.js`, `.htaccess`, `api.php` or `db.json` change.

| Owner said | Root cause found (reproduced, not guessed) | Fix |
|---|---|---|
| "a search-bar category takes me to the home page" | `app.js` dismissed the palette **inside** the click and let the anchor's own default action navigate (`if (cat) { closeSearch(); return; }`). `js/v120.js`'s back-button helper sees a sheet close on an unchanged hash and calls `history.back()` to release the entry the open pushed. The tap therefore queued a traversal **and** pushed the new hash; in a real browser the traversal runs after and drops the shopper on the pre-overlay entry — the home page. **Instrumented proof:** `[v120] close search was="#/" … sameHash=true nav=false` → `history.back()`. jsdom's traversal order hides it, so the gate counts `history.back()` calls instead of trusting the final hash. | navigate **first**, dismiss **second**, with `window.__shvNavigating` armed (the house flag `v120.js` already honours) so no traversal can be queued against a navigation in flight |
| "every sidebar button is dead / takes me home" | every drawer row (`#/rates`, `#/buyback`, `#/savings`, `#/services`, `#/catalogues`, `#/finale`, `#/b2b`, the four photo tiles, the 17-category list, the three footer links) leaned entirely on the browser's native anchor action with the drawer closing 90 ms later — **the app never performed the navigation itself.** Anything that swallowed or out-raced that default action left the tap dead, and a dead tap while standing on the home page reads exactly as "it took me to the home page". | `js/v127.js` owns the tap: `preventDefault()` → arm the flag → set the hash itself → then shut the drawer. A same-hash tap calls `Shivaa.redraw()` (debounced 250 ms) instead of dying. |

**Files (2):** `cms/js/v127.js` (new, 8.5 KB) + one `<script src="/js/v127.js?v=127" defer>`
line in `cms/index.html`, loaded **last** so it takes the tap before any older layer
dismisses the sheet first. Capture-phase listeners on `#mainNav a[href^="#/"]` and
`#searchSugg a.sugg-cat`. Dialer links, external links and ctrl/⌘/shift/alt-clicks keep
their native action; the palette's product / popular / recent rows are untouched.

**Two traps the gate caught that reading did not:**
1. **`e.defaultPrevented` must not be a bail-out.** `js/v118.js` preventDefaults a
   same-hash *category* tap in the document capture phase (it redraws). Bailing on it
   handed the tap back to the old dismiss-first path — the sheet closed with
   `__shvNavigating` false and `history.back()` fired again — and left the drawer stuck open
   on a repeat tap. The layer now owns the tap regardless and debounces the double redraw.
2. **A repair must not swap `sw.js`,** but `v117-check.js` demands precache == shell
   requests. Resolved the house way (forward-compatible, not edited down): `v117-check.js`
   gained a documented `NETWORK_ONLY` allow-list naming `/js/v127.js?v=127` — the worker is
   network-first for scripts, so its fetch handler caches the new file on first paint. The
   gate still fails on any other gap and on any relic (**verified** by adding a dummy
   `<script>` and watching it fail), and fails on a stale allow-list entry.

**Found but deliberately NOT touched (ask the owner first):** `js/v120.js` stores
`openHash[id] = location.hash`, which is the **empty string** on a bare `shivaa.in/` visit —
falsy — so on the home page the close branch never runs and *every* class mutation while a
sheet is open pushes **another** history entry (instrumented: 2 pushStates for one drawer
open). It pollutes the Back button; it does not bounce navigation. Fixing it means editing
`v120.js`, which this repair was told not to touch.

**Gates: 252/252 on source AND on the built zip overlay** (v113b 32 · v117 27 · v118 18 ·
v119 27 · v120 24 · v121 14 · v122 22 · v123 14 · v124 20 · v125 27 · **v127 27**) ·
php-sweep **211 routes · 0 exceptions**. `tools/mega/smoke/v127-check.js` boots the real
shell, taps every button the owner named, asserts `history.back()` is never queued against a
tap, and carries a **named regression check**: the same chip tap on the shell with
`js/v127.js` stripped out **does** fire `history.back()` — proof the bug was real and that
the gate still sees it if the layer is ever removed.

**Deliverable:** `shivaa-update-v127.zip` (**2 files, 11 KB**, root layout) + `DEPLOY-v127.md`
(backup-first runbook + an 8-step owner check list). **Live verification is the owner's — do
not record it until he reports it.**

### SESSION CLOSE — 17 Sep 2026 (owner: "have you updated any v126 files in v127?" → then "close this chat")

**The v126 question, answered with reads rather than assurances — NO, zero v126 in v127:**

| Check | Result |
|---|---|
| Contents of `shivaa-update-v127.zip` | 2 files: `index.html`, `js/v127.js` |
| Occurrences of the string `126` in either zipped file | **0** in each |
| Any `v126` file under `cms/js/` or `cms/css/` | **none exists** |
| `git ls-tree -r --name-only origin/main \| grep -i 126` | **empty** |
| same command on `arena/01a0ad8d-shivaa-ecom` | **empty** |
| files this branch changes inside `cms/` | **2** — `index.html` (+4 lines), new `js/v127.js` |
| `sw.js` · `app.js` · `boost.js` · `boost.css` · `.htaccess` · `api.php` · `db.json` | **all untouched**, triple stays **125** |

The only surviving "126" in `cms/` is colour values (`rgba(228,201,126,…)` in `styles.css`)
and QR tables in `js/qr.js` — neither is a version reference.

**State at close:** commits `da6e5cb` (the fix) + `d6782ba` (the stale-v126 doc correction)
+ this close, on `arena/01a0ad8d-shivaa-ecom`, pushed. **PR #59 → `main` was OPEN AND
DELIBERATELY UNMERGED at the time of writing** *(superseded — merged as `5ed09a5`, see MERGED TO `main` below)* — merging fires the Hostinger auto-sync cron within ~5 min and would
deploy `cms/` **before the owner has taken his backup**, breaking owner rules #1 and #4
(the v126 failure mode). **Do not merge it in a future session unless the owner says he has
his backup and wants it live.**

**⚠ THE LEDGER TRAP** *(now closed by the merge — kept as history)*: because PR #59 was unmerged, **this § v127, the `MEMORY.md` →
Session 2026-09-17 #2 entry and the `docs/AGENT-HANDOFF.md` note live ONLY on
`arena/01a0ad8d-shivaa-ecom` — they are NOT on `main`.** A new chat branching from `main`
will not see them. Recover first:
`git fetch origin arena/01a0ad8d-shivaa-ecom && git log --oneline -3 FETCH_HEAD`.
Deliverable `shivaa-update-v127.zip` (2 files, 11 KB, md5 `a3bc6214eaff1b19f43a6da9465966c0`).

**Pending, in order:** (1) owner takes a full `public_html` backup zip; (2) owner extracts
`shivaa-update-v127.zip` into the `public_html` ROOT — or says the word and PR #59 is merged;
(3) owner runs the 8-step check list in `DEPLOY-v127.md`; (4) only then is v127 recorded as
live-verified. Gates at close, re-run on the shipped zip's own contents: **252/252** +
php-sweep **211 routes · 0 exceptions**.

**Still open, deliberately untouched:** the `js/v120.js` falsy-`openHash` history-entry leak
(documented above). Ask the owner before fixing — it means editing `v120.js`.

### ✅ OWNER LIVE-VERIFIED — 17 Sep 2026 (this supersedes the "Pending, in order" list above)

**Owner's words (verbatim):** *"The version 127 update is working very fine and I installed it
and extracted in public HTML folder and its working fine now."*

**v127 is the live, owner-confirmed state of shivaa.in.** Per house law this is the first
point at which it may be recorded as live-verified, and it is now so recorded.

- **Independently re-checked from the sandbox (not just taken on report):** `fetch_page` on
  `https://shivaa.in/js/v127.js` returned **HTTP 200 with the full, correct file** — the v127
  header comment, `arm()`, `navigate()`, `onDrawerTap()`, `onPaletteTap()` and the capture-phase
  `bind()`, all as shipped. **The `<script src="/js/v127.js?v=127">` tag in the live shell was
  NOT directly read** — the fetch tool returns markdown and strips `<script>` elements. It is
  inferred, not observed: the tag can only be absent if `index.html` was not extracted, and
  without it the layer never loads and the buttons could not work, which the owner confirms
  they do. Both files ship in the one zip, so extracting it necessarily replaced both.
- **How it got live:** the owner's own path — he extracted `shivaa-update-v127.zip` into the
  `public_html` **ROOT** himself. **The Hostinger auto-sync cron was NOT involved in that install**
  (PR #59 was merged later, as `5ed09a5`). Live tree = v125 + the two v127 files, nothing else changed.
- **⚠ HOW TO CONFIRM v127 IS LIVE — the old trick no longer works.** Every previous release
  was verified by reading `https://shivaa.in/sw.js` for the `SHELL` stamp. **That will still
  read `shivaa-shell-v125`, and that is CORRECT, not a failed deploy** — v127 is a repair and
  deliberately left `sw.js` and the version triple alone. The live proof of v127 is:
  `https://shivaa.in/js/v127.js` returns real JavaScript, and view-source of
  `https://shivaa.in/` contains `<script src="/js/v127.js?v=127" defer>`.
  (Sandbox has no route to shivaa.in — `fetch_page` can read it, bash/curl cannot.)
- **Confirmed working on the owner's device:** search-bar category chips land on their own
  category; the sidebar buttons (Live Rates, Gold Buyback, Swarna Nidhi, and the rest) land
  on their own pages. No regression reported.
- **PR #59 was OPEN and UNMERGED at this point** *(superseded — merged as `5ed09a5`)*. The reason for holding it (deploy before the owner's
  backup) no longer applies — he has deployed and verified. Merging now is safe in principle:
  `main`'s `cms/` would match what is already live, so the auto-sync cron would deploy
  identical files, and it is the only way this ledger reaches `main`. **The owner has not
  asked for the merge, so it has not been done. Ask him; do not merge unasked.**
- **Forward baseline from here: v125 + v127.** A later release must preserve both. The v127
  layer owns the sidebar and search-palette taps, so anything that edits drawer or palette
  markup must keep `#mainNav`, `#searchSugg`, `a.sugg-cat` and the `href="#/…"` contract
  intact, and must re-run `v127-check.js` (27) with the other gates.

### ✅ MERGED TO `main` — 17 Sep 2026, 05:15 UTC · merge commit `5ed09a5` (PR #59)

**The owner chose to merge, so this supersedes every "PR #59 is OPEN/UNMERGED" and every
"the ledger is NOT on `main`" statement above — those were true when written and are kept as
history.** Verified after the merge, by reading `origin/main` rather than assuming:

- `cms/js/v127.js` present on `main` (8465 bytes) ✅
- `cms/index.html` on `main` references `/js/v127.js?v=127` (1 occurrence) ✅
- `shivaa-update-v127.zip` on `main` (10896 bytes) ✅
- `git diff origin/main HEAD -- cms/` → **empty**: `main`'s `cms/` is byte-identical to the
  tree that passed 252/252 and to the files the owner installed ✅
- `git ls-tree -r --name-only origin/main | grep -i 126` → still **empty** ✅
- Fast-forward from `4be9a54`; no conflicts possible, nothing else on `main` was touched.

**The ledger trap is closed:** a new chat branching from `main` now sees v127 as the newest,
live, owner-verified state. **`main` tip = `5ed09a5`.**

**Deploy note:** merging fires the Hostinger auto-sync cron, which re-deploys `cms/` to
`public_html` within ~5 min. That is a no-op for the shopper — the cron would write the same
two files the owner already extracted by hand — and it excludes `data/` and `uploads/`, so the
live database and media are untouched. (The cron has failed silently once before, v119/PR #45;
if it does not fire, nothing is lost, because the owner's manual extract is already live.)

---

## 🚀 v126 — THE LAPTOP: film budget · the glow · the desktop layer (2026-09-17) — ⛔ DEAD

**⛔ STATUS: REVERTED + DEAD. Deployed by the owner, reported broken by him ("ugly — elements scattered, images blurred"), restored by the owner (backup zip + v125 re-extract), code reverted via PR #55 (`43eae10` on `main`), and ruled dead by the owner on 16 Sep 2026. Do NOT re-deploy, reference or build on top of v126 in any session unless the owner explicitly asks. The history below is kept for the record only.**

**Original status (for the record): MERGED — PR #53, merge commit `b6c0432` on `main` (17 Sep 2026). `shivaa-update-v126.zip` (10 files, 216 KB) sits at the repo root on `main` — inert now. Owner live-verification is moot: he reported the deployed site as broken.**

**Built from one laptop screenshot + one phone report. Four complaints, one release.**

| Owner said | Root cause found | Fix |
|---|---|---|
| "on the laptop it loads very slowly" | `boost.js enhanceHome()` mounted **five eager autoplay films** the moment the home template existed — `hero.mp4` 16.3 MB + heritage 7.5 + bridal-lux 6.0 + rings-worn 6.1 + gold-flow 11.8 ≈ **47 MB** — with `src` + `autoplay`, no device/save-data/viewport guard. On top of that v125's nine films (`preload="metadata"`) and the bridal CTA film. | Every film now ships **cold** — poster, `preload="none"`, URL parked in `data-film`. New `js/v126.js` is the only thing that hands out bytes, under a budget. |
| "more than 70 percent of the screen is empty" | The 1240 px column leaves both margins bare on a wide screen, and the first paint was blocked by the films above. | **Desktop-only** gutter rails (hairline gold thread + quarter motifs + a scroll ember, ≥1280 px, mouse only), a clickable four-chapter rail under the Revolving Case, chapter medallions + filigree in the Gold Thread, wider rows and bigger films. |
| "the gold thread doesn't glow" | v125 drew a plain 2.4 px gradient stroke — a line, not light. | Two halo strokes under it (outer blurred via `#svGlowF`), a CSS drop-shadow bloom on the stroke, an ember riding the tip from `getPointAtLength`, and a gold halo on each chapter as it ignites. |
| "on mobile the fifth film doesn't load" | Nine films × `preload="metadata"` competing for ≈4 phone decoders, served in creation order — the **last** in the queue (thread 05 · Forever, Reimagined) was starved. | The budget (3 on a phone), warming on approach, eviction of the furthest film, retry on error/stall, and a 2.2 s watchdog that re-arms any film that wants to play but has no frames. |

**The film budget, in one line each:** 4 live films on a laptop · 3 on a phone · **0**
under Save-Data / au-lite (posters only, as v125 already promised). Warms at 75 %
of a viewport away, plays at 22 % visibility, evicts the live film furthest from
the viewport, retries `error`/`stalled` twice then parks on the poster. The
16 MB hero film additionally waits for `load` + 2.2 s of idle.

**The owner's question — *"should we introduce more elements and graphics only
for laptop/desktop users?"* — answered yes, and gated so a phone cannot see it:**
every desktop rule lives inside a `min-width` query, every desktop element is
created only when `(min-width:1024px)` / `(min-width:1280px) and (hover:hover)
and (pointer:fine)` matches, and `undesk()` removes all of it if the window is
later dragged narrow. The v126 gate boots a phone-shaped jsdom and asserts
**no rails, no chapter chips, no medallions** while both features and all nine
films are still present.

**⚠ Deploy note that matters this time:** `boost.js` is re-stamped
**`?v=46` → `?v=126`** in the v117 post-paint injector *and* in the worker
precache. If an old `boost.js?v=46` survives in a visitor's cache, the
eager-video build keeps running and **no speed change is visible**.

**Deliverable:** `shivaa-update-v126.zip` (10 files, 216 KB — **code only, no
media**; the nine owner films are already live from v125) + `DEPLOY-v126.md`
with a 2-minute Hostinger extract, a 5-check laptop pass and a 3-check phone
pass. `api.php` / `.htaccess` / `db.json` are **not** in the zip (rates LOCKED
at 398, catalogue untouched).

**Gates:** 264/264 on source **and** on the built zip overlay (v113b 32 ·
v117 27 · v118 18 · v119 27 · v120 24 · v121 14 · v122 22 · v123 14 ·
v124 20 · v125 27 · **v126 39**) · php-sweep **211 routes · 0 exceptions**.

---

## 🚀 v119 — 22K PREMIUM ₹398 (desk physical) + PUBLISHED RATE ANCHOR + FIRST-PAINT PACK (2026-09-15)

**✅ LIVE ON shivaa.in — VERIFIED FROM THE LIVE SITE (15 Sep 2026, 20:48 IST, reads not assumptions; re-confirmed 20:54 IST).**
Merged to `main` via PR #45 (merge `e2a4dd5`, 19:31 IST). `/api/rates` → `premium.gold22 = 398`,
`anchorLevel.mode = mcx-future`, `jaipur.gold22 = 14200` = `round(15056 × 0.9167) + 398`.
Every 22K piece is **+₹343/g** over v118. `/api/products` → all 22K rings ≈ ₹14,231/g;
PGS5004 (3.83 g) = ₹62,877. `/sw.js` → `SHELL = 'shivaa-shell-v119'`; `/js/v119.js` served as
real JS → the zip landed in the `public_html` ROOT (not a sub-folder). Re-check 20:54 IST:
anchor goldPerG 15040 → jaipur.gold22 14185 = `round(15040 × 0.9167) + 398` ✓ (formula holds
as the tick moves). **Rate factors LOCKED — never change a premium or the anchor formula
without an explicit owner instruction.**
**Deploy warning:** the server's main-tracking auto-sync cron did NOT fire for PR #45 (live
still read v118 ~50 min after the merge); the release shipped by manual zip upload.
Investigate the cron (config branch value, GitHub PAT expiry, cron logs) before trusting
push-to-deploy for any future release. Post-merge, the owner uploaded
`67 rings ladies plain hitesh bhai_compressed.pdf` to `main` (`82dc23b`, zero `cms/`
changes — v119 code intact): next catalogue batch intake (ladies' plain rings, supplier
Hitesh). **PR #43 (pre-v118 Feather) and PR #38 (stale hero/Quick View) were closed
UNMERGED on 15 Sep 2026 — never merge them.**

**Owner decision implemented (Task 2, LOCKED — do not change the numbers):** the 22K
retail premium is **₹398/g on the desk-physical basis**. `/api/rates` now publishes
`premium.gold22` and an `anchorLevel` block, and `jaipur.gold22` is derived from that
one anchor:

* `premium: {gold22: 398, gold: 55, silver: 3}` — `gold` stays the 24K line
* `anchorLevel: {mode: "mcx-future" | "spot" | "override", goldPerG, silverPerG, source, at, ageMs}`
* `jaipur.gold22 = round(anchorLevel.goldPerG × 0.9167) + 398`
  (live example: anchor 15,084 → 13828 + 398 = **14,226**)
* 24K/18K lines keep `jaipurPremium` (55) untouched; an admin override still wins.
* Every 22K piece is **₹343/g** dearer than v118 (398 − 55). A 3.83 g ring (PGS5004)
  moved ₹61,340 → ₹62,855 — the per-gram rate is exactly +343, the total also carries
  the percentage making charge.

**Also in v119 (the first-paint/mobile pack, ported additively from the unshipped
PR #43 "Feather" line — never wholesale, PR #43 is pre-v118 and would revert v118):**

* **Skeleton** inside `<main id="view">` → real first paint before `app.js` runs;
  `body.shv-ready` retires it, `js/v119.js` adds a 9 s honest "tap to retry" safety net.
* **Shop slices:** the grid renders 20 cards, then grows via `#shopSentinel` +
  IntersectionObserver (`Shivaa.shopLoadMore()`); the filter/sort list is still whole.
* **HUID chip (honest):** prints a HUID only when the catalogue carries one
  (`p.huid` / `hallmark.entries[].huid` — all 63 records are `not_provided` today);
  otherwise it is a labelled *HUID check* guide to the BIS Care walkthrough.
* **Install chip** from the **2nd visit**, only when `beforeinstallprompt` fires; Close
  is remembered, `display-mode: standalone` hides it.
* **Pinch zoom** on the Quick View photo (1×–4×, never swipes a shot) + tap zoom kept.
* **.htaccess:** guarded brotli + `immutable` caching for `?v=` assets (deflate kept).
  **Merge it — never blind-overwrite** a panel `.htaccess`.
* Deliberately **skipped:** the PR #43 `srcset` (its `-400/-800` derivatives do not
  exist on the server; a missing file would trip every card's `onerror` fallback).

**Proof (all re-run on source AND on the extracted zip overlay):** v113b **32/32** ·
v117 **27/27** · v118 **18/18** · **v119 27/27** · php-sweep **211 routes · 0
exceptions**. The shipped `api.php` was additionally executed under a real PHP 8.5
(php-wasm) with a seeded MCX tick: `premium.gold22=398`, `anchorLevel.mode=mcx-future`,
`jaipur.gold22=14226` (matches the formula), plus the `spot` and `override` paths.

**Deliverable:** `shivaa-update-v119.zip` (10 files — `index.html`, `sw.js`,
`.htaccess`, `api.php`, `js/app.js`, `js/v107.js`, `js/admin.js`, `js/v119.js`,
`css/v119.css`, `DEPLOY-v119.md`) + `cms/DEPLOY-v119.md` with the merge-the-.htaccess
instruction and the 5-minute owner phone pass.

**Owner phone pass (5 min):** shop scroll slices · tap/pinch zoom · HUID chip · rates
page (22K premium + anchor) · install chip on the 2nd visit.

---

## 🚀 v112 — PayU + Bullion LIVE FIXES (2026-09-14, branch `arena/01a0a030-shivaa-ecom` — READY TO MERGE)

**Owner tasks (one chat, 4 fixes):**
1. **PayU payment gateway broken** — "Merchant Key and Salt not matching" + checkout fell back to 9999999999/Customer
2. **Bullion app every-millisecond** — rates updated every 15 sec, wanted smooth ms motion
3. **Rate drift** — silver $63.01 vs $63.10, gold $4277.80 vs $4279, Jaipur 154890 vs 155500 (≈200₹ low)
4. **Connect live rates panel to bullion panel** — take data from bullion, leave interface as is

**What was done — PayU (cms/api.php + isolated file):**
- **B1 CRITICAL** `pay/order` used `($o['address']->phone ?? '')` on ARRAY-stored address → always null, fell back to placeholder + PHP Warning. Fixed to `['phone']`/`['name']` (also PhonePe dormant block).
- **B2/B3** `payuKey` regex `^[A-Za-z0-9]{4,32}$` and `payuSalt` `^[A-Za-z0-9]{8,80}$` rejected real salts with `_/-`. Relaxed to `^[A-Za-z0-9_\-]{4,40}$` and `^[^\s|]{8,128}$` — the "not matching" was local validation, not PayU.
- **B4** `payu_reconcile` fallback `array_key_first` could credit WRONG txn — removed, strict `$details[$txnid] ?? null` only.
- **B5** `admin/pay-test` probe looked for `"not exist"` but PayU returns `"No Transaction Found"` → valid test creds always said rejected. Now checks `invalid key/hash/auth` absence and treats 200 JSON as valid.
- Files: `cms/api.php` (4 hunks), isolated `cms/payu.gateway.fixed.php` (260 lines, `if (!function_exists)` drop-in + `payu_validate_settings` helper), `cms/PAYU_BUGFIX_REPORT.md`, `payu-update-20260914.zip` (payu.gateway.fixed.php + report + cms_api_fixed.php + README).

**Bullion millisecond:**
- `cms/js/app.js` `scheduleRatesPoll` 15s→1s live, 60s→5s off-hours; `visibility` maxAge 20/90s→3/10s.
- Added 60fps `requestAnimationFrame` lerp (`_msTick`) between 1-sec MCX ticks so ticker LOOKS like every ms (real MCX is 1/sec exchange limit).
- Files: `bullion-update-20260914.zip` (app.js + README), committed to branch.

**Rate drift investigation (no code, settings fix):**
- Root causes: source mix (MCX future vs Yahoo spot vs gold-api spot → 1-2$ diff), FX provider mix (Yahoo vs ECB → 63.10 vs 63.01), Jaipur premium `+55` vs real Jaipur ~+200, rounding `int(round())` vs exact decimals, 10-min DB vs 1-sec tick cache.
- Fix: fill Angel tokens/relay → `source=live-mcx`; adjust `jaipurPremium`/`jaipurSilverPremium` in Admin Settings to add 200₹ diff; keep decimals if needed.

**Connect live rates ↔ bullion (2026-09-14 afternoon):**
- `current_rates()` now checks `live_tick_quote($db,120)` first → `jaipur_live_from_tick()` — so storefront ticker/product/cart/checkout ALWAYS show same gold/silver as bullion panel (`.angel-tick.json`). Interface unchanged, only data wired.
- Fallback to `db['rates']['last']` only if bullion stale >120s.
- Zip: `connect-rates-bullion-20260914.zip` (cms_api_connected.php + README).

**Live deployment reality (Hostinger):**
- Owner found `api.php` directly in `public_html/` (not `public_html/cms/`). That IS the live API — deploy = overwrite `public_html/api.php` (and `public_html/js/app.js` or `public_html/cms/js/app.js` — search for `app.js` to find).
- Owner already uploaded `payu-update-20260914.zip` → `public_html/api.php` replaced correctly.
- Next uploads: `bullion-update-20260914.zip` → `app.js` at found path; `connect-rates-bullion-20260914.zip` → `api.php` again (or just keep last api.php which already includes both fixes if merged).

**Branch state:**
- All v112 work on `arena/01a0a030-shivaa-ecom` (4 commits: PayU, bullion, connect, zips). Pushed, not yet merged to `main` — **to make persistent for ANY new Arena account, merge this branch → main via PR** (see ARENA-STATE.md §2 rule 3).


---

## 🚨 v111 — OWNER ORDERS (2026-09-14): no sample products · fix zoomed ring photos · 65 rings live

**What the owner asked (verbatim intent):** "I don't need any kind of sample
products. I just need 65 rings perfect photoshoots, visible in the ring
section. Some rings are too zoomed in — people cannot even see the ring design
perfectly. Fix that and post and upload all the 65 rings into my website."

**Ground truth discovered this session:**
1. The 2026-09-13 "Ring Reset" GitHub Actions run (looked failed) actually
   PARTIALLY worked: it deleted the old live rings and uploaded PGS5001–5007
   (that's why the live shop shows 7 products), then died on PGS5008 because
   its staged meta.json carried a `hallmark` key the API rejects
   (`hallmark_guard_product_write`). Connectivity GitHub-runner → shivaa.in and
   the `SHIVAA_ADMIN_PASSWORD` secret are BOTH proven working.
2. Programmatic zoom audit (`tools/photoshoot/zoom_check.py`, gold-blob margin
   analysis): **43 of 65 covers were too zoomed** (41 spanned 100% of the frame
   width, cut at both side edges; 2 more spanned 86–92%) + **18 editorials**
   genuinely cut (deep gold at the frame edge). Root cause: `finalize.py`
   centre-crops generated (often 2:3) images to 896×1195, slicing wide ring
   shots at the sides. QA standard: covers = strict (margins ≥3%, span ≤88%);
   editorials = crop-only (span ≤95%, no deep-gold cut) — campaign shots may
   sit near an edge if the ring is whole.
3. Live state is readable from the sandbox via `fetch_page` on
   `https://shivaa.in/api/products` (bash/curl is TLS-blocked; the page fetcher
   is not). Use this to verify live state any time.

**Done this session (branch `arena/01a09f6d-shivaa-ecom`):**
- Master `cms/data/db.json`: 405 → **65 products (PGS rings only)**. The 340
  sample products are archived verbatim at `qa/archive/samples-340-v111.json`
  (restore = merge `products` back). Diff is pure deletion; byte-faithful
  round-trip preserved (indent=1, ensure_ascii=False).
- `cms/js/app.js`: new `LIVE_CATS()` — all category menus/filters/sliders
  (nav mega-menu, mobile menu, footer, home mini-cards, shop checkboxes,
  search suggestions, B2B select) now render only categories that have
  products, so nothing links to empty shops.
- New tools: `tools/photoshoot/unbadge.py` (strips the baked-in Shivaa INC.
  badge before regen) and `tools/photoshoot/zoom_check.py` (zoom/crop QA gate;
  PASS = margins ≥3% each side, ring span ≤88% width).
- Zoom-fix batch 1 DONE (PR #25 merged): covers PGS5001–5010 regenerated
  (pulled-back camera, full ring visible, badge re-applied), installed to
  `cms/images/designs/rings/` + `demo65/media/*/shot_studio.jpg`. 9/10 PASS zoom
  QA; PGS5005 needs one re-roll. Remaining: 34 covers + 18 editorials (52
  generations ≈ 6 turns at the 10-img cap). Batch ledger + per-turn
  instructions: `tools/photoshoot/ZOOMFIX-STATE.md`.
- New deploy path: `deploy/catalogue_deploy.py` + `.github/workflows/catalogue-deploy.yml`
  — makes the live catalogue EXACTLY the 65 PGS rings (deletes non-PGS strays,
  uploads 4 photos per ring via `/api/media`, PUT-updates existing SKUs in
  place / POSTs new ones, strips the API-rejected `id`/`createdAt`/`hallmark*`
  keys — the exact bug that killed the 2026-09-13 run — plus retries + resumable
  ledger + independent verify step). Zoom-QA gate blocks `live=YES` until all
  130 cover/editorial checks PASS (override input exists for emergencies).

**🚀 GO-LIVE this session (branch `arena/01a0a077-shivaa-ecom`):**
- Ground truth before this run: live `/api/products` still had only PGS5001–5007
  (the 2026-09-13 partial ring-reset). Master `cms/data/db.json` already has
  exactly 65 PGS rings, 4 shots each, no videos, all files on disk.
- Arena cannot `workflow_dispatch` (403). PR #27 added the push trigger on
  `deploy/GO-LIVE-v111.txt` but never committed the marker (it was waiting on
  zoom batches 2–7). Owner this turn: push finished v111 and go live.
- Marker is now committed with `GO` + `ZOOM_GATE=NO` (conscious override so
  remaining zoom FAILs do not abort the live write). Workflow also fixed:
  verify-step email was `inputs.email` (empty on push → login would fail after
  a successful upload).
- Merging this PR to `main` fires Catalogue Deploy LIVE=YES. Verify after the
  Actions run: https://shivaa.in/api/products → 65 PGS, 0 samples, 0 videos.

**⏳ FOLLOW-UP (does not block live): zoom batches 2–7** per
`tools/photoshoot/ZOOMFIX-STATE.md`. **Batch 2 DONE** (session arena/01a0a0a6, PR #32 → main `1a98b6c`:
covers 5005 re-roll + 5011–5020, editorial 5003 — all PASS, installed to cms +
demo65; GO-LIVE marker re-bumped so the merge fired Catalogue Deploy run
34868057801 to refresh live photos). Remaining: 25 covers + 17 editorials
(batches 3–7). Lost commit 0a2b3f5 was verified unrecoverable (GitHub API 422 —
it was never pushed) and re-done from scratch. **Live catalogue re-verified by
full read of `/api/products` (~16:25Z): exactly 65 products, SKUs PGS5001–5065,
0 samples, 4 shots each.** Owner next wants app changes (list pending).

**v110 bridge (`deploy/catalogue_sync_bridge.php`) is SUPERSEDED by the
Catalogue Deploy workflow** — the live catalogue is the 65 rings, not 405.
Do not run the v110 bridge.

---

## 🎯 v110 — (2026-09-14) full-catalogue delivery bridge — SUPERSEDED by v111

**Owner reported:** opening shivaa.in's product section shows only seven products.
**Root cause (verified in code):** the storefront loads products from the LIVE
server's `public_html/data/db.json` via `/api/products`. The auto-sync cron deploys
`cms/` CODE (including all `/images/...` photos) but is hard-forbidden from touching
live `data/` + `uploads/` (protects live orders). The 405-product master
(`cms/data/db.json`) therefore never reached the live database — only ~7 old items
were in it. The sandbox still cannot reach shivaa.in directly (`SSL_ERROR_SYSCALL`,
re-verified today), so delivery must run server-side, exactly like the v44 ring reset.

**Fix built (owner-approved path = tablet bridge, keep existing live items):**
- `deploy/catalogue_sync_bridge.php` — one file, same proven pattern as
  `ring_reset_bridge.php`. Steps: login → (1) download master db.json from GitHub
  main + show plan (adds/refreshes/kept/photos) → (2) upsert products 30/tap
  (POST new / PUT existing by SKU, ledger-resumable, strips the API-rejected
  `hallmark*`/`id`/`createdAt` keys, NEVER deletes) → (3) fetch any missing
  `/images/...` photos 25/tap → (4) verify per-category counts (want 405) →
  (5) self-destruct. Runbook: `deploy/CATALOGUE-SYNC-BRIDGE.md`.
- Pre-flight verified: all 405 records have name + weightG>0 + sku + ≥1 image;
  all 334 unique referenced photos exist in `cms/images` (zero missing; 91.6 MB tree).

**⏳ PENDING (owner action, ~10 min on the tablet):** ~~run the bridge~~ **CANCELLED
by v111** — the owner ordered samples removed, so the live catalogue will be the
65 rings only, delivered by the v111 Catalogue Deploy workflow instead. Do NOT
run this bridge.

**Known cosmetic follow-up (NOT changed without owner approval):** 340 products
(all 20 × 16 non-ring categories + the 20 original rings) carry tag `sample`,
which the card renders as a literal "sample" badge (`app.js` TAGS has no mapping).
The 65 PGS rings do not. Ask the owner before stripping the tag in master + live.

**Do NOT merge stale PR #23** (`arena/01a06a7a…`, auto-titled "Arena/01a06a7a"):
it predates consolidation, contains only **342 products**, and merging would delete
~83k lines / 1,000+ files. Close it without merging (branch stays archived).

---

## 🎯 CONSOLIDATION (2026-09-14) — the "never start from zero again" merge

**Problem the owner reported:** new chats branched from a stale `main` while the
newest work (v105–v109) lived only on side branches — every few sessions it felt
like work was lost and had to restart from 0.
**Fix (this merge, `arena/01a09f25-shivaa-ecom` → `main`):**
- Base = v108-MEGA tree (`arena/01a09dc4` @ `60b6c8d`): full v107.4 line
  (PR #21) + boost layer + cinematic films + banners + owner zips v56–v92.
  Verified a strict superset of `main` (zero main-only files, trees identical).
- Layered on top = v109 line (`arena/01a09edc` @ `931ff72`): shopper polish
  (`v108.css`/`v108.js`, 2nd card photo, WhatsApp chat, share) + 100-feature
  pack (`v109.js`). 3-way merge vs v107.4: 3 files taken from v109 (`app.js`,
  `sw.js`, HANDOFF), 1 hand-merged (`index.html` keeps boost AND v108/v109
  wiring), `db.json` kept from v108, 3 new files added, 98 v108-only files kept.
- 1-line fix: precache `/js/v109.js` in `sw.js` (the pack forgot its own entry).
- PRs #21, #11, #15, #19 closed as contained-in-main; their branches stay on
  GitHub as archives. `main` is now the single source of truth — see
  [`ARENA-STATE.md`](ARENA-STATE.md) for the forward-only rules every chat follows.

---

## 🎯 v108 — SHOPPER POLISH (2026-09-14)

Additive layer on v107.4. Catalogue, weights, prices untouched (405 products).
- Second photo on every product card (all 405 have 2+ images) — hover on desktop, flip chip on phone
- WhatsApp chat button (the old `.wa-fab` was `display:none !important` and never injected)
- Skip-to-jewellery, share on the product page, category counts, phone snap-scroll on bestsellers
- Files: `cms/css/v108.css`, `cms/js/v108.js` (removable). `app.js` productCard only. SW shell `shivaa-shell-v108`.
- Rollback: delete the two v108 tags in `cms/index.html`.

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


## 🎯 v45 — GITHUB ACTIONS RING RESET WORKFLOW (2026-09-08)

Owner requested a repo-secret based workflow so the live ring reset can run from GitHub Actions instead of tablet/Hostinger steps. Added `.github/workflows/ring-reset.yml` on the current Arena branch and will merge it to `main` before running. The workflow:
- requires manual `workflow_dispatch` input `live=YES` before it performs live writes; any other value is a dry-run,
- uses repo secret `SHIVAA_ADMIN_PASSWORD` with admin email `admin@shivaa.in`,
- runs `deploy/ring_reset.py --live` to delete live rings and upload the staged 65 PGS rings,
- independently verifies the live catalogue has exactly 65 PGS rings and 0 ring videos.

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

**2026-09-16 — v125 FROZEN / v126 + v125-fix ABANDONED (branch `arena/01a0ab0c-shivaa-ecom`) — MERGED, BRANCH CLOSED**
1. Owner: v126 (as deployed) broke the live site ("ugly — all elements scattered and all images blurred"); he restored it himself (full `public_html` backup zip → extract → `shivaa-update-v125.zip` over the top → "now everything is ok"). Asked to be told what to do — no agent changes.
2. Live probe via `fetch_page` (bash/curl to shivaa.in is TLS-blocked, as always): app.js `APP_REL=125` · v117.js v125-era · v125.js pure v125 · v126.js/v126.css 404 · **sw.js still `shivaa-shell-v126`** · **js/boost.js + css/boost.css missing (404)**. Reported the mixed state to the owner, factually, no changes made.
3. Built `shivaa-fix-v125.zip` (sw.js == the v125 zip's own sw.js, byte-identical; js/boost.js + css/boost.css = the pre-v126 versions, verified) + `DEPLOY-v125-FIX.md`. Owner deployed it → **site bad again in his judgment.**
4. Owner ruling: "please dont be oversmart … i just feel my store right, you just forget everything you did for v126 and for v125 fix zip, ok?" → fix artifacts REMOVED from the branch tip; ruling recorded in `MEMORY.md` (standing law) + this HANDOFF (⛔ section) + `docs/AGENT-HANDOFF.md`.
5. Owner final word: **"my website should be v125 only and no changes"** → live site left exactly as he restored it. No further live probing, deploys or proposals.
6. **Merged:** PR **#56** → `main` (recorded in this same PR line so the "doc commit never pushed" failure is not repeated — the merge state is on `main`, not just on the session branch) → branch closed; `main`'s `cms/` remains pure v125 (`43eae10`, PR #55) plus these doc updates only.

**2026-09-16 — v124 Punach + New In slider faces (branch `arena/01a0a845-shivaa-ecom`)**
0. **Step 0 (docs repair, own commit `5ba446b`):** the v123 session's two doc commits were local-only and lost to the sandbox reset — re-added *merged as PR #48 `bfc3908`* and *owner live-verified 16 Sep, `sw.js` = `shivaa-shell-v123`* to `MEMORY.md` + `HANDOFF.md`, and `docs/AGENT-HANDOFF.md`'s CURRENT FORWARD BASELINE moved v119 → **v123** (v119 demoted to previous, v118 to earlier). PR #48 merge re-verified from GitHub (`MERGED`, `2026-09-16T02:37:32Z`); the shivaa.in read stays the owner's word — this sandbox has no route to the site.
1. Owner: "edit the attached image and paste it in the punach title of category slider", then a follow-up adding a second photo "for new in jewellery". Read `ARENA-STATE.md` / `HANDOFF.md` / `MEMORY.md` first; branch verified at `main`.
2. The chat attachment never landed (claimed `/home/user/uploads/` did not exist — verified filesystem-wide). Owner uploaded both photos to `main` instead (`2cadc34 Add files via upload`): `ponchi-500x500.jpg` (500×333, landscape despite the filename) and `e94d7c530ea31e50aeed8df7d9200fc0.jpg` (736×985); `git merge origin/main` into the session branch (`e800afd`) brought them in. No tile was invented while the file was missing.
3. Each photo AI-cleaned with `generate_image` (reference edit, **one-line prompt** — the long-prompt empty-response bug is still live: both first attempts returned `Response contains no images`), then finalised `420x420^ -gravity center`-equivalent: scale-to-cover, content bbox found with `-fuzz 18% -trim`, crop offset centred on the *jewellery* (punach `+117+0`, newin `+0+27`) so the round tile crop can't clip a piece, `-strip -interlace Plane -quality 82 -sampling-factor 4:2:0` → byte sizes 44 KB / 25 KB, in family with the 17 v123 tiles (15–44 KB).
4. Installed `cms/images/categories/punach.jpg` (replacing the v123 leaf-chain "forced leftover fit" the previous session flagged for exactly this swap; prior md5 `a5fcfd5acd66b0edecb45e74e3d6be85`, restorable from `git show bfc3908:cms/images/categories/punach.jpg`) and the new `cms/images/categories/newin.jpg`. `catBarItems()`'s New In chip now points at that face instead of borrowing `/images/products/mangalsutra-modern.jpg` — the product file is untouched on disk, just no longer used as category art.
5. Stamps 123 → **124** everywhere: `__SHIVAA_REL` / `APP_REL` / `shivaa-shell-v124`, 13 `?v=123` sites **plus the `'&v=123' : '?v=123'` branch of the tile URL builder — a `?v=`-only sweep silently leaves that half stale** (found by grep; now asserted), v116 pre-boot list, SW precache. Media cache deliberately stays `shivaa-media-v120` (the `?v=` change already busts these two files; a MEDIA bump would gratuitously purge every phone's product photos).
6. New gate `tools/mega/smoke/v124-check.js` (**20**): exact 124 triple, zero stale 123 in either branch, six render sites, 18 faces on disk each exactly 420×420 baseline JPEG, punach provably changed off the v123 bytes, New In on its own face with the product photo still present, fallback chain, monogram underlay, rates + media locks, and a jsdom boot where home + shop render both new faces. v117–v123 extended with `|124` and v120-check's `?v=12(0|3)` widened (house forward-compat pattern).
7. Gates on the finished tree AND on the extracted `shivaa-update-v124.zip` (7 files, root layout, built by `tools/mega/make-v124-zip.py`): v113b 32/32 · v117 27/27 · v118 18/18 · v119 27/27 · v120 24/24 · v121 14/14 · v122 22/22 · v123 14/14 · v124 20/20 = **198/198** · php-sweep 211/0. Rates LOCKED (398) — `api.php` / `.htaccess` / `db.json` not in the release. `DEPLOY-v124.md` written.
8. **Merged:** PR **#49** → `main` as `5145ab2` (recorded in this same PR line so the v123 "doc commit never pushed" failure is not repeated — the merge state is on `main`, not just on the session branch). **Open item for the owner:** nobody in this sandbox could look at the two tiles (image reads return placeholders here) — the owner must eyeball `punach.jpg` / `newin.jpg` on the slider; a swap or a different source photo is a one-commit fix.

**2026-09-16 — v123 category-photo refresh (branch `arena/01a0a7e6-shivaa-ecom`) — MERGED + OWNER LIVE-VERIFIED**
1. Owner asked for new homepage category-slider photos; read MEMORY/HANDOFF/ARENA-STATE first; branch verified at tip of main (`2ad3bad`, PR #47), worktree clean.
2. Discovered the 17 hash-named owner jpgs at the repo root map 1:1 onto the 17 `CATS` keys (owner upload that arrived with PR #47); 14 were re-attached in chat, 3 read from the root. Mapping: rings 12747ae · necklaces de394b8 · earrings 94aa472 · bangles d1e2bb8 · bracelets 18da0318 · chains 98af24b · pendants 4f829c7 · mangalsutra e74d8a1 · bajubandh 921a4a7 · rakhdi d2cf594 · aad a040aef · sheeshphool c361740 · hathphool 3c38980 · punach b5aa894 · bridalanklets 91c89e0 · nosepins 57181fc · silver c7c3804.
3. AI-edited each photo (generate_image, reference edit): watermarks/ad text removed (NAKODA, MAHAKALI, nakodapayal, chhatralajewels, "Kada Payal"), jewellery kept identical; finalized 420×420 q82 with Pillow; every tile read back and QA'd; old 17 placeholders backed up to /home/user/cat_backup_v122 and restorable from `2ad3bad`.
4. Re-versioned all six render sites + v116 pre-boot list `?v=120`→`?v=123`; handshake triple → 123; SW `shivaa-shell-v123`; precache app.js/v116 at 123. New `tools/mega/smoke/v123-check.js` (14); v117–v122 suites forward-compatible.
5. Gates on finished tree: 32/32 · 27/27 · 18/18 · 27/27 · 24/24 · 14/14 · 22/22 · 14/14 · php-sweep 211/0. Deliverable `shivaa-update-v123.zip` (22 files, root layout) + `DEPLOY-v123.md`. Rates LOCKED, api.php/.htaccess/db.json untouched. PR → main.
6. Lesson: the image-edit endpoint drops long prompts with empty responses — short prompts go through.
7. **Merged:** PR **#48** merged to `main` as `bfc3908`. **Owner live-verified 16 Sep:** `https://shivaa.in/sw.js` → `SHELL = 'shivaa-shell-v123'` (the real photos serving on the homepage + shop sliders). These two lines existed only as local-only doc commits in that session's sandbox — re-added to `MEMORY.md` / `HANDOFF.md` / `docs/AGENT-HANDOFF.md` on 16 Sep so the merged+live state survives a reset. (PR #48 merge re-verified from GitHub: `MERGED`, merge commit `bfc3908`, `mergedAt 2026-09-16T02:37:32Z`.)

**2026-09-15 — v118 storefront repair (branch `arena/01a0a48d-shivaa-ecom`, commit `0f699f8`, PR #41) — OWNER CONFIRMED WORKING**
1. **Intake/continuity:** owner reported five storefront failures and requested an update ZIP. Read `docs/AGENT-HANDOFF.md`, `MEMORY.md`, `READ-ME-FIRST.txt`, `HANDOFF.md` and `ARENA-STATE.md` before editing; verified branch started at v117/main commit `ea2d48b` and the worktree was clean.
2. **Four-photo PDP gallery:** preserved the 4 existing images per product. Converted gallery dots to labelled buttons; added active/`aria-current` state; kept arrow controls; used `translate3d`; captured the pointer so a finger leaving the frame cannot kill a swipe; handled pointer cancel/lost capture; distinguished vertical page scrolling from horizontal gallery intent; lowered horizontal threshold to 36px; put 44px controls above zoom/lightbox layers.
3. **Quick View:** diagnosed the v116 capture delegate opening on `pointerup`. On Android the subsequent synthetic click could land on the product anchor, explaining the direct full-page navigation. Changed the delegate to captured `click`, with preventDefault, stopPropagation, stopImmediatePropagation and tap debounce. Quick View continues to fetch an uncached item via product endpoint then cached product list and never deliberately redirects.
4. **Categories:** protected the shop title from unknown category keys; validated delegated category values; explicitly redraws when the selected category hash is already current. Populated Rings shows its cards. Empty categories remain on-page with the honest cataloguing message and rings CTA; no inventory fabricated. Category images now use safe URL, eager loading, async decode, low priority, logo fallback and phone visibility/sizing rules.
5. **PayU:** kept server-generated signed fields and verification unchanged. Client now verifies HTTPS `payu.in`, builds a hidden current-tab POST form and invokes `HTMLFormElement.prototype.submit.call`. Handoff screen has Continue, automatic attempt, Try again after 5s and Return to my order; a blocked handoff can no longer strand the customer with only an endless spinner.
6. **Release wiring:** `APP_REL=118`, shell stamp 118, changed JS cache keys 118, new `css/v118.css` + `js/v118.js`, and SW cache `shivaa-shell-v118` with complete precache parity.
7. **Safety:** no database or API/PHP edits; 65 PGS products preserved and every one still has exactly four images; no product weights, prices, customers, orders, uploads, PayU credentials or merchant configuration changed.
8. **Tests:** JS syntax clean; `git diff --check` clean; v113b **32/32**, v117 **27/27**, v118 **18/18**; all three repeated on the unzipped deliverable overlay; PHP sweep **211 routes / 0 exceptions**.
9. **Delivery:** `shivaa-update-v118.zip` contains seven deployable files in `public_html` layout: `index.html`, `sw.js`, `js/app.js`, `js/v116.js`, `js/v118.js`, `css/v118.css`, `DEPLOY-v118.md`. Commit pushed and PR #41 opened.
10. **Owner confirmation:** after using the update, owner said all updates were “very good and fixed.” v118 is now the required forward-only baseline. Future work must preserve every item above and must not restore pointerup Quick View, inert gallery dots, lazy-hidden phone category images, or spinner-only PayU handoff.

**2026-09-15 — v117 "butter" (branch arena/01a0a44f-shivaa-ecom)**
1. Owner: "website very slow — make it fast and butter; hero banner button sliders are out of place: whenever we click them they shift to the bottom of the page." Read ARENA-STATE/HANDOFF/MEMORY; branch verified at tip of main (d52d1bc, v116).
2. Diagnosed the tap-jump **without a browser repro** (sandbox has no Chrome — downloads blocked): root cause = **focus scroll**. `.carousel` is `tabindex=0`; arrows are real `<button>`s; dot taps delegate focus to the carousel; the browser scrolls the page to fully reveal the 430–600 px deck ⇒ "buttons shift to the bottom of the page on click". Proven live in the new `tools/mega/smoke/v117-check.js` (jsdom: pointerdown on the carousel is defaultPrevented; dot/arrow taps still drive the deck). Also fixed `aurum.css`'s `.c-arrow:active{transform:scale(.9)}` which REPLACED `translateY(-50%)` while pressed (arrow dropped mid-tap); `css/v117.css` keeps the translate + adds squash (scoped `#heroCarousel`, `!important`). Track moved to GPU `translate3d`.
3. Speed pass (all in boot/render path, no data touched): boot = ONE parallel API batch (rates in the batch, footer `/api/pages` backgrounded; was 3 serial rounds before the preloader lifted) + 6 s hard cap with quiet re-paint on late batches + independent 6.5 s splash cap in new `js/v117.js`.
4. Fonts: `css/fonts.css` was 354 KB of render-blocking base64 — only 3 UNIQUE fonts duplicated per weight. Extracted to `/fonts/{jost,cormorant-garamond,marcellus-400}.woff2` (78 KB) via new `tools/fonts/extract_fonts.py` (idempotent, re-runnable); fonts.css now 2 KB; all 3 preloaded; swap; rendering byte-identical.
5. Deferred ~200 KB CSS (hallmark/trust/motion/aurum/v107/boost via preload-swap + noscript) and ~110 KB JS (aurum/motion/boost now injected post-paint by js/v117.js, same order, `async=false`; none register routes, all self-guarding). Mobile: `content-visibility:auto` on sections ≥5 + footer; phone GPU trims. SW → `shivaa-shell-v117`, precache one-for-one with the new shell.
6. Gates: v113b smoke **32/32** + new v117-check **27/27**, both re-run PASS on the built zip overlay (`SMOKE_CMS=<dir>`). Deliverables: `shivaa-update-v117.zip` (10 files) + `cms/DEPLOY-v117.md`.
7. Docs updated (this log, ARENA-STATE §1, MEMORY.md). PR → main follows the forward-only rules.



**2026-09-14 — v111 GO-LIVE (branch arena/01a0a077-shivaa-ecom)**
1. Read ARENA-STATE/HANDOFF. Session branch = origin/main tip (`93b5180`, the
   squash of PR #27). Master db = 65 PGS rings, 0 missing shots, 0 videos.
2. Live `/api/products` still only PGS5001–5007. Catalogue Deploy never ran as
   a `main` push: the GO-LIVE marker file was deliberately not committed until
   zoom batches 2–7 passed; Arena token cannot workflow_dispatch (403).
3. Owner this turn: push finished v111 and go live. PR #28: GO-LIVE marker
   (`GO` + `ZOOM_GATE=NO`) + verify-step email fix. First live run logged in
   then crashed on `POST /api/media` (`bytes + str`). PR #29 fixed multipart
   to `b'\\r\\n'` (same as ring_reset.py) and retriggered.
4. Catalogue Deploy 34861781402 SUCCESS (16m). Independent verify + fetch_page:
   65 PGS, 4 shots, 0 samples, 0 videos. Zoom batches 2–7 remain photo follow-up.

**2026-09-14 — v110 full-catalogue bridge (branch arena/01a09f4b-shivaa-ecom)**
1. Read ARENA-STATE/HANDOFF; verified session branch = origin/main tip (6d8b1f9,
   main-guard workflow green; backup tag `backup/main-20260914-093342-6d8b1f9`).
2. Diagnosed owner report "live shop shows 7 products": live API serves the
   server's own data/db.json, which auto-sync never overwrites; master 405-product
   db had never been delivered to live. All 940 image refs are `/images/...`
   (code-deployed), so only the catalogue data was missing.
3. Built + bracket-linted `deploy/catalogue_sync_bridge.php` (login → fetch master
   from GitHub → SKU upserts 30/tap, resumable, no deletes, strips hallmark*/id
   keys → missing-photo fetch 25/tap → per-category verify → self-destruct) and
   `deploy/CATALOGUE-SYNC-BRIDGE.md`. Owner chose: keep existing live products.
4. Preflight: 405/405 valid records (63 carry `hallmark` key — stripped on write);
   334/334 referenced photos present in repo.
5. Flagged (unchanged, awaiting owner OK): 340 products display a literal "sample"
   tag chip; stale PR #23 (342 products) must be closed, not merged.
6. Pending owner: run bridge on tablet → verify 405 → self-destruct → rotate pw.

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
