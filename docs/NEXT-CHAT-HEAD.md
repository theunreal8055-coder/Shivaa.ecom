# NEXT-CHAT-HEAD — paste this first in every new chat

Written at the end of the v228 turn (17 Oct 2026, Asia/Calcutta).

---

## 1 · Which branch to work in

- **Session branch (use this one): `arena/e8a470c6-shivaa-ecom`.**
  This Arena session is fixed to it. Commit here, push only here:
  `git push origin arena/e8a470c6-shivaa-ecom`.
- **Twin branch: `arena/09f3c79f-shivaa-ecom`.** Sits at its v220 tip (`4a9e239`).
  The session branch was branched from exactly that commit, so the two trees were
  byte-identical when v221 started. **It has not been touched since, and PR #106 on it is
  untouched.** v221, v222, v223, v224, v225, v226, v227 and v228 exist only on the session branch.
- PR base for both: `arena/5529f0ec-shivaa-ecom`. `main` is **not** the release line.
- Never create, switch to, or push to another branch. Never delete a branch. Never merge
  another branch.

## 2 · The sandbox resets between turns — do this FIRST

```
cd /home/user/Shivaa.ecom
git fetch origin arena/e8a470c6-shivaa-ecom
git reset --hard FETCH_HEAD
git log --oneline -1        # must show the newest pushed release (v223 or later)

npm install --prefix /tmp jsdom@26 --no-audit --no-fund
python3 qa/build-test-db.py
python3 qa/preview_shim.py --port 8090      # start_process, keep it running
```

**Check for stray headless processes before you trust a failure.**

```
ps aux | grep "[n]ode"
```

At v221 a stray `node` from a timed-out probe sat at ~60 % CPU on this 2-core box.
Page boots went from ~2.6 s to ~36 s and timing-based suites failed with
real-looking assertion errors. Killing it made everything green. **A flaky suite here
is usually CPU starvation or load, not the code.** Always end ad-hoc node probes with
`process.exit(0)` or they linger and do exactly this. And when a suite fails in a way
that makes no sense, **A/B it against the previous commit** (`git stash push -- cms/ qa/`)
before you go hunting in the diff.

Beware `grep -c` in an `&&` chain: it exits 1 on zero matches and silently kills the rest.

## 3 · Forward-only rule (absolute)

- Live site is **v228** (the owner uploaded it on 17 Oct 2026, "working fine and good").
  Nothing goes live without the owner's explicit yes.
- A push, a merge, a green test, or a finished zip is **not** approval.
- Never reuse or renumber a shipped release. Never revert. Never force-push. Never restore an old zip.
- Never deploy an older tree over a newer one.
- Next release number is **v233**.

## 4 · Release table (pushed on the release branch — **v228 is live**, v229+v230+v231+v232 are built and pending; **deploy v232**)

