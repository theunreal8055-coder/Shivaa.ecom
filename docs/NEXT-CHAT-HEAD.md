# NEXT-CHAT-HEAD — paste this first in every new chat

**Written 23 Oct 2026 (Asia/Calcutta), after v236 was packaged and the gate went green.**
**Newest release: v236 “The Counter Book” — packaged, awaiting the owner's yes.
Applied build on the site: v234 (23 Oct 2026); v235 is also packaged and waiting. Next release: v237.
Work branch for the v233–v236 sessions: `arena/800194ed-shivaa-ecom` (base `fd90c0f`).**

**v236 package:** `shivaa-update-v236.zip` · 368 files · 37,445,481 B · sha256
`b6483f250bc1600b4cde420d80d78abf68ca65a4f3137c781417d09d129d6655` · gate `bash qa/v236-gate.sh`
→ **27 checks, 0 red**.

---

## 0 · The 30-second paste block

Paste this at the top of a new chat, whatever branch it opens on:

```
Read docs/NEXT-CHAT-HEAD.md first. Work only on arena/e8a470c6-shivaa-ecom.
Before anything else run: bash qa/where-am-i.sh
  exit 0 → forward, work here.   exit 3 → this tree is BEHIND: stop and run the
  three commands it prints; never work, build a zip or write docs on an old tree.
Then: git fetch origin arena/e8a470c6-shivaa-ecom && git reset --hard FETCH_HEAD
Newest release is v236 (packaged, awaiting the owner's yes). Next release is v237.
Never rebuild, renumber or re-ship v236 or older.
Machine truth: docs/release-ledger.json. After any doc edit: python3 qa/check-handoff.py
```

That block is the whole contract. Everything below is the detail behind it.

---

## 1 · Which branch to work in

- **Session branch — use this one: `arena/e8a470c6-shivaa-ecom`.**
  The Arena session is hard-wired to it. Commit and push there only:
  `git push origin arena/e8a470c6-shivaa-ecom`.
- **Twin branch: `arena/09f3c79f-shivaa-ecom`.** Frozen at its v220 tip (`4a9e239`);
  the session branch was cut from exactly that commit. PR #106 on it is open and untouched.
  Every release from v221 to v232 exists only on the session branch.
- PR base for both: `arena/5529f0ec-shivaa-ecom`. `main` is **not** the release line.
- **Never create, switch to, or push to another branch.** Never delete a branch. Never merge
  another branch. Never force-push.

**If a chat opens on any other branch, that is an accident, not a plan.** Run
`bash qa/where-am-i.sh`: it reads the release stamp on every remote branch, so it can tell
you the truth even when the tree you are standing in cannot. Exit 3 (`BEHIND`) means move to
the session branch before you touch a file. The full rules are in `docs/RELEASE-LEDGER.md` §3.

---

## 2 · The sandbox resets between turns — do this FIRST

```
cd /home/user/Shivaa.ecom
git fetch origin arena/e8a470c6-shivaa-ecom
git reset --hard FETCH_HEAD
bash qa/where-am-i.sh                     # must print FORWARD (exit 0) before you work
git log --oneline -1                      # must show the newest pushed release

npm install --prefix /tmp jsdom@26 --no-audit --no-fund
python3 qa/build-test-db.py
python3 qa/preview_shim.py --port 8090    # start_process, keep it running
```

**The reset is not optional and the guard is not decoration.** On 21 Oct a sandbox came back
with a fresh clone sitting on the **v220 base commit** (`4a9e239`) and a stale v221/v222
worktree — a tree seven releases behind, wearing the right branch name. `where-am-i.sh` exists
because of exactly that. `git reset --hard` is safe *because everything is committed*; commit
after every coherent stage. A reset once wiped hours of uncommitted v229 work and the whole
release had to be rebuilt from its own written contract.

**Check for stray headless processes before you trust a failure.**

```
ps aux | grep "[n]ode"
```

At v221 a stray `node` from a timed-out probe sat at ~60 % CPU on this 2-core box. Page boots
went from ~2.6 s to ~36 s and timing-based suites failed with real-looking assertion errors.
Killing it made everything green. **A flaky suite here is usually CPU starvation, not the
code.** Always end ad-hoc node probes with `process.exit(0)`.

