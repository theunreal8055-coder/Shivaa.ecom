# RELEASE LEDGER — Shivaa Ecom

**The highest release number here is the only truth.** Every other tree, branch, zip or note
that quotes a lower number is history. This file and `docs/release-ledger.json` are the same
facts: the `.md` is for humans, the `.json` is what the scripts read.

Machine checks (run both before touching anything):

```
bash qa/where-am-i.sh        # any branch, any clone: forward or behind?
python3 qa/check-handoff.py  # ledger == shipped tree == zips on disk == the docs
```

---

## 1 · Where the site is right now

| | |
|---|---|
| **Newest release** | **v253 — “Bridge”** (packaged 16 Nov 2026, **awaiting the owner's yes**; contains v237–v252) |
| Package | `shivaa-update-v253.zip` · 777 files · 45,562,801 B · `8f752196d38dce6e6d16ceaa4e59f53ad2ed102f18034fd45aacdef9fcd837f6` |
| **On the site** | **v244** — installed 12 Nov 2026 and **it broke the phone's scroll** (`content-visibility`); v245–v253 repair and build forward cumulatively, so installing `shivaa-update-v253.zip` applies every fix and the billing bridge in one step. |
| Package on the site | `shivaa-update-v241.zip` · 682 files · 43,636,784 B · `6987184a07398433c59cb4304f3f0b0e2a27583fed97d13787a0bcf90c7c8cdf` |
| **Next release** | **v254** |
| Work branch | `arena/a20b3005-shivaa-ecom` (fast-forwarded from `arena/95be65a4-shivaa-ecom` `ccd80aa`) |
| Twin branch | `arena/09f3c79f-shivaa-ecom` — frozen at its v220 tip `4a9e239`, PR #106 open, untouched |
| Release chain | v232 → … → v240 → v241 → v242 → v243 → v244 → v245 → v246 → v247 → v248 → v249 → v250 (“Still”) → v251 (“Alive”, `ccd80aa`) → v252 (“Silk”, `c78ef0f`, packaged 16 Nov: one-round-trip gzipped `/api/boot` + instant frame-1 PDP open with full-res gallery + Retina WebP thumbs on drawer [803 → 53 KB]/cart/search/compare/banners + zero-refetch SW media & cache-first `?v=252` assets; frame-0 CSS compositor budget replacing the 1,284-node post-tap `getComputedStyle` walk & `motion.css` `opacity:0` re-fades, scoped `v120` overlay watcher, post-scroll debounced `v245`/`v247`, unlocked `backwards` first-row press; frame-1 `.shv-tap` press, heart spring, `#cmpCount` pop, live price settle, `#shvRouteGlide` and intent pre-warm) → **v253 (“Bridge”, packaged 16 Nov: two-way HMAC-SHA256 bridge to the owner's live Hostinger PHP/HTML/JS billing software — auto post-response website customers/9-channel leads/orders -> billing + live 24K/22K/18K/silver rates & SKU stock; auto purchase PDF bills -> private vault & customer `#/my-bills` by mobile incl. pre-signup walk-ins + bill void + idempotent SKU stock movements; drop-in MySQL/JSON `shivaa-connector.php` + Admin `#billingSyncCard`; 0 B shopper JS bloat)** |

| Commit | Title | Files | Zip bytes | sha256 (first 16 / last 8) | Status |
|---|---|---|---|---|---|---|
| v221 | `5bf57a2` | The Clean-Up Release | 349 | 37,044,662 | `0a1a8e0a620c73ac…eb6850eb` | shipped |
| v222 | `1da18c0` | The Load Release | 350 | 37,218,811 | `e05e08dd1bd550a4…d9f77643` | shipped |
| v223 | `1f6eca7` | The Smooth Release | 350 | 37,221,175 | `82c26f8a3261685d…3aec0218` | shipped |
| v224 | `52313d1` | The Every-Corner Release | 351 | 37,227,019 | `abd3f873bd552052…cf3fc304` | shipped |
| v225 | `e4cf8b4` | The App-Feel Release | 353 | 37,238,134 | `3c943a937f8f6d52…c83b01ae0` | shipped |
| v226 | `136af8f` | The Butter Release | 355 | 37,250,664 | `602a519266efa2e5…a89ef463` | shipped |
| v227 | `4fddcdb` | The Reading Layer | 357 | 37,266,250 | `c4cbf83d6efb06fc…2769ccc0f` | shipped |
| v228 | `f6f5a7b` | The Play Store Gate | 357 | 37,271,610 | `c9975a92f6498acf…a2fedbab9` | applied 17 Oct |
| v229 | `a6103b6` | The Paperwork Release | 358 | 37,317,163 | `c9c54cf09476be53…1a8a62d23` | applied 21 Oct |
| v230 | `f7b2c1d` | The Legibility Release | 359 | 37,326,620 | `371084903c4359ce…342a4dfe` | applied 21 Oct |
| v231 | `036e616` | The Engraved Layer | 360 | 37,333,506 | `114394131d4033ca…47fb937c` | applied 21 Oct |
| v232 | `b9f74bc` | The Idle Release | 361 | 37,349,816 | `14b9e9ca24571b05…5a5a4b4023` | applied 21 Oct |
| **v233** | **`a5cd382`** | **The Passbook Release** | **362** | **37,381,263** | **`e5a9b9ffa410b5ea…b117984c`** | **applied 23 Oct** |
| **v234** | **`5337f26`** | **The Desk App** | **366** | **37,416,420** | **`16adae14b9745f5d…585e1b84`** | **applied 23 Oct** |
| v235 | `67e48a1` | The Millisecond Desk | 367 | 37,424,830 | `f5b14e8a274a1911e…8ad09b26ec35` | packaged 23 Oct — superseded by v236 before the owner applied it |
| v236 | `c64a771` | The Counter Book | 368 | 37,445,481 | `b6483f250bc1600b…d129d6655` | **on the site** (owner's `/api/version` reads 236) |
| v237 | `80a6d42` | The Weight Release | 369 | 37,448,114 | `10752b0ad94f1173…be8cbd77` | packaged 12 Nov — never applied, v238 contains it |
| v238 | (packaged) | The Drawer Guard | 370 | 37,450,998 | `234f7b01326f58aa…de48f556` | applied 12 Nov — did not fix the sidebar, superseded by v239 |
| v239 | (packaged) | The Sidebar Guard | 371 | 37,454,324 | `c4d66d64f1e40e08…4535db4a` | applied 12 Nov — did not fix it, superseded |
| v240 | (applied 12 Nov) | The Ripple Fix | 372 | 37,457,438 | `33f2916da9215d37…112371d8` | **applied — “Issue fix hogya”** |
| v241 | (applied 12 Nov) | Smooth | 682 | 43,636,784 | `6987184a07398433…0c7c8cdf` | **applied — smooth, but taps died** (rebuilt `trimMedia`, instant repaint, ₹0 fast paint, soft PDP photo) |
| v242 | (packaged) | Responsive | 683 | 43,644,946 | `ceaa75c99a516f01…aecfa0c` | packaged 12 Nov, **never installed** — the owner reported the desktop header categories gone; v243 contains all of it |
| v243 | `f9a91e9` | Header bar | 684 | 43,648,349 | `00aac36db94b231c…b9e13b65` | packaged 12 Nov, **never installed** — desktop header category bar restored; v244 contains all of it |
| v244 | `8fa6dc8` | Butter | 686 | 43,657,910 | `5b3bfdb3fa490fc3…784453d8` | **installed 12 Nov — broke the phone's scroll (`content-visibility`), superseded within the hour** sticky bars opaque, hover-only card layers, decoration parked, decode-ahead, Back remembers scroll, `?perfdiag=1` |
| **v245** | **`c00549b`** | **Scroll back** | **688** | **43,663,243** | **`68c2e0b3d9b951aa…386c8552`** | packaged 12 Nov — every `content-visibility` deleted from the bundle + universal guard, `overflow-x:hidden` gone, parking watchdog, blank-image wake, `?nofx=1` kill switch. Never confirmed installed; superseded by v246 |
| **v246** | **`28a0992`** | **Lightning** | **689** | **43,776,814** | **`d389c28b1829541a…60a98ef88`** | packaged 12 Nov — the weight. Phone home 5,113 KB → 1,832 KB of pictures (every small slot through `thumbAttrs`), 33 script requests → 2 (`js/rel.js`, built by `tools/build-js-bundle.py`), worker install no longer storms the link, `content-visibility` finally gone from the source layers too. Superseded by v247 |
| **v247** | **`b4dbe47`** | **Atelier** | **761** | **45,038,330** | **`6ca456deaacfcf52…99e3214c5`** | **packaged 12 Nov — the feel. 23 compositor layers → 14 and 37 3D elements → 1 (card families flattened, base `scale(1.08)` gone, `translateZ` gone, Ken Burns still on phones), every image visible by default with a load-triggered fade, touch answers in 90 ms with no tap flash and no iOS zoom, one motion vocabulary, home paints at 700 ms with a price skeleton instead of waiting for the rate, banner + film poster thumbs, and `₹NaN` on the trending/recently-viewed strips fixed** |
| **v248** | **`(this commit)`** | **Instant** | **763** | **45,051,400** | **`861d946d45afaac6…9e10553faa`** | packaged 12 Nov — the tap. `startViewTransition` navigation made opt-in (`?vt=1`), so a page change is a plain hash navigation again; `scrollTo({top:0})` asked for `behavior:'instant'` and `css/v248.css` makes `auto` the last word under `html{scroll-behavior:smooth}` + a 700 ms hold around any tap; rail centring skipped for navigating links; the preloader lifts at 260 ms over the existing page skeleton and the cold ceiling drops 6 s → 4 s; one forced layout per route (lazySweep 0/900/2600 → rAF + 2600); reveals stand down while `html.shv-scrolling`; v117's 110 KB of decor waits for 700 ms of quiet; a tap meter (`Shivaa.taps()`, `Shivaa.v248.report()`, `?tapdiag=1`). 376 browser checks, 0 red |
| **v249** | **`(this commit)`** | **Steady** | **767** | **45,302,852** | **`b165432761e840e7…db0cb6a365`** | packaged 12 Nov — the blink and the bytes. The route rise, `.rv`, `.rv-in` and the picture fade lost their `opacity:0` first keyframe (motion travels, it never fades up from invisible); a late boot batch is ADOPTED (state + `.js-price` + `rates`) instead of `calmBoot()` rewriting #view, and v166's background catalogue repair patches prices instead of `redraw()`; `html.shv-warm` (set before the first frame from localStorage) means a returning shopper never sees the curtain; the warm cap drops 700 → 250 ms; `tools/build-min.mjs` minifies the shipped pair with a sha256 banner that check-handoff verifies — 1,282,512 → 787,267 B raw (−39 %), 383 → 243 KB gzip. 413 browser checks, 0 red |
| **v250** | **`1e6c2e3`** | **Still** | **769** | **45,317,152** | **`0b96fcf2d7604090…edc295537`** | packaged 12 Nov — the still. Measured on the rendered phone home (1284 els): 21 backdrop-filter passes, 6 mix-blend groups, 4 blur filters, 31 layer promotions and 25 never-ending animations → **animated 141 → 15, infinite 25 → 2, blur 0, blend 0, filter-blur 0, promoted 0** (scoped to `html.shv-mobile`; desktop keeps it — gated). The flicker was v248's own scroll-time animation cut, retired. The blink was `#view > *{animation:viewIn .45s both}` (and `#view`) fading every page in from opacity 0, plus `.rv-item`/`v210Rise`/`v211Rise`/`starPop` — fixed at the source. The shop's only non-passive touchmove (pull-to-refresh on #view) is armed only during a pull. A stuck `html.no-scroll` is detected (visible overlay check) and released by `Shivaa.forceUnlockScroll()`. Hover transforms that stick after a tap are neutralised. Instrument: `Shivaa.v250.audit()`. 447 browser checks, 0 red |
| **v251** | **`ccd80aa`** | **Alive** | **772** | **45,504,067** | **`c03ff713453d3d2c…81c4fa60fa`** | packaged 16 Nov (superseded by v252) — event-bound phone signals (90 ms transform press across tappable surfaces, breathing pending price, 6 px live dot, first-row settle, bag badge pop, rate hairline), 2 px read bar, proof-minified `css/shivaa.min.css` (−9.2 % raw, 8,758 rules), `decoding="async"` on all templates. 493 browser checks, 0 red |
| **v252** | **`c78ef0f`** | **Silk** | **774** | **45,524,517** | **`6a6b57c2d0d9b585…083306db`** | packaged 16 Nov (superseded by v253) — Faster without quality loss: one-round-trip gzipped `GET /api/boot` (auto-fallback), 180 ms warm home cap, synchronous frame-1 PDP open (full-res original gallery preserved, reviews hydrated in place, photo #2 pre-decoded), Retina 320w/560w WebP thumbs on drawer (803 → 53 KB, −93 %)/cart/mini-cart/compare/search/orders/mega-menu/Black banner, zero-refetch SW fresh photo hits + cache-first `?v=252` immutable assets (HTML/manifests stay network-first). Smoother: frame-0 CSS phone rules replacing the 1,284-node post-tap `getComputedStyle` walk and `motion.css` `#view.pg` `opacity:0` re-fades, scoped `v120` overlay watcher, post-scroll debounced `v245`/`v247`, retired idle polls/reflows in `v107`/`aurum`/`motion`/`v194`/`v242`, idle-yielded `v117` loader, `v251Arrive` `backwards` fill + pure-transform press. Live: frame-1 `.shv-tap` press (0 ms scroll cancel), wishlist heart spring, `#cmpCount` pop, live price settle, 2 px `#shvRouteGlide`, Save-Data-aware intent pre-warm. Proof-minified CSS (8,781 rules) + JS sha256s verified. Gates: new `t-v252-silk` (48) + `t-v240`..`t-v251` all green (**541/541, 0 red**); `check-handoff` 0 red |
| **v253** | **`(this commit)`** | **Bridge** | **777** | **45,562,801** | **`8f752196d38dce6e…fcd837f6`** | **packaged 16 Nov — awaiting the owner's yes.** Two-way HMAC-SHA256 bridge (`cms/billing-sync.php` + `cms/api.php` + lazy `cms/js/admin.js` `#billingSyncCard` + `cms/css/v253.css` + turnkey MySQL/JSON `billing-connector/shivaa-connector.php`, `cms/docs/shivaa-connector.php.txt`, `billing-connector/CLAUDE-PROMPT-FOR-BILLING-SITE.md`, `docs/BILLING-SYNC-CONTRACT.md`). Auto-syncs website customers, all 9 lead channels and online orders (with paid GST `invoiceNo`) post-response (0 ms shopper impact, SSRF-safe DNS-pinned HTTPS) + live 24K/22K/18K/silver rates & SKU stock; auto-saves showroom purchase PDF bills (`0600` private vault, magic-byte verified) to customer `#/my-bills` by 10-digit mobile (incl. pre-signup walk-ins) + bill void + idempotent `delta`/`setStock` stock movements. 0 B shopper JS overhead; CSS proof 8,807 rules + JS sha256s verified. Gates: `t-v253-bridge` (71) + `t-v229-bills` (102) + `t-v249`..`t-v252` (**337/337, 0 red**); `check-handoff` 0 red |
<!-- The Weight Release | 369 | 37,448,114 | `10752b0ad94f1173…be8cbd77` | packaged 12 Nov — awaiting the owner's yes |
| **v236** | **`c64a771`** | **The Counter Book** | **368** | **37,445,481** | **`b6483f250bc1600b…d09d129d6655`** | **packaged 23 Oct — awaiting the owner's yes** |

Full 64-character hashes, byte counts and status live in `docs/release-ledger.json`.
v205 and everything before v221 are in the older `DEPLOY-v*.md` notes; they are not needed to
place this tree, because v221's zip already contains every file they shipped.

---

## 3 · What “forward only” means mechanically

1. **A number is spent the moment it is in this ledger.** Never renumber it, never rebuild it
   with different bytes, never ship it twice, never “restore” an old zip over a newer site.
2. **Never work on a tree below the newest row.** If `bash qa/where-am-i.sh` exits 3, that tree
   is behind: stop, fetch the release branch it names, reset to it, and only then work.
3. **A new release is always `next_release`.** Today that is **v236**. When it ships, append it
   here, move `live`, and set `next_release` to 237 — in the same commit as the zip.
4. **Rollback is the previous row, never an arbitrary older one.** From v236 that is v235,
   which supersedes v234 (the last build the owner applied);
   a full rollback past v229 also has to account for the private bills folder (`DEPLOY-v229.md` §2).
5. **The owner deploys, and only after his explicit yes.** A push, a merge, a green gate or a
   finished zip is not approval. Nothing in this repo goes live by itself.

`qa/make-update-zip.py` enforces rule 1: if the number it is asked to build is already in the
ledger, it rebuilds it to a temporary file and compares the sha256 — a faithful reproduction
of a shipped package is reported as such; different bytes are refused and deleted.

---

## 4 · Adding the next release (the ritual, in order)

1. `bash qa/where-am-i.sh` → must exit 0 on `arena/e8a470c6-shivaa-ecom`.
2. Work, then commit after every coherent stage. A sandbox reset once wiped hours of
   uncommitted work.
3. `bash qa/vNNN-gate.sh` (copy the previous gate, roll its suite list) → all checks green.
4. Roll the stamps **and** the suites' own pinned literals in the same commit.
5. Update the two shipped countdown docs (`cms/docs/HANDOFF-unreal8055.md`,
   `cms/docs/shivaa-website-facts-for-grok.md`) **before** building the zip — they travel
   inside it.
6. `python3 qa/make-update-zip.py NNN` → record files, bytes and sha256.
7. Append the row here **and** in `docs/release-ledger.json`; set `live` and `next_release`.
8. Write `DEPLOY-vNNN.md`, update `docs/NEXT-CHAT-HEAD.md`, `MEMORY.md`, `AGENTS.md`,
   `ARENA-STATE.md`, `docs/AGENT-HANDOFF.md`.
9. `python3 qa/check-handoff.py` → green, then commit and push to
   `arena/e8a470c6-shivaa-ecom` only.