| Release | Commit | Zip sha256 (first 16 / last 8) | What it is |
|---|---|---|---|
| v205 | (live) | — | Live on the site |
| v206–v215 | up to `8982c8c` | see DEPLOY notes | Flip, case, banners, flicker work (flip removed at v214) |
| v216 | `54bb06e` | `f2b17014…0954` | Offer banners: real artwork; phone films; hero organised |
| v217 | `71dd0c8` | `cd38679f…c64060` | Page-jump root cause; case reinstalled; sidebar + search |
| v218 | `d17e276` | `9faec9d6…052a1d` | 10g entry; funnel stop; sidebar; case removed; Passport sign-in |
| v219 | `fafed78` | `ccddcab3…728f` | 10g button readable; offer depth tilt/glare; paused sheen |
| v220 | `6e88647` | `1b461b82…1899a` | Billing software removed from the website |
| v221 | `5bf57a2` | `0a1a8e0a620c73ac…eb6850eb` | The Clean-Up Release: dead revolving-case code + CSS removed |
| v222 | `1da18c0` | `e05e08dd1bd550a4…d9f77643` | **The Load Release**: 58 render-blocking stylesheets → **1 bundle**; SW precaches 1 instead of 57; boot race fixed (`state.settings` null → Contact page crash) |
| v224 | `52313d1` | `abd3f873bd552052…cf3fc304` | **The Every-Corner Release**: every continuously running animation is compositor-only (hero float was animating `margin-top`; sweeps animated `left`; two loops animated `filter`) and every per-second DOM rebuild is gone (both countdowns re-created their cells once a second; the footer ticker rewrote identical markup every 2.5s) → ~35 → ~2 DOM writes/sec; new `cms/css/v224.css` carries the usability corners (iOS focus-zoom floor, dot hit areas, safe-area FABs, `dvh` chat, tabular numerals) |
| v225 | e4cf8b4 | `3c943a937f8f6d52e8d447887ebefb188a980ccdf0d432a16cf9ed0c83b01ae0` | **The App-Feel Release**: `cms/js/v225.js` puts the chrome's scroll work in ONE frame — one passive listener, one rAF, the geometry measured only on resize/route/document-resize, writes quantised (bar 0.1%, ring 1/120 turn); a six-event scroll burst now reads the document **zero** times (two listeners × two reads per frame before). `app.js` + `aurum.js` stand down on `window.__shvHub`. `@keyframes mSkeleton` (PDP skeletons ×7 + every product-card photo placeholder) and `@keyframes auProg` (the 3px bar) stop animating `background-position` and sweep with `translate`. A phone stops reserving a GPU layer per `.p-card` (`html.au-touch`), the parallax finally runs on touch (11px vs 26, offsets cached, no rect reads in a frame), eight rails + the scheme stepper get `scroll-snap-type: x proximity` + `overscroll-behavior-x: contain`, the 16px focus-zoom floor reaches the 681–900px tablet band, twelve more numeral strips go tabular, and the card gets the house gold hairline. New suite `qa/browser/t-v225-appfeel.mjs` (80 assertions). Package: 353 files · 37,238,134 B · `3c943a93…b01ae0`. |
| v226 | 136af8f | `602a519266efa2e51936c42a99d997dc3933209139a700fd7f9a4550a89ef463` | **The Butter Release**: every click answers, and a page change moves like an app instead of a document. Measured before writing a rule: 6 routes, 1058 visible interactive elements, all 155 `:active` heads in the bundle → **265 answered a press with nothing** (102 mega-menu tiles, 40 category-bar tiles, 33 Quick-view buttons, the brand link, the offer pill, the utility/footer links), and on a phone `mobile.css`'s `*:hover{transform:none!important}` erased even the browser's answer for them. `cms/css/v226.css` (last layer) gives each family a transform press under `@media (pointer: coarse), (hover: none)` (the union, because a touchscreen laptop is coarse AND hover:hover), plus a zero-specificity catch-all. `cms/js/v226.js` reuses the v89 `.rip` span for a gold ripple (small controls at touch-down, big surfaces only on a real tap, rail items on release, the host clipped only while the ripple lives), one 5 ms haptic per real tap, rail centring on a chip/tab/step tap, and the wish + compare badge pops only the cart badge had. `html.route-jump` makes the router's scroll-to-top instant instead of a smooth slide of the page being left; a 2px gold hairline sweeps the top **only** if the next page takes longer than 180 ms; where `startViewTransition` exists the content cross-fades (chrome still, entrance stood down for that navigation). New suite `qa/browser/t-v226-butter.mjs` (61 assertions). Package: 355 files · 37,250,664 B · `602a5192…ef463` (the release commit's message quotes the pre-correction 37,250,601 B / `18d8f50c…` — see `DEPLOY-v226.md` §16; the bundle is byte-identical either way). |
| v227 | (this commit) | `c4cbf83d6efb06fc…9ccc0f` | **The Reading Layer**: the black-card **Verify & create** works from every product page — the reader demanded `[data-black-claim] [data-bc-intake]`, which only exists on `#/black-card`, so a PDP tap returned "Enter your name" and the status writer had nowhere to write; the reader is form-aware, the invite card carries its own status line, the claim falls back to the account name and sends a nameless account to `#/black-card`, and the post-login auto-claim prefills first. Forgot-password is **mobile-first** (4-digit code to the registered mobile, then new password + repeat, real 30 s resend; `api.php` takes `{phone}` or `{email}` and always texts the registered mobile). Home: the ribbon printed `₹₹6,998/g`, the legacy hero hint was a bare `<div>`, the news logo + mega feature art loaded eagerly with no size. `css/v227.css` + `js/v227.js`: footer clears the nav by its measured height, late mounts stay deferred, the rail centres its chip without moving the page, readable gold floors. New suites blackcard 28 / reset 31 / design 41. Package: 357 · 37,266,250 B · `c4cbf83d…9ccc0f`. |
| v232 | (this commit) | `14b9e9ca24571b051ead061c64766a8675044cb09687f2195380975a5a4b4023` | **The Idle Release** — the owner said the app does not feel smooth ("buttery smooth and ultra smooth, without decreasing the quality"). Measured first, on a silent home page: **1264 animation frames in twelve seconds, 1148 of them from two loops that never stop** — `_msTick` (bullion interpolator: 60 fps forever, two `document.querySelector` calls inside every frame, hidden tabs included) and the cursor glow (which wrote **`style.left`/`style.top`** at 60 fps, a forced layout of a 340 px `mix-blend-mode:screen` layer per frame, with the mouse parked). **Idle frame rate 123/s → 0/s.** Both now run only while something is moving, arrive exactly, and sleep in a hidden tab; the rates poll stops there too. **One tilt engine replaces a listener per card**: `bindTilt()` hung a mousemove on every card and read a rect **per event**; `init3DCardTilts()` hung a touchmove on four families (a layout read per touch event *while scrolling*); `bindMagnetic()` did the same on every button and every glare card. One delegated listener each, one cached rect per element visit, one write per frame, maths unchanged — measured: **1 read for ten moves, 0 for twenty more**. **The press answer v226 wrote has been dead on every phone since it shipped**: `styles.css:4637` (`transform:none !important` under `max-width:820px`) and `v219.css:129` beat v226's `.p-card:active`/`.cat-card:active`/offer-card rules, so the three surfaces a shopper taps most never answered a finger — restored with v226's own values, important, under both phone guards separately, inside `prefers-reduced-motion: no-preference` with a block that turns it off again. Nine card families stop reserving a permanent GPU layer each (hover-only promotion, flat on touch); the quick-view pill every phone shows on every card stops carrying `backdrop-filter:blur(6px)` behind a fill that is already 96 % opaque, and closes to .98 so it reads *more* solid (the fixed bars keep their glass — measured and chosen); 56 of 68 `<img>` literals get `decoding="async"` except the LCP set (`#preloader`, `.hero`, `.page-hero`, `.poster`, `.c-slide`, `.gal-track`, `[data-lcp]`) and anything already `eager`/high-priority. **`content-visibility` deliberately untouched** — v217 sealed it after the page-jump bug. New `qa/browser/t-v232-idle.mjs` (**87** — frames in a silent window and the frames a real mousemove wakes, layout reads per pointer move, the v42 touch gate, the decode sweep, a hidden tab asking for nothing); gate `bash qa/v232-gate.sh` → **23 checks, 0 red** with v231 53/0, v230 61/0, v229 bills 102/0, black 88/0, routes 61/0. **361 files**, **no new request**. | built, awaiting the owner's yes — **deploy this** |
| v231 | `036e616` | `114394131d4033ca8e18dea9bf139bb8495b3691529f0b2fcb13c42647fb937c` | **The Engraved Layer** — the owner asked for the graphics to go further and the app to be smoother, after v230 fixed his two reports. (1) **The ink fix became structural**: v230 keyed its reset on `.bc-certificate.v230 .bc-cert-name`, one class-list edit away from dead, so v231 states the same four-mechanism reset on the **bare** `.bc-cert-name` (`background`, `background-image`, `background-clip`, `-webkit-text-fill-color`+`color`, `filter`, each `!important`) and gives every other line of the document `-webkit-text-fill-color: currentColor` + `background-clip: border-box`. That guard restates **no colours** — a legibility layer that also picks the palette is a layer nobody can restyle without a fight. (2) **Microtext**: one 9px band of 5.5px letterspaced text under the top border, rendered from `data-microtext` via `content: attr()` (no text node for a screen reader, nothing duplicated in markup), reading *SHIVAA FAMILY · PRESTIGIOUS MEMBER · SHIVAA JEWELS JAIPUR · NOT A FINANCIAL INSTRUMENT* — the banknote cue the HTML sheet never had. One band only: a pseudo-element of a 9px parent cannot reach the foot of a 600px sheet. (3) **Paint**: the guilloche was a full-sheet element whose gradients were merely *positioned* as bands, so the browser rasterised ~900×600; it is now two **58px** elements (44px on a phone) with a `.bc-guilloche-foot` modifier — same artwork, about a fifth of the area, and the suite asserts the height because "less paint" is a claim about a number. Plus engraved corner diamonds (still exactly four), a pressed rather than glowed title, crisp ink on the card's benefit plate. Still **no keyframes / transitions / will-change / filter**; `contain:paint` from v230 still isolates the sheet. New `qa/browser/t-v231-ink.mjs` (**53** — recomputes both WCAG ratios, proves the bare-selector reset lands **after** the foil rule in the shipped bundle, counts the guilloche nodes, and proves 20 is a default by moving the setting to 21); gate `bash qa/v231-gate.sh` → **22 checks, 0 red** with v230 61/0 and v229 bills 102/0, black 88/0, routes 61/0. **360 files** (adds `css/v231.css`). | superseded by v232 — do not deploy alone |
| v230 | `f7b2c1d` | `371084903c4359ce069e08dfee63149f44475786c36a76b1fb7ba743342a4dfe` | **The Legibility Release** — two owner reports, both real. (1) *"the name … is of same colour as of background"*: `v201`/`v205` clipped a **gold foil** into `.bc-cert-name` (`background-clip:text` + `color:transparent` + a dark `drop-shadow`) for the **dark** stage they shipped, and the paper certificate is cream — measured **~1.4:1** against WCAG's 4.5:1. v229 had set a colour, which won the cascade but **left the treatment in place**; `css/v230.css` removes all four mechanisms (`background`, `background-clip`, `-webkit-text-fill-color`, `filter`) with `!important` scoped to ink/foil/print only, and puts ink `#2b1a05` on paper at **15.4:1 / 9.6:1** (AAA), with the same ink in the A4 download and pure black in print. (2) *"25% is a false claim … should be only at 20%"*: the rate is ONE setting since v229, so the **default** moved in `api.php`, `app.js`, the Admin field and the dev mirror; the 0-40 clamp and the owner's control did not, and the fixture now stores 25 so the override is still proven. Premium's lifetime 20%, Amrita ji's ticket and public `MAKING20` untouched; historical receipts still derive their own rate. **Graphics taken further**: conic-tick seal with two rings, engraved double-rule border, denser guilloche, record boxes with an accent edge, the promise line in a cartouche, a signature rule, a hairlined verify strip, a flourish under the name. **Smoothness as subtraction**: a per-glyph filter and a glyph-clipped gradient removed from the most painted element on the member page, `contain:paint` added, **no keyframes / transitions / will-change**. New `qa/browser/t-v230-cert.mjs` (**61** — it computes WCAG contrast for the failing foil *and* the fixed ink, and proves 20 is a default by moving the setting to 22); gate `bash qa/v230-gate.sh` → **21 checks, 0 red** with all of v229 still green. **359 files.** | built, awaiting the owner's yes — **deploy this, not v229** |
| v229 | `a6103b6` | `c9c54cf09476be53f07b6a21eb3ed9f60852918177fe68cb4beb5f71a8a62d23` | **The Paperwork Release**: `Admin → Shivaa Black` (members were only rows in `users[]` — now a list with card number, member ID, issued, valid-through, days left, renewals; summary strip; filters; per-member **↻ Renew** 1-36 months that **extends a live card from its own expiry**; **🖶 Printed → ✔ Shipped** for the free card; CSV; a printable posting list; a sidebar badge from `GET /api/admin/black-card/queue`). **Renewal exists**: `POST /api/black-card/renew`, open only in the last 30 days or after expiry (else **409** naming the days left), rate-blocked 6/h, keeping `memberId`/`cardNumber`/`certificateNo` and adding six **calendar** months. **The offer gap closed**: the member percentage was a literal 20 in nine places — what public `MAKING20` gives a guest — and is now ONE setting `settings.blackDiscountPct` (default **25**, 0-40, 0 = off without deleting cards), resolved once per request; `blackOrderPct(o)` keeps historical receipts on the rate they actually paid. **In-store bills**: owner-side upload only, `.shivaa-private-bills` **beside** the docroot (env override, 0700/0600, no symlinks, magic bytes in *and* out), streamed **by index** with `no-store`/`nosniff`/`SAMEORIGIN`; `#/my-bills` has **exactly two verbs, View and Download**; `bill_public($b,$admin)` never sends the owner's note or a `ref` to a customer; unavailable storage is **503 + an amber box**, never a half-save; erasure anonymizes bills at **both** routes (a bill is a GST record). **The certificate is a document**: four record boxes, valid-through, a promise line with the percentage, both dates and the scope, a signatory **with a title**, a verify line naming `shivaa.in` + the certificate number, `RENEWED n×`, one guilloche band, four corner ornaments (the old markup shipped `c4` twice), an archived pill that turns **gold** not grey, and an **A4 landscape 3508×2480 @300 dpi** download. Gate `bash qa/v229-gate.sh` → **20 checks, 0 red**; new: `t-v229-black` 88/0, `t-v229-bills` 102/0, `qa/v229-routes.py` 61/0. **358 files.** | built, awaiting the owner's yes |
| v228 | `9218e0e` | `c9975a92…fbab9` | **The Play Store Gate**: `#/delete-account` really exists now (the API route shipped at v183 with no caller; the documented URL fell through to Home). Signed out it proves the number with a fresh SMS code; signed in the session is proof; both need DELETE; success anonymises the row, kills every device token and signs the device out. The TWA shortcut "Ring size guide" pointed at `#/size-guide`, which never existed (sizer is `#/sizer`) — now an alias. `holdRepeat` stops when its element leaves the page (t7-audit caught the null-style TypeError on the size page). No new css/js layer: bundle unchanged at 62/62. Suite `t-v228-play.mjs` 51. |
| v223 | `1f6eca7` | `82c26f8a3261685d…3aec0218` | **The Smooth Release**: films no longer mount with `src`/`preload="auto"` — a fresh home page requests **0 video bytes** instead of 4.5 MB, and a film past the reader is released (see DEPLOY-v223.md) |