Beware `grep -c` in an `&&` chain: it exits 1 on zero matches and silently kills the rest.

---

## 3 · Forward-only rule (absolute) and the three guards

**Live chain: v205 (11 Oct) → v228 (17 Oct) → v232 (21 Oct).** v232 is live because the owner
applied every update and reported *“I have applied each and every update to the website and
it's fine”* on 21 Oct 2026. Nothing else goes live without his explicit yes.

1. **A release number is spent the moment it is in `docs/release-ledger.json`.** Never renumber
   it, rebuild it with different bytes, re-ship it, or restore an old zip over a newer site.
2. **Never work on a tree below the newest release.** That is what `qa/where-am-i.sh` decides.
3. **Rollback is the previous ledger row (v231), never an arbitrary older tree.** A full
   rollback past v229 must also account for the private bills folder (`DEPLOY-v229.md` §2).

The guards, all committed and runnable:

| Guard | What it proves |
|---|---|
| `bash qa/where-am-i.sh` | fetches origin, reads `APP_REL` on **every** branch, and says whether this tree is forward (0), behind (3), ahead (5) or the wrong branch (2). Never edits anything. |
| `python3 qa/check-handoff.py` | ledger ⟷ stamps in the shipped tree ⟷ zips on disk (sha256 + bytes + file count, committed in git) ⟷ all seven docs. Fails on any stale “live is v…” sentence near a doc's top. |
| `python3 qa/make-update-zip.py NNN` | refuses a spent number whose bytes do not reproduce, deletes the file and exits non-zero. A faithful rebuild of v232 reproduces `14b9e9ca…b4023` exactly. |

A push, a merge, a green gate or a finished zip is **not** approval.

---

## 4 · Release table (pushed; **v232 is live**)

Full 64-character hashes and statuses: `docs/release-ledger.json` (readable: `docs/RELEASE-LEDGER.md`).

| Release | Commit | Zip files · bytes | sha256 (first 16 / last 8) | What it is |
|---|---|---|---|---|
| v221 | `5bf57a2` | 349 · 37,044,662 | `0a1a8e0a620c73ac…eb6850eb` | The Clean-Up Release: dead revolving-case code + CSS removed |
| v222 | `1da18c0` | 350 · 37,218,811 | `e05e08dd1bd550a4…d9f77643` | The Load Release: 58 render-blocking stylesheets → **1 bundle**; boot race fixed |
| v223 | `1f6eca7` | 350 · 37,221,175 | `82c26f8a3261685d…3aec0218` | The Smooth Release: films load only when reached (0 video bytes at mount) |
| v224 | `52313d1` | 351 · 37,227,019 | `abd3f873bd552052…cf3fc304` | The Every-Corner Release: no layout animations, no DOM-rebuilding timers |
| v225 | `e4cf8b4` | 353 · 37,238,134 | `3c943a937f8f6d52…c83b01ae0` | The App-Feel Release: one scroll frame, composited sweeps |
| v226 | `136af8f` | 355 · 37,250,664 | `602a519266efa2e5…a89ef463` | The Butter Release: every press answers, page changes move like an app |
| v227 | `4fddcdb` | 357 · 37,266,250 | `c4cbf83d6efb06fc…2769ccc0f` | The Reading Layer: claim from any PDP, mobile-first reset, text/behaviour fixes |
| v228 | `f6f5a7b` | 357 · 37,271,610 | `c9975a92f6498acf…a2fedbab9` | The Play Store Gate: real account-erasure page, sizer shortcut, `holdRepeat` stop |
| v229 | `a6103b6` | 358 · 37,317,163 | `c9c54cf09476be53…1a8a62d23` | The Paperwork Release: Black admin + queue, renewal, in-store bills, certificate as a document |
| v230 | `f7b2c1d` | 359 · 37,326,620 | `371084903c4359ce…342a4dfe` | The Legibility Release: ink on paper (15.4:1), the member rate ships at **20** |
| v231 | `036e616` | 360 · 37,333,506 | `114394131d4033ca…47fb937c` | The Engraved Layer: a structural ink reset, microtext, a fifth of the paint |
| **v232** | **`b9f74bc`** | **361 · 37,349,816** | **`14b9e9ca24571b05…5a5a4b4023`** | **The Idle Release — LIVE 21 Oct 2026** |