Each release has: `DEPLOY-vNNN.md` at repo root, `shivaa-update-vNNN.zip` at repo root,
stamps moved everywhere (index `?v=`, `__SHIVAA_REL`, sw.js SHELL/REL/SHELL_FILES,
app.js APP_REL, api.php `'rel'`), and both countdown docs
(`cms/docs/HANDOFF-unreal8055.md`, `cms/docs/shivaa-website-facts-for-grok.md`) —
which **are** shipped inside the zip, so update them **before** building it.

**Package file list:** v219/v220/v221 shipped **349 files**; v222 and v223 ship **350**
(one addition at v222: `css/shivaa.css`; v223 edits existing files only); v224–v226 ship **355**;
**v227 ships 357** (additions: `css/v227.css`, `js/v227.js`); **v228 ships 357** (no new files);
**v229 ships 358** (addition: `css/v229.css`); **v230 ships 359** (addition: `css/v230.css`);
**v231 ships 360** (addition: `css/v231.css`); **v232 ships 361** (addition: `css/v232.css`
— and deliberately **no** `js/v232.js`: the governors live in `app.js` next to the loops they
govern, so this release adds no request).

Since v229 this is a script, not a ritual to remember (used for v230): **`python3 qa/make-update-zip.py NNN`**
builds the zip as the previous zip's exact list plus whatever `cms/css/vNNN.css` this release
added, refuses to build if a listed file is missing from the tree, and refuses to ship `data/`,
`.htaccess` or `config.php`. The manual recipe it replaced is still here because the script
encodes it — rebuild the list from the previous zip so it can never drift:

```
cd /home/user/Shivaa.ecom
unzip -Z1 shivaa-update-vNNN.zip | grep -v '/$' | sort > /tmp/list.txt
# if the release adds a file, append it here, then:
cd cms && zip -X -q -@ ../shivaa-update-vNNN.zip < /tmp/list.txt
```

Then verify: `unzip -q -o shivaa-update-vNNN.zip -d /tmp/v` and `cmp` every file against
`cms/`. `cms/data/db.json` is gitignored and must never be in the zip.

Zip link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-vNNN.zip`

## 5 · QA commands (run in this order, sequential, never in parallel)

```
bash qa/v232-gate.sh                              # THE WHOLE GATE, one command (23 checks): bundle proof, php balance,
                                                  #   node --check ×6, SEVENTEEN historic suites on the plain fixture
                                                  #   (the sixteen plus t-v232-idle), qa/v229-routes.py, then FOUR
                                                  #   stateful suites each on a FRESH staffed shim (bills, v231-ink,
                                                  #   v230-cert, v229-black), then playstore/verify.mjs. Builds its own
                                                  #   fixtures, owns port 8090.
node qa/browser/t-v232-idle.mjs                   # v232: silent-window frame count, layout reads per pointer move, the
                                                  #   press restore, the layer/blur/decode rules, a hidden tab (87)
bash qa/v231-gate.sh                              # the previous release's gate, kept as history (22 checks)
node qa/browser/t-v231-ink.mjs                    # v231: structural ink, microtext, the paint number, 20% still a default (53)
bash qa/v230-gate.sh                              # the previous release's gate, kept as history (21 checks): bundle proof, php balance,
                                                  #   node --check ×4, sixteen historic suites on the plain fixture,
                                                  #   qa/v229-routes.py, then t-v229-bills / t-v230-cert / t-v229-black
                                                  #   each on a FRESH staffed shim, then playstore/verify.mjs.
node qa/browser/t-v230-cert.mjs                   # v230: certificate legibility (WCAG measured), the shipped 20%, graphics, smoothness (61)
bash qa/v229-gate.sh                              # the previous release's gate, kept as history: bundle proof, php balance, node --check,
                                                  #   the historic suites on the plain fixture, qa/v229-routes.py, then the
                                                  #   two v229 suites each on a FRESH staffed shim. Builds its own fixtures
                                                  #   and owns port 8090 — do not start another shim while it runs.
node qa/browser/t-v229-black.mjs                  # v229: the certificate, the renewal, and the ONE percentage (88)
node qa/browser/t-v229-bills.mjs                  # v229: the in-store bill contract, both halves and the negatives (102)
python3 qa/v229-routes.py                         # v229: the real HTTP round trip — multipart, byte-identical stream, 401/403/409 (61)
node qa/browser/t-v228-play.mjs                   # the Play gate: the erasure page, the shortcut pages, asset links
node qa/browser/t-v227-blackcard.mjs              # the claim from a PDP, signed out and in, and the refusal
node qa/browser/t-v227-reset.mjs                  # mobile-first recovery, code, new password, old refused
node qa/browser/t-v227-design.mjs                 # the reading layer: cue as a control, rupee sign, gold floors
node qa/browser/t-v226-butter.mjs                 # the butter release: every press answers, drags never ripple, rail centring, route-jump, pace bar, view transitions
node qa/browser/t-v225-appfeel.mjs                # the app-feel release: one scroll frame, zero layout reads in a frame, composited sweeps
node qa/browser/t-v224-corners.mjs                # the every-corner release: no layout animations, no DOM-rebuilding timers
node qa/browser/t-v223-smooth.mjs                 # the smooth release: no media before it is reached
node qa/browser/t-v222-bundle.mjs                 # the load release: order + one stylesheet
node qa/browser/t-v221-cleanup.mjs                # dead case code gone, live bits kept
node qa/browser/t-v220-billing-gone.mjs           # rollback guard: billing stays gone
timeout 1500 node qa/browser/t-v209-alive.mjs     # alive suite, ~70-90 s (expect 96/0)
node qa/browser/t-v206-flip.mjs                   # flip guard (expect ALL PASS)
timeout 280 node qa/browser/t7-audit.mjs          # routes + buttons + errors (expect 4/0)
node qa/browser/t-v218-sidebar.mjs                # sidebar + funnel scroll (expect 13/0)
node qa/browser/t-v219-depth.mjs                  # 10g fill, offer depth, stamps (expect 22/0)
```

Expected totals at v226: butter 61/0, appfeel 80/0, corners 64/0, smooth 39/0, bundle 36/0,
cleanup 34/0, billing-gone 13/0, alive 96/0, flip ALL PASS, t7 4/0, sidebar 13/0, depth 22/0.

Run the butter suite with `timeout 300` — it boots a page and drives real presses, so it takes
~13 s; if it ever prints nothing at all, an uncaught error inside the page was swallowed by the
harness (it records `uncaughtException` instead of crashing the runner) — check for a bare
`location` or `document` reference in the suite, which is how the first draft of it hung.

**`t-v223-smooth.mjs` owns the media contract.** It is the only place the "never fetch what
the reader has not reached" rule is checked, and it holds `blockingListeners()` — a real
balanced-paren parser over all shipped JS that fails if any scroll/touch listener besides
the product gallery's deliberate drag is registered without `passive: true`. It boots the
home page **twice**: once with `opts.noObservers` (nothing on screen yet — films must have
no `src`, no `autoplay`, no `preload="auto"`) and once with observers live (films must
still mount, attach their file, and the full-screen reel must open and close). It also
asserts the idle DOM does not grow. **Do not re-audit listeners with grep** — see §10.

**t7's route count is not a fixed number** — it derives routes from the home page's
`#/` links, which are rendered progressively (182 → 2507 links over 5 s). A different
count between runs is timing, not a regression. The assertion that matters is
`zero uncaught errors across the whole walk`.