**v232 in one paragraph:** the owner said the app did not feel smooth. Measured on a silent
home page: **1264 animation frames in twelve seconds**, 1148 from two loops that never slept
(`_msTick`, the cursor glow). Idle frame rate **123/s → 0/s**; one delegated tilt engine and one
magnetic engine replace a listener per card and a rect read per pointer event (**10 → 1 layout
reads per ten moves, 0 for twenty more**); 56 of 68 `<img>` literals stop decoding on the main
thread (the LCP set keeps its decode); a hidden tab stops polling the rate. The find: v226's
press rules for `.p-card`/`.cat-card` and the offer banner had been **dead on every phone since
v226** (`styles.css:4637`, `v219.css:129`) — restored in `css/v232.css` §1. Details and the
before/after table: `DEPLOY-v232.md` §1 and §4.

Package link:
`https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v232.zip`

The zips are **committed in git** — `check-handoff.py` fails if a ledger zip is missing from
`HEAD`, so the raw link can never rot.

---

## 5 · The release ritual (v237 and everything after)

1. `bash qa/where-am-i.sh` → exit 0 on the session branch.
2. Write code in coherent stages; **commit after each stage**.
3. Copy the previous gate (`cp qa/v236-gate.sh qa/v237-gate.sh`), roll its header, its
   `node --check` list and its suite list; run it until **0 red**.
4. Roll the stamps **and** the suites' own pinned literals in the same commit:
   `cms/index.html` (`?v=` + `__SHIVAA_REL`), `cms/sw.js` (`SHELL` / `REL` / precache),
   `cms/js/app.js` (`APP_REL`), `cms/api.php` (`'rel'`). Roll assertion **labels** too.
5. Update both shipped countdown docs **before** building the package —
   `cms/docs/HANDOFF-unreal8055.md` and `cms/docs/shivaa-website-facts-for-grok.md` travel
   inside the zip.
6. `python3 qa/make-update-zip.py 233` → record files, bytes, sha256.
7. Append the row to `docs/release-ledger.json`, move `live`, set `next_release` to 234,
   and add the row to `docs/RELEASE-LEDGER.md` — **same commit as the zip**.
8. Write `DEPLOY-v237.md`, update `docs/NEXT-CHAT-HEAD.md`, `MEMORY.md`, `AGENTS.md`,
   `ARENA-STATE.md`, `docs/AGENT-HANDOFF.md`.
9. `python3 qa/check-handoff.py` green → commit → push to the session branch.

**Manual recipe the zip script encodes** (only if the script itself has to be replaced — the
list must come from the previous zip so it can never drift):

```
unzip -Z1 shivaa-update-vNNN.zip | grep -v '/$' | sort > /tmp/list.txt
# append the new layer file if this release adds one
cd cms && zip -X -q -@ ../shivaa-update-vNNN.zip < /tmp/list.txt
```

Then `unzip -q -o … -d /tmp/v` and `cmp` every file against `cms/`. `cms/data/db.json` is
gitignored and must never be in the zip. Never ship `.htaccess` or `config.php`.

**A note on the two shipped countdown docs:** they still say “awaiting the owner's yes”
because they travel inside the package, and editing them without shipping a new package would
make the repo disagree with the live site. **v237's step 5 rolls them.** Do not “fix” them in
a docs-only commit.

---

## 6 · QA commands (sequential, never in parallel)

```
bash qa/v236-gate.sh            # THE WHOLE GATE, one command (27 checks)
```

It builds its own fixtures, owns port 8090, and runs, in order: bundle proof (**70 layers /
70 blocks**), `qa/phpbal.py`, `node --check` ×11, both member-percentage defaults, **seventeen**
historic suites on the plain fixture, `qa/v229-routes.py` (61), **eight** stateful suites each on
a **fresh staffed shim** (`t-v236-book` **109** — money on a deal over real HTTP, the ledger's
opening balance, the GST invoice's HSN/TCS/words, the one-shot alert claim, the rate-lock queue,
the credit limit refusing a deal, and the screen: strip, filters, pay form, invoice, print —
`t-v235-live` 71, `t-v234-desk` 111, `t-v233-nidhi` 146, `t-v229-bills` 102, `t-v231-ink` 53,
`t-v230-cert` 61, `t-v229-black` 88),
then `playstore/verify.mjs` (exit 2 by design while the fingerprints are owed).