When stamps move, **older suites must be rolled forward too** — their stamp bodies
assert the newest number (long-standing convention; some labels are stale on purpose).
At v225 seven suites' bodies were rolled to 225 (including `t-v219-depth`, which had
been missed at v224) and every "no older stamp" guard moved to `!includes('?v=224')`;
`t-v224-corners` also gained the bundle-inventory guard (every layer on disk is either
in `tools/css-bundle-order.txt` or on the documented dead list `bot.css` / `v108.css`),
so a future layer cannot silently miss the bundle.
At v223 the bodies in `t-v209-alive`, `t-v219-depth`, `t-v220-billing-gone`,
`t-v221-cleanup` and `t-v222-bundle` were updated, and their "no older stamp" guards
moved to `!includes('?v=222')`. **Suites that used to assert a layer's own `<link>` in
index.html now assert the layer is inside the bundle** — e.g.
`CSS_BUNDLE.includes('/* v218.css */')`. That is a stronger check: it proves the layer
is shipped, not just named.

Known sandbox-only noise: a jsdom "Client network socket disconnected" comes from the
Cashfree SDK (`sdk.cashfree.com`); the sandbox has no outbound TLS there. Suites filter
it. PHP is NOT installed (`php -l` unavailable).

## 6 · THE STYLESHEET RULE (v222 — read before touching CSS)

Since v222 the page loads **one** stylesheet, `/css/shivaa.css`, built from all 57
layers. The rules:

1. **Never hand-edit `cms/css/shivaa.css`.** It is generated.
2. **Never re-derive the layer order from `index.html`.** index.html now links only the
   bundle, so any script that reads it for the order would bundle the bundle into itself.
   (The first draft of `build-css-bundle.py` did exactly that; `t-v222-bundle` caught it.)
3. The order lives in **`tools/css-bundle-order.txt`** and is **load-bearing** — later
   layers exist to override earlier ones on specificity ties.
4. To change styles: edit the layer under `cms/css/`, then
   `python3 tools/build-css-bundle.py --write`, then run `t-v222-bundle`.
5. **`v186.css` is listed twice on purpose** (index.html linked it at two positions; two
   `<link>`s to one sheet occupy two cascade positions). Do not "tidy" it away.
6. The 57 layer files stay in the repo and in the zip. The QA suites read them, and a
   rollback can restore `index.html` alone.
7. Adding a layer: add the file, put its name where the cascade needs it in the order
   file, regenerate, and update `CANON` in `qa/browser/t-v222-bundle.mjs`.

## 7 · THE MEDIA RULE (v223 — read before touching the films)

`filmMedia()` in `cms/js/v125.js` mounts the five gold-thread films. Since v223:

- A film `<video>` mounts with **no `src`** and `preload="none"`. Nothing is fetched at
  page render. Do not put `src`, `autoplay` or `preload="auto"` back on those tags — that
  is exactly the bug v223 removes (all five films, 4.5 MB, were requested at mount).
- One `IntersectionObserver` (`rootMargin: '1200px 0px 1200px 0px'`) does three jobs:
  **on screen** (≥15 %) → `wake()` (attach the file, then play if the gate allows);
  **near, not watched** → pause, keep the buffer (`shut()`); **well past** → `rest()`
  (pause, `removeAttribute('src')`, `load()`), handing back memory and decoder.
  `wake()` is idempotent, so scrolling back never re-downloads. **Do not "simplify" that
  observer to two branches** — `isIntersecting` alone is true across the rest of the page.
- **A released film is not a broken film.** The v211 error handler returns early when the
  video has no `src`; without that, `rest()` would mark the card poster-only forever.
- Reduced-motion visitors never fetch a film (`if (!REDUCED) wake()`).
- The v211 guarantees stay: poster under every film, still frame for a broken file,
  `playsinline`, films mounting on save-data too (v213), and the full-screen reel.

## 8 · THE ANIMATION, TIMER AND SCROLL-FRAME RULES (v224, extended at v225)

Two classes of bug were removed at v224 and both are now locked by
`qa/browser/t-v224-corners.mjs` (62 assertions):

1. **Never animate a layout property.** `margin`, `left/top/right/bottom`,
   `width/height`, `padding`, `font-size`, `gap`, `inset` in a `@keyframes` block
   make the browser re-lay-out the page **every frame**. Use `transform` /
   `translate` / `opacity` only. The suite walks every `@keyframes` block in all
   58 layers with a balanced-brace parser and fails on any of them.
   (Independent `translate:`/`rotate:`/`scale:` properties compose with an
   element's existing `transform` and are the cleanest conversion — but they need
   Chrome 104+/Safari 14.1+, and on anything older the animation silently does not
   run. That trade was accepted deliberately: a static card beats a janky one.)
   Geometry must be preserved by arithmetic: an element that is 40 % wide and
   moved `left:-40% → 100%` of its parent is `translate:-100% → 250%` of its own
   width. Do the sum, never eyeball it.
2. **Never animate `filter`/`backdrop-filter`/`blur()` in a loop.** Two were
   removed at v224 (a 40 px `drop-shadow` and a `blur()` on a ~500 px element);
   `v107.css:v107-breathe` is the one documented exception (a ≤48 px chip) and
   the suite fails if a second one appears.
3. **No timer may rebuild markup.** Both draw countdowns used to set `innerHTML`
   once a second forever; the footer ticker rewrote identical markup every 2.5 s;
   `[data-rate-age]` was written every second regardless of change. The rule:
   build the strip **once**, keep references, write only a value that actually
   changed, and pause the timer when `document.hidden` or when the element is off
   screen (`IntersectionObserver`, `rootMargin: '120px'`). The suite parses every
   `setInterval(...)` callback in the shipped JS with a paren walker and fails if
   any of them contains `innerHTML`/`outerHTML`/`insertAdjacentHTML`.

Corollary for future "smoothness" requests: measure before you claim. At v224 the
following were measured and found **already clean** — do not re-hunt them: no
passive-listener win (23/25 passive, the blocker is the deliberate drag), no DOM
leak, no 404, no layout shift (`.pc-imgwrap` reserves its space), no
`background-attachment: fixed`, no missing focus rings, `user-select: none` only
on decorative UI, and the bundle carries every stylesheet v221 linked (its 64
`<link>` tags were diffed against the layer list).

### v225 — the scroll frame and repaint loops (read before adding a scroll listener or an animation)

`cms/js/v225.js` owns the chrome's scroll work and exposes `window.__shvHub`:

- **Never add a second scroll listener that reads `documentElement.scrollHeight` /
  `clientHeight` per frame**, and never call `getBoundingClientRect()` inside a scroll
  frame. `app.js` and `aurum.js` used to do exactly that (two listeners, two reads
  each, every frame). Both now feature-detect the hub and stand down; the hub's
  `measure()` is the only reader, and the geometry is re-taken on resize, `hashchange`
  and a `ResizeObserver` on `<body>` — never inside a frame.
  `qa/browser/t-v225-appfeel.mjs` spies the getters and **fails if a burst reads them**.
- **Never animate `background-position`.** It cannot be composited: the element
  repaints itself every frame. `@keyframes mSkeleton` (skeleton + every product-card
  photo placeholder) and `@keyframes auProg` (the 3px progress bar) were both retired
  in favour of a `translate` sweep on a pseudo-element — same colour, speed and angle.
  The suite asserts both are gone and the replacements are `translate`-only.
- **`.p-card` must not carry `will-change` on a touch device** (`html.au-touch`):
  20–60 reserved GPU layers for a hover state a finger cannot trigger.
- The back-to-top ring is a `conic-gradient`, so its value is **quantised to 1/120 of a
  turn** and the progress bar to 0.1%; anything that repaints per frame should be
  quantised the same way rather than written continuously.
- **Left alone on purpose** (do not rewrite these without the geometry in front of
  you): the designed sheen loops `posterShine`, `phSheen`, `auShine`, `shimText`,
  `mPlShimmer`, `rateShim` — each is a gradient baked into a finished graphic, and
  moving one onto a composited layer means re-deriving the element's box. The two
  `background-clip: text` ones cannot be aliased onto a pseudo at all without a wrapper.
  `touch-action: manipulation` in 8 older rules is a tap-latency choice, not a scroll
  bug — see §11.

### v226 — the click surface (read before adding a press state or a ripple)

- **One ripple system.** `motion.js` owns `.rip` on `.btn` (v89). `cms/js/v226.js` uses the *same*
  span class for everything else and skips `.btn` on purpose — never add a third.
- **A tap is not a drag.** A ripple/haptic is only allowed when the pointer went down and up with
  < 8px of movement. Rail children answer on **release**, big surfaces (cards, rows) only on a real
  tap; a scroll that starts on a card must never light it up or buzz. The suite fails a drag that
  ripples.
- **A host is clipped only while its ripple is alive** (`.rip-live`, removed with the span) and gets
  `position:relative` only if it was `static` (`.rip-pos`) — never add a permanent `overflow:hidden`
  or `position:relative` to a card in a press rule.
- **Press rules for a finger need `!important`.** `mobile.css:38` neutralises every hover transform
  under `@media (pointer: coarse)`; a normal rule loses to it, which is exactly why 265 elements had
  no press on a phone. The new rules are guarded by `@media (pointer: coarse), (hover: none)` — the
  **union**, because a touchscreen laptop is coarse *and* `hover: hover`.
- **Never touch `transition` as a shorthand** on a family you do not own (it silently resets every
  other transitioned property); use `transition-duration` inside the `:active` rule.
- **A navigation's motion has one owner.** `html.route-jump` (instant scroll-to-top) and
  `html.vt-run` (view transition, entrance stands down) live for one navigation; `motion.js`'s
  `playPage()` checks `vt-run` before replaying `.pg`. Do not add a second page-transition mechanism.
- **Feedback only when something is slow.** The pace bar is armed after 180 ms and created lazily:
  a route that renders fast must leave **no** DOM behind (asserted).
- Still true from v225: no scroll listener, no per-frame layout read. The ripple reads one rect per
  press, outside any frame — that is the only layout read v226 added.

### v227 — the reading layer (read before touching the footer, a rail, or a claim flow)

- **`--shv-mnav-h` is measured, never guessed.** `js/v227.js` reads the real `.mnav` height
  on load/resize/route change and writes the variable; `css/v227.css` carries the 64 px
  fallback. Footer padding, `scroll-padding-bottom` and `#backTop` all read it.
- **A claim form is optional; a claim status line is not.** `blackReadIntake()` must stay
  form-aware (`form` is null on a PDP) and `beginBlackClaim()` must keep arming
  `_blackClaimAfterLogin` **only after validation passes**. A refused empty claim must never
  leave an intent behind — that was a real bug the v227 suite caught.
- **Centring a rail is `scrollLeft` arithmetic, not `scrollIntoView`.** The latter scrolls the
  document; v227's rail maths never touches the page. Under `prefers-reduced-motion: reduce`
  the rail jumps.
- **No second rupee sign.** `fmt()`/`fmt2()` have printed `₹` since v120; any template that
  adds one prints `₹₹`. The v227 ribbon guard is defensive, not a licence to add signs.
- **`.hero-cue[data-hero-cue]` is the injected hint only.** The black-card hero's own
  `.hero-cue` is a separate control with its own design — never merge the two selectors.

## 9 · Rules for writing code in this repo (from earlier owner orders)

- Touch-action on JS-dragged elements: `pan-y` or `none`. Never `manipulation`.
- Inline JS 3D transforms need the `-webkit-` prefix as well (`setT` helper).
- Never reintroduce the tap-to-flip affordance (removed at v214).
- No filter / blur / mix-blend loops in the hero or card scene; no `filter:` on content
  images; never animate `background-clip:text`; never transform `.c-slide` or Ken-Burns.
- Keep the v200 gold button gradient; do not override `position` on elements that earlier CSS positions (v186 seals).
- Run `node --check` after every JS edit.
- QA assertions on raw CSS/JS text must be whitespace-tolerant; comments must not contain the text an assertion checks.
- `cms/data/db.json` is never committed and never ships. Real data never enters git.
- **Before deleting "dead" CSS, check for live consumers.** `.sv-case-*` looked safe to
  sweep at v221, but the gold thread's markup still renders `class="sv-case-no"`. Remove
  shared selector lists **selector-by-selector**, never as a rule.
- **Never let a route dereference `state.*` that loads asynchronously.** Boot caps the
  API wait at 6 s and paints anyway, so anything rendered in that window must work with
  defaults. `state.settings` now starts on `SETTINGS_DEFAULTS` for exactly this reason;
  `state.rates` was already guarded everywhere.