Expected individual totals at v236: `t-v236-book` 109/0 · `t-v235-live` 71/0 · `t-v234-desk` 111/0 · `t-v233-nidhi` 146/0 ·
`t-v232-idle` 87/0 · `t-v229-black` 88/0 · `t-v229-bills`
102/0 · `t-v230-cert` 61/0 · `t-v231-ink` 53/0 · `qa/v229-routes.py` 61/0 · `t-v228-play` 52/0 ·
`t-v227-blackcard` 28/28 · `t-v227-design` 41/41 · `t-v227-reset` 31/31 · `t-v226-butter` 61/0 ·
`t-v225-appfeel` 80/0 · `t-v224-corners` 64/0 · `t-v223-smooth` 39/0 · `t-v222-bundle` 36/0 ·
`t-v221-cleanup` 34/0 · `t-v220-billing-gone` 13/0 · `t-v209-alive` 96/0 · `t-v206-flip` ALL PASS ·
`t7-audit` 4/0 · `t-v218-sidebar` 13/0 · `t-v219-depth` 22/0.

Single suites are still listed, in order, inside `qa/v236-gate.sh` — read the script rather
than trusting a copy here. `qa/v230-gate.sh`, `v231-gate.sh` and `v229-gate.sh` are kept as
history.

**A red line is usually an assertion fault, not a regression** — four releases running, every
red was the suite. Read the suite's own constants before rolling a pin. And when stamps move,
**older suites must be rolled forward too** (long-standing convention; some labels are stale on
purpose). Suites that used to assert a layer's own `<link>` now assert the layer is **inside the
bundle** (`CSS_BUNDLE.includes('/* vNNN.css */')`) — a stronger check: shipped, not just named.

**`t-v223-smooth.mjs` owns the media contract** and `t-v225-appfeel.mjs` owns the scroll frame;
`t-v232-idle.mjs` owns the idle frame count, rect counts, the press restore, the layer/blur/decode
rules and a hidden tab. Do not re-audit any of those with grep.

**t7's route count is not fixed** — it derives routes from the home page's `#/` links, rendered
progressively. The assertion that matters is *zero uncaught errors across the whole walk*.

Known sandbox-only noise: a jsdom “Client network socket disconnected” comes from the Cashfree
SDK (`sdk.cashfree.com`); the sandbox has no outbound TLS there. PHP is **not** installed.

---

## 7 · THE STYLESHEET RULE (v222 — read before touching CSS)

The page loads **one** stylesheet, `/css/shivaa.css`, built from all 66 cascade positions
(65 files, `v186.css` twice by design).

1. **Never hand-edit `cms/css/shivaa.css`.** It is generated.
2. **Never re-derive the layer order from `index.html`** — index.html links only the bundle, so
   a script reading it would bundle the bundle into itself (the first draft did exactly that).
3. The order lives in **`tools/css-bundle-order.txt`** and is **load-bearing** — later layers
   exist to override earlier ones on specificity ties. `v186.css` is listed twice on purpose.
4. To change styles: edit/create the layer under `cms/css/`, append it to the order file if it
   is new, run `python3 tools/build-css-bundle.py --write`, then run `t-v222-bundle`.
5. A new layer is only live once it is in the order file **and** the bundle is rebuilt. The
   layer files stay in the repo and in the zip (a rollback can restore index.html alone).
6. Adding a layer also updates `CANON` in `qa/browser/t-v222-bundle.mjs` and the layer counts
   asserted by `t-v224-corners` and `t-v225-appfeel`.

At v232 the bundle is **910,723 B raw / 179,425 B gzipped** (`wc -c` counts **bytes**; Python's
`len()` counts **characters** — 910,662. Say which one you mean).

---

## 8 · THE MEDIA RULE (v223 — read before touching the films)

`filmMedia()` in `cms/js/v125.js` mounts the five gold-thread films. Since v223:

- A film `<video>` mounts with **no `src`** and `preload="none"`. Nothing is fetched at page
  render. Do not put `src`, `autoplay` or `preload="auto"` back — that is the bug v223 removed
  (all five films, 4.5 MB, requested at mount).
- One `IntersectionObserver` (`rootMargin: '1200px 0px 1200px 0px'`) does three jobs: **on
  screen** (≥15 %) → `wake()`; **near, not watched** → pause, keep the buffer (`shut()`); **well
  past** → `rest()` (pause, `removeAttribute('src')`, `load()`). **Do not “simplify” that
  observer to two branches.**
- **A released film is not a broken film** — the v211 error handler returns early when there is
  no `src`; without that, `rest()` would mark the card poster-only forever.
- Reduced-motion visitors never fetch a film (`if (!REDUCED) wake()`).
- The v211 guarantees stay: poster under every film, still frame for a broken file, `playsinline`,
  films mounting on save-data too, and the full-screen reel.

---

## 9 · ANIMATION, TIMER, SCROLL-FRAME AND IDLE RULES (v224 → v232)

**v224 — two bug classes, both locked by `t-v224-corners`:**

1. **Never animate a layout property.** `margin`, `left/top/right/bottom`, `width/height`,
   `padding`, `font-size`, `gap`, `inset` inside `@keyframes` re-lay-out the page every frame.
   Use `transform` / `translate` / `opacity`. Independent `translate:`/`rotate:`/`scale:` compose
   with an existing `transform` (Chrome 104+/Safari 14.1+; older browsers silently skip — the
   accepted trade). Preserve geometry by arithmetic, never by eye.
2. **Never animate `filter`/`backdrop-filter`/`blur()` in a loop.** `v107.css:v107-breathe` is
   the one documented exception.
3. **No timer may rebuild markup.** Build once, keep references, write only changed values,
   pause on `document.hidden` and off-screen. The suite parses every `setInterval` callback and
   fails on `innerHTML`/`outerHTML`/`insertAdjacentHTML`.

**v225 — the scroll frame and repaint loops:** `cms/js/v225.js` owns the chrome's scroll work
(`window.__shvHub`). Never add a second scroll listener that reads
`documentElement.scrollHeight`/`clientHeight` per frame; never call `getBoundingClientRect()`
inside a scroll frame (geometry is re-measured on resize/route/`ResizeObserver` only).
Never animate `background-position` — use a `translate` sweep on a pseudo-element. `.p-card`
must not carry `will-change` on touch (`html.au-touch`). Quantise continuous values (bar 0.1 %,
ring 1/120 turn). Left alone on purpose: the six designed sheen loops (`posterShine`, `phSheen`,
`auShine`, `shimText`, `mPlShimmer`, `rateShim`) and `touch-action: manipulation` in 8 older
rules — see §12.

**v226 — the click surface:** one ripple system (`motion.js` owns `.btn`; `v226.js` owns the
rest and skips `.btn`). A tap is down+up with <8 px movement; never ripple or buzz a drag. A host
is clipped only while its ripple lives (`.rip-live`), gets `position:relative` only if it was
`static`. Press rules for a finger need `!important` **and** the union guard
`@media (pointer: coarse), (hover: none)` — `mobile.css:38` neutralises hover transforms. Never
touch `transition` as a shorthand on a family you do not own. One navigation, one motion owner
(`html.route-jump`, `html.vt-run`). The pace bar is armed after 180 ms and created lazily.

**v227 — the reading layer:** `--shv-mnav-h` is measured, never guessed; a claim form is
optional but a claim status line is not; centring a rail is `scrollLeft` arithmetic, not
`scrollIntoView`; no second rupee sign (`fmt()` already prints `₹`); `.hero-cue[data-hero-cue]`
is the injected hint only.

**v229–v232 — the paperwork, legibility and idle rules:**

- **One member percentage.** `settings.blackDiscountPct` (0–40, **ships 20**) is the only
  source; `blackPct()` reads card → setting → 20; `blackOrderPct(o)` keeps historical receipts
  on the rate they paid. Never hard-code another number anywhere, including comments.
- **The certificate's reset is structural.** `.bc-cert-name` must keep its bare-selector reset
  (`background`, `background-image`, `background-clip`, `-webkit-text-fill-color`+`color`,
  `filter`, each `!important`) **after** the foil rule, with no colour of its own
  (`-webkit-text-fill-color: currentColor`). Ink `#2b1a05` on cream = 15.4:1 / 9.6:1.
- **The bill vault is server-side.** `.shivaa-private-bills` lives **beside** `public_html`
  (env override, 0700/0600, magic bytes in and out, ≤6×8 MB, **503** if unavailable).
  `bill_public($b,$admin)` never sends `notes`/`ref` to a customer; erasure anonymises bills
  at both routes. Customer verbs: **View** and **Download**, nothing else.