- The owner says "5D" for the offer banners; there is no 5D on a screen. Ask before going further.

## 10 · Pull request and handoff

- **PR for the session branch:** create one from `arena/e8a470c6-shivaa-ecom` → base
  `arena/5529f0ec-shivaa-ecom` when the owner wants v221–v223 reviewed. **Do NOT merge
  or close any PR unless the owner says so.**
- PR #106 (on `arena/09f3c79f-shivaa-ecom`) is **open, untouched, and now 4 commits behind**
  the session branch. Leave it alone unless the owner decides otherwise.
- Memory updated at the end of v224: `MEMORY.md`, `ARENA-STATE.md`, `AGENTS.md`,
  `docs/AGENT-HANDOFF.md` (top blocks), this file, and the two shipped countdown docs.

## 11 · Open items (as of v232)

1. **Owner review of v232** — **v228 is LIVE** (the owner uploaded it on 17 Oct 2026 and reported it
   "working fine and good"). **v229, v230, v231 and v232 are built, all four gates are green, none is
   live.** **Deploy v232 only.** Not v229: it quotes 25% to members, the claim the owner rejected ("should
   be only at 20% off making charges for the customers of prestigious members"). Not v230 on its own: its
   legibility fix is keyed on `.bc-certificate.v230 .bc-cert-name`, one class-list edit from dead. Not
   v231 on its own: it still asks for **123 animation frames a second on a page nobody is touching**.
   Package numbers, the before/after measurement table (123 → 0 idle frames a second, 10 → 1 layout reads
   per ten pointer moves, 56 → 0 images decoding on the main thread) and the post-deploy checks are in
   `DEPLOY-v232.md`; the private bills folder beside `public_html` (`DEPLOY-v229.md` §2) is still the only
   hosting step any of them needs.
   **A note on how the owner reports things:** he sent the same two-bug message twice, the second time
   after v230 had already fixed both. Nothing was wrong with v230 — but the reply that works is "already
   fixed, here is the number that proves it, and here is the next file with more", not "please re-check".
   Always hand him the newest zip and the measured proof in the same breath.
2. **Google Play is blocked on the owner, not on code:** (a) paste the two SHA-256 fingerprints into
   BOTH `playstore/assetlinks.json` and `cms/.well-known/assetlinks.json` (`bubblewrap fingerprint`);
   (b) capture screenshots (`playstore/screenshots/CAPTURE.md`); (c) decide the UGC declaration —
   reviews exist and there is no in-app report button, so either reviews come off the app surface
   or `POST /api/reviews/report` gets built; (d) Play account type decides the 12-tester / 14-day
   gate. No AAB can be built in this sandbox (no JDK/Android SDK, no dl.google.com).
   **The owner-facing walkthrough is `playstore/UPLOAD-STEPS.md`** (keystore → bubblewrap
   build → fingerprints → Console → internal testing, with a failure table), and
   `node playstore/set-fingerprint.mjs --status | "<upload>" "<play-signing>"` writes the
   two assetlinks copies together (the classic bug is editing only the kit copy).
   **Same-day path:** `playstore/TODAY.md` (time-boxed plan) + `bash playstore/preflight.sh`
   (six checks, exit 2 = waiting on the owner) + `bash playstore/make-aab.sh [--check|--init-key]`
   (stages `playstore/twa/`, git-ignored, runs bubblewrap) + `node playstore/version-bump.mjs
   --status|uploaded <track> ["note"]|set <n>` which records every uploaded versionCode in
   `playstore/uploads.json` and refuses a reused one BEFORE the 40 MB upload. The v228b suite
   reads that ledger, so a version bump never breaks `t-v228-play`.
   **Publishing (after the AAB exists):** `playstore/PUBLISH.md` — internal → closed → production,
   the Console answers, the UGC decision (reviews are UGC and there is still no in-app Report
   button: either hide reviews, or ship `POST /api/reviews/report`), and the seven review
   rejections with their one-line fixes. `bash playstore/verify-live.sh` proves the LIVE
   assetlinks really carries both fingerprints (exit 0 = Google's verifier will pass; it also
   checks the deployed `js/app.js` really contains `#/delete-account`). **v228's zip still ships
   placeholder fingerprints** — fixing them is a ONE-file upload of
   `cms/.well-known/assetlinks.json`, never a re-deploy of the whole tree.
3. **Owner visual check for v227 specifically (on a phone):** (a) open any product, scroll to the
   black-card invite, tap **Verify & create** — the sheet must open there with a status line under
   the button, and a signed-in claim must return to the same piece and show its saving;
   (b) sign-in → Forgot password: the first field must be the **mobile**, the code must arrive by
   SMS, then a **new password + repeat** must sign in; (c) the rate ribbon must read `₹6,998/g`,
   never `₹₹`; (d) on a notched iPhone the last footer line must sit above the bottom nav.
   Then the v226 checks still apply:
4. **Owner visual check for v226 (on a phone):** (a) tap a category tile, a product
   card, a Quick-view button, a chip, the brand logo — each must visibly answer, with the gold ripple
   under the finger; (b) **start a scroll on a product card and drag** — no ripple, no buzz (that is
   the tap/drag line, and only a thumb can judge it); (c) tap a chip in the home category rail — it
   should settle centred in the rail; (d) add to wishlist/compare — the header badge should pop;
   (e) on Chrome Android change pages — the content should cross-fade with the header completely
   still (iPhone Safari 17 and older will simply change pages: expected); (f) on a slow connection a
   thin gold hairline should sweep the very top until the page appears — on a fast tap it must never
   appear; (g) a page change must start at the top **instantly**, not glide.
   Then the v225 checks still apply:
5. **Owner visual check for v225 (on a phone):** (a) scroll the home page
   slowly — the gold hairline at the top and the back-to-top ring must move with the
   thumb and nothing should hitch; (b) the hero/banner artwork drifts very slightly
   (11px, phone only — one number in `aurum.js`: `pxAmp`); (c) a swipe on a category
   rail, the account tabs or the scheme step rail should settle on a label, not between
   two; (d) **tap the newsletter or login field on an iPad or a phone held sideways —
   the page must not zoom** (the v224 floor stopped at 680px); (e) product cards show a
   thin gold line inside the card edge, firming up when tapped. Then the v224 checks
   still apply:
6. **Owner visual check for v224 (on a phone, on mobile data):** (a) scroll the
   home page slowly — the hero cards and the gold thread must not feel heavy (that heaviness
   was the hero float re-laying-out the page on every frame); (b) **tap the newsletter email
   field — the page must NOT zoom in** (the most visible fix in this release); (c) tap the
   dots under a product photo row — they must register (they used to be a 6px target);
   (d) the concierge chat must fit the screen with its input visible and its button clear of
   the home-indicator area; (e) the scheme countdown digits must stay steady in width.
   Then the v223 check still applies: scroll without stopping through the film thread — it
   must feel steady (that stutter was five videos decoding at once); posters instantly, the
   film you are looking at starts a moment later; scroll far past and back — films play
   again; tap one — the full-screen reel opens and closes. In DevTools → Network → Media, a
   fresh home load should show **no .mp4 request at all** until you scroll down.
6. **Billing software (owner's own app):** the site side is removed (v220). The owner must
   delete `public_html/billing/` on Hostinger and turn off its stock sync.
7. **Billing AI chatbot (owner's ask):** BLOCKED — the owner has not provided the billing
   app's code, and the sandbox cannot reach `shivaa.in` or any external AI API. Two
   questions pending: where it lives, and whether entries are previewed before saving.
8. **Real-device checks still needed:** 10g button colours, offer tilt feel, scroll
   smoothness, sign-in sheet, sidebar swipe — none verified in a real browser or phone.
9. **PHP checks on the server:** `php -l` unavailable here. Run `GET /api/settings` and
   `GET /api/version` after upload.
10. **Next performance candidates (measured, not done):** the 21 deferred JS files
   (1,056 KB raw / 322 KB gz; `app.js` alone is 762 KB with 308 top-level declarations)
   are the remaining request count. Deferred scripts already download in parallel and do
   not block first paint, and bundling risks `'use strict'` scope loss across 21 files —
   **considered at v223 and v224 and rejected both times**. Only attempt it by wrapping
   every file (IIFE) and re-running the whole gate. The one other candidate is
   `content-visibility: auto` on below-fold home sections — v217 removed it because a
   *guessed* `contain-intrinsic-size` changed the page height while scrolling (the
   jump-to-top complaint); the safe form is `contain-intrinsic-size: auto <fallback>`, but
   this sandbox cannot measure layout, so do not ship it blind.
   **Already measured clean at v223/v224 — do not re-hunt:** no DOM leak (idle DOM stable
   at 1897 nodes), no 404 (264 local refs; the 10 "missing" are runtime template paths), no
   layout shift (`.pc-imgwrap` reserves `aspect-ratio`), no passive-listener win (23 of 25
   listeners already passive; the only blocker is the gallery's deliberate drag), nothing
   lost in the CSS bundle (v221's 64 `<link>` tags diffed against the layer list), no
   `background-attachment: fixed`, `user-select: none` only on decorative UI, and
   `cms/css/bot.css` + `cms/css/v108.css` are dead (never linked — not even before the
   bundle — and nothing loads `bot.js`/`v108.js`): a cleanup candidate for a future release,
   left in place at v224 because this release is not a deletion release.
   The checks live in `qa/browser/t-v224-corners.mjs` and `t-v223-smooth.mjs`, not in grep.
11. **Carried into v227+:** `touch-action: manipulation` still sits in 8 older rules
   (`aurum.css:483/639/979`, `mobile.css:34`, `finale.css:1595/1626/1692` and the gallery
   drag) — left alone at v225 because it is a tap-latency choice on controls, and changing
   it alters double-tap behaviour the owner has not asked about. The six designed sheen
   loops named in §8 are the last `background-position` animations on the site; converting
   one needs its element's box re-derived, which is a visual change, not a perf fix.
   `cms/css/bot.css` + `cms/css/v108.css` are still dead (never linked, no loader for
   `bot.js`/`v108.js`): still a cleanup candidate, still left in place because this was not
   a deletion release.
12. **The twin branch `arena/09f3c79f-shivaa-ecom` is 6 commits behind.** Reconciling it is
    the owner's decision; the agent must not force-push or rewrite either branch.
13. **Coupon / Shivaa Black codes — how they actually work (answered 18 Oct, no code changed):**
    `docs/COUPON-CODES.md`. Every Black member gets a **unique** 16-digit code
    (`black_unique_code`, `api.php:4243` — `2020` + 12 `random_int` digits, checked against
    every existing coupon AND every member's card number); it is saved on the **user record**
    (`users[i].blackCard` in `cms/data/db.json`, `api.php:5723`) and is **never** written to
    `coupons[]`, so the 20%-off-making benefit is recomputed per request
    (`black_coupon_for_user`, `api.php:4294`). Redemption is `coupon_resolve()` (`api.php:4340`)
    used by BOTH `coupons/validate` and the order route: own live card → own premium code →
    **any other card number returns null (fail closed, never falls through to a public coupon)** →
    ordinary coupon list. Checkout pre-fills and auto-applies the member's own code
    (`app.js:6836`, `app.js:6963`). Public offers `MAKING20`/`FREEDEL` are the SAME for everyone,
    guests included, auto-seeded by `offers/banner` (`api.php:5585-5615`).
    **Five gaps the owner has not decided on:** (1) no Admin screen lists Black members, their
    codes or expiries (`pub_user` sends `blackCard` in `GET /api/admin/users`, but the Customers
    table renders none of it — `admin.js:719-731`); (2) `delivery.status = 'to-ship'` is written
    for the FREE physical card but **nothing reads it** — no print/post queue, no "shipped" mark;
    (3) **no renewal path** — claim is idempotent, so a card that passes its six months can never
    be re-issued from the site; (4) the Black discount is **not exclusive** — public `MAKING20`
    gives every guest the same 20% off making, so Black's real value is the card/certificate, not
    the discount (fix = `settings.bannerOfferOn=false`, or split the percentages); (5) the
    `api.php:5629` comment still calls Premium "free home delivery for LIFE" while the code gives
    20% off making for life (`api.php:4312-4320`, `app.js:12222`) — stale comment, correct
    behaviour. A 19-case Node **transcription** of those functions passed (uniqueness incl. a
    1000-member batch, ₹1,00,000/₹12,000 making → ₹2,400 off, every cross-user/expired/re-bound/
    admin case null) and was deliberately NOT added to `qa/`: it tests the reading, not the PHP.

## 12 · Owner communication

The owner writes in Hinglish/Hindi. Reply in simple Hinglish, short, with the bare zip
link and the sha256. Always say clearly: not live, owner approval needed, and which
checks could not be done in the sandbox (real browser, phone, PHP on the server).