- **v232 — the idle contract:** a silent page must ask for **zero** animation frames. `_msTick`
  sleeps and lands exactly (`_msG/_msS/_msWake/_msStop`); the rates poll stops on `hidden`; the
  cursor glow moves with `translate3d` from a `0,0` origin (`scale`, not `width`, under
  `@supports`); tilt and magnetic effects run through **one delegated listener each** with one
  cached rect per element visit (`window.__shvTilt`, `window.__shvMagnetic`). **No
  `getBoundingClientRect()` inside any per-event handler** — measured 10 → 1 reads per ten
  moves. `<img>` literals get `decoding="async"` except the LCP set (`#preloader`, `.hero`,
  `.page-hero`, `.poster`, `.c-slide`, `.gal-track`, `[data-lcp]`) and anything already
  `eager`/high-priority (`window.__shvDecode`).
- **The press cascade.** `styles.css:4637` (`.p-card,.cat-card,.poster,.testi{transform:none
  !important}` under `max-width:820px`) and `v219.css:129` (offer card under
  `(hover:none),(pointer:coarse)`) outrank normal-importance press rules. Any future press rule
  for those families must be `!important`, in **separate** media blocks, inside
  `prefers-reduced-motion: no-preference`. If a press stops working on a phone, check the
  cascade before the JavaScript.
- **`content-visibility` stays sealed off** (v217 removed it after the page-jump bug). The only
  acceptable future form is `contain-intrinsic-size: auto <fallback>` — and this sandbox cannot
  measure layout, so never ship it blind.

---

## 10 · Rules for writing code in this repo (owner orders, accumulated)

- Touch-action on JS-dragged elements: `pan-y` or `none`. Never `manipulation`.
- Inline JS 3D transforms need the `-webkit-` prefix as well (`setT` helper).
- Never reintroduce the tap-to-flip affordance (removed at v214).
- No filter / blur / mix-blend loops in the hero or card scene; no `filter:` on content images;
  never animate `background-clip:text`; never transform `.c-slide` or Ken-Burns.
- Keep the v200 gold button gradient; do not override `position` on elements earlier CSS
  positions (v186 seals).
- Run `node --check` after every JS edit.
- QA assertions on raw CSS/JS text must be whitespace-tolerant; **comments must not contain the
  text an assertion checks**, and a check must not anchor on a comment inside `stripJs`'d text.
- `cms/data/db.json` is never committed and never ships. Real data never enters git.
- **Before deleting “dead” CSS, check for live consumers.** `.sv-case-*` looked safe at v221 but
  markup still rendered `class="sv-case-no"`. Remove shared selector lists selector-by-selector.
- **Never let a route dereference `state.*` that loads asynchronously.** Boot caps the API wait
  at 6 s and paints anyway; `state.settings` starts on `SETTINGS_DEFAULTS` for this reason.
- The owner says “5D” for the offer banners; there is no 5D on a screen. Ask before going further.
- Dev mirror must match the server (shim default 25 vs server 20 proves nothing); fixtures must
  differ from defaults (member stores 25 while the default ships 20).
- A stateful preview must **refuse, not fake-fail**: `qa/v229-routes.py` exits 3 + SKIP on a
  dirty shim; suites use password logins (OTP has a 30 s cooldown) and delete their bills.

---

## 11 · PR, handoff and the memory set

- **PR #107 is MERGED** (21 Oct 2026, on the owner's explicit word): `arena/e8a470c6-shivaa-ecom` →
  `arena/5529f0ec-shivaa-ecom`, merge commit **`c6337db`**. The shared base now carries **v232**.
  **`main` is still `7d23eea` (v184) and untouched** — the release line has never been `main`.
- **PR #106** (twin `arena/09f3c79f-shivaa-ecom`) closed itself as **merged** at the same moment:
  #107 carried the twin's commits, so GitHub saw #106's head (`4a9e239`) become an ancestor of its own
  base. Nothing was lost and nothing extra was merged — it is the same tree.
- **A merge deploys nothing.** `.github/workflows/hostinger-deploy.yml` is `workflow_dispatch` only:
  a post-merge / push trigger does not exist, and a live sync needs the exact phrase
  `DEPLOY SHIVAA LIVE` and must run from `main`. Live is v232 because the owner uploaded the zip.
- **Next PR:** open a fresh one from this branch when the owner asks to review a new release.
  Never merge or close a PR without his explicit word, and never delete the branch.
- **The memory set, updated together every release:** this file, `MEMORY.md`, `AGENTS.md`,
  `ARENA-STATE.md`, `HANDOFF.md`, `docs/AGENT-HANDOFF.md`, `docs/RELEASE-LEDGER.md` +
  `docs/release-ledger.json`. After editing any of them run `python3 qa/check-handoff.py`.
- The four older docs (`MEMORY.md`, `AGENTS.md`, `ARENA-STATE.md`, `docs/AGENT-HANDOFF.md`)
  open with the **same 50-line CURRENT STATE block**. Keep them identical: it is the block an
  agent reads first, and a forked copy is how a stale “live is v…” sentence survives.

---

## 12 · Open items (as of v232 live, 21 Oct 2026)

1. **Nothing is pending deployment.** v232 is live and the tree is committed and pushed. The
   next thing that ships is **v237**, and only after the owner's yes.
2. **Post-deploy spot checks the owner can do in three minutes** (the sandbox cannot reach
   `shivaa.in`): (a) `https://shivaa.in/api/version` should answer with `rel` **232**;
   (b) a member's card/price should show the **20 %** off making charges, never 25 %;
   (c) Admin → Shivaa Black should list members with renew/post buttons;
   (d) `#/my-bills` should show *View* and *Download* for a member who has an in-store bill.
3. **The private bills folder is still the only hosting step.** `.shivaa-private-bills` must
   exist **beside** `public_html`, mode 0700, owned by the PHP user (`DEPLOY-v229.md` §2).
   Without it the admin upload answers **503** by design — the site is fine, the desk is not.
   `GET /api/admin/store-bills` answering 503 is the tell.
4. **Google Play is blocked on the owner, not on code:** (a) paste both SHA-256 fingerprints
   into **both** `playstore/assetlinks.json` and `cms/.well-known/assetlinks.json`
   (`node playstore/set-fingerprint.mjs --status | "<upload>" "<play-signing>"` — the classic bug
   is editing only the kit copy); (b) capture screenshots (`playstore/screenshots/CAPTURE.md`);
   (c) decide the UGC declaration — reviews exist and there is no in-app report button, so either
   reviews come off the app surface or `POST /api/reviews/report` gets built; (d) the Play
   account type decides the 12-tester / 14-day gate. No AAB can be built here (no JDK/Android
   SDK, no `dl.google.com`). Walkthrough: `playstore/UPLOAD-STEPS.md`;
   `bash playstore/verify-live.sh` proves the live file carries both fingerprints.
5. **Real-device checks still owed** (never verified in a browser or on a phone here):
   v224 focus-zoom floor + dot targets + chat `dvh`; v225 scroll smoothness + rail snapping;
   v226 press/ripple/tap-vs-drag + cross-fade + pace bar; v227 claim from a PDP, mobile reset,
   `₹6,998/g`, footer clear of the bottom nav; v228 erasure page; v229 renewal window and bills;
   v230/v231 certificate legibility **on paper**; v232 the press on a phone and a genuinely
   silent home screen (Safari Web Inspector → Timelines shows no frames while idle).
6. **Billing software (owner's own app):** the site side is removed (v220). The owner must delete
   `public_html/billing/` on Hostinger and turn off its stock sync.
7. **Billing AI chatbot:** BLOCKED — the owner has not provided the billing app's code, and the
   sandbox cannot reach any external AI API. Two questions pending: where it lives, and whether
   entries are previewed before saving.
8. **Measured and deliberately not done — do not re-hunt:** JS bundling of the 21 deferred files
   (1,056 KB raw / 322 KB gz; deferred scripts already parallelise and do not block first paint;
   rejected at v223 and v224); `content-visibility: auto` (cannot measure layout here); the
   passive-listener hunt (23 of 25 already passive; the blocker is the gallery's deliberate drag);
   no DOM leak, no 404, no layout shift, no `background-attachment: fixed`.
   **Cleanup candidate for a future release:** `cms/css/bot.css` and `cms/css/v108.css` are dead
   (never linked, no loader for `bot.js`/`v108.js`) — a deletion release, not a drive-by.
9. **`touch-action: manipulation` in 8 older rules** (`aurum.css:483/639/979`, `mobile.css:34`,
   `finale.css:1595/1626/1692`, the gallery drag) is a tap-latency choice that changes double-tap
   behaviour — leave it unless the owner asks.
10. **Coupon / Shivaa Black codes:** `docs/COUPON-CODES.md`. v229 closed three of the five gaps
    it recorded (member list, posting queue, renewal). **Still open:** the Black discount is not
    exclusive — public `MAKING20` gives every guest the same 20 % off making. Owner decision:
    `settings.bannerOfferOn=false`, or split the percentages.
11. **The twin branch `arena/09f3c79f-shivaa-ecom` is 12 releases behind.** Reconciling it is the
    owner's decision; never force-push or rewrite either branch.

---

## 13 · What v236 is (shipped as a package) and what v237 could be

**v236 shipped as a package on 23 Oct 2026 and is awaiting the owner's yes.** The
owner asked for six improvements to the bullion app, in one release, with no
mistakes. Six, and nothing that moves a price:

| Piece | Number |
|---|---|
| money on a deal | `POST /api/bullion/orders/<id>/pay` — cash/UPI/RTGS/cheque + reference; `paid + due = value + TCS` |
| refusals | overpay (states the open figure) · UPI/RTGS with no reference · any money on a cancelled deal |
| party ledger | `GET /api/bullion/ledger?from&to` — opening carried from before the window, `closing = opening + window due` |
| tax invoice | `GET /api/bullion/slips/<no>/invoice` — HSN 7108 gold / 7106 silver, TCS 206C(1H) @ 0.1 % on a buy, amount in words |
| alerts | `POST /api/bullion/alerts/claim` — `notifiedAt` server-side, so one alert is announced once |
| rate lock | a **request queue** the office answers (`/unfix/<id>/resolve`); no string promises more |
| credit limit | `PUT /api/bullion/limit` (office only) — a deal that would cross it is refused with all three figures |
| the book | server-side filter by text, date range and status, remembered on the device |
| proof | `t-v236-book` 109 · gate 27 checks, 0 red · css 70 layers, 942,329 B / 185,156 B gz |

**What v236 deliberately does NOT do:** move a rate, invent a price, or pretend a
rate lock happened. The unfix queue records a request and the office's answer;
nothing is locked until a human confirms it. The service-worker `push` handler is
wired but **nothing sends a push yet** — the 20 s claim loop is what announces an
alert today.

**v237 candidates — pick one with the owner, never alone:**

| Candidate | Size | Who is blocking |
|---|---|---|
| **A. The Play unblock** — fingerprints, screenshots, UGC decision, AAB build, version bump | docs + config, no site code | owner (keystore on his machine, Console decisions) |
| **B. The relay release** — stand the push relay up, prove 10 frames/s end to end, surface relay health on the desk | medium | owner (a small Node host + Angel credentials) |
| **C. Real push for alerts** — the sender behind the `push` handler v236 wired (VAPID keys, a queue, a host) | medium | owner (keys + a host) |
| **D. `partnerWatch` housekeeping** — add the key to the `$db` init list, with a migration note | tiny | nobody *(known nit, deliberately left out of a spent v234–v236)* |
| **E. The next owner report** — whatever he asks for next, measured first | unknown | owner |
| **F. Bills desk hardening** — vault check, "vault unavailable" banner, CSV of bills | medium | server access to verify |

Rules for starting v237: run the guard, read this file, pick one candidate **with the owner**, and
measure before writing a rule. Do **not** start v237 by re-deriving v229–v236, by "restoring" an old
zip, or by editing a spent release's files to "tidy" them.

---

## 14 · Owner communication

The owner writes in Hinglish/Hindi. Reply in short, simple Hinglish: what changed, the measured
number that proves it, the bare zip link and the sha256. Always say clearly which checks could
**not** be done here (real browser, phone, PHP on the server, Play Console). Never say “please
re-check” as the whole answer — hand him the newest package and the proof in the same message.

He re-sends an unchanged report when he is unsatisfied; the answer to that is the next package,
not a restatement. Nothing goes live without his haan, and the agent never deploys.
