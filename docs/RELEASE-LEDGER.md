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
| **Newest release** | **v251 — “Alive”** (packaged 16 Nov 2026, **awaiting the owner's yes**; contains v237–v250) |
| Package | `shivaa-update-v251.zip` · 772 files · 45,504,067 B · `c03ff713453d3d2c7c3ed2c93168419f8d6b5eb06b3927471eb22a81c4fa60fa` |
| **On the site** | **v244** — installed 12 Nov 2026 and **it broke the phone's scroll** (`content-visibility`); v245 repairs it, and v246 then makes the page light. The owner's next report (*“lag… doesn't load everything fast”*) arrived after v245 was handed over; whether it was installed is not stated, and v246 contains all of it either way. Before that, **v241**:: smooth, but *“clicks are not working now and buttons are unresponsive”*. v242 fixed that but was never installed; v243 restores the desktop header categories he reported gone and contains all of v242. |
| Package on the site | `shivaa-update-v241.zip` · 682 files · 43,636,784 B · `6987184a07398433c59cb4304f3f0b0e2a27583fed97d13787a0bcf90c7c8cdf` |
| **Next release** | **v252** |
| Work branch | `arena/95be65a4-shivaa-ecom` (cut from `a9445dc`, the v236 tip of `arena/800194ed-shivaa-ecom`) |
| Twin branch | `arena/09f3c79f-shivaa-ecom` — frozen at its v220 tip `4a9e239`, PR #106 open, untouched |
| Release chain | v232 → … → v239 → v240 (applied 12 Nov, ripple fix) → v241 (applied 12 Nov, smooth — broke taps) → **v242 (packaged 12 Nov, never installed) → v243 (packaged 12 Nov, never installed) → v244 (installed 12 Nov, broke the phone) → v245 (packaged 12 Nov, the scroll repair) → v246 (packaged 12 Nov, the weight: 5,113 KB → 1,832 KB of pictures, 33 script requests → 2) → **v247 (packaged 12 Nov, the feel: 23 compositor layers → 14, one 3D context, images visible by default, touch answers in 90 ms, home paints at 700 ms with a price skeleton, ₹NaN gone) → **v248 (packaged 12 Nov, the tap: the view transition, the smooth scroll-home and the rail centring removed from the navigation path; the splash lifts at 260 ms; one forced layout per route; reveal stand-down under a thumb; a tap meter) → **v249 (… the blink + the bytes: no content animates in from opacity 0, the late batch is adopted instead of repainting, the curtain is never painted on a warm device, JS minified −39 %)** → **v250 (packaged 12 Nov, the still: the phone's compositor budget measured and cut — animated 141 → 15, infinite 25 → 2, blur 21 → 0, blend 6 → 0, promoted 31 → 0; the `viewIn` blink fixed at the source; the storefront's only non-passive touchmove removed; a frozen page unlocks itself)** → **v251 (packaged 16 Nov, the alive: the sign that the shop is live, out of the phone's spare budget — 90 ms press on every tappable surface, a breathing pending price, a 6 px live dot, a settling first row, a popping bag badge and a gold rate hairline, all event-bound, one running on a settled page; a 2 px read bar driven by one rAF per scroll frame; and the one stylesheet ships minified 965,451 → 876,841 B with a build step that refuses to write a sheet that is not structurally identical to the readable bundle)** |

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
| **v251** | **`(this commit)`** | **Alive** | **772** | **45,504,067** | **`c03ff713453d3d2c…81c4fa60fa`** | packaged 16 Nov — the alive. v250 took the phone's continuous animation away and, with it, every sign that the shop is live; v251 gives the sign back out of the only budget a phone has to spare, **motion that answers the shopper (transform/opacity, bound to an event) and never motion that runs on its own**. 90 ms `scale(.977)` press on every surface a thumb touches (cards, tiles, chips, tabs, drawer rows, icon buttons — they had none; only buttons did), with `filter` removed from the press path; a pending price breathes (opacity only) instead of freezing grey; a 6 px live dot on the utility strip; the first row settles 24 ms apart travelling 10 px with opacity never changing; the bag badge pops for 320 ms on a MutationObserver (not a poll); a fresh rate sweeps one gold hairline on the `rates` event. **Exactly one of those runs on a settled page.** A 2 px read bar fills to the shopper's place in the page from **one rAF per scroll frame**, page height measured on resize/route and never inside the scroll handler. **Faster without losing quality:** `index.html` now loads `css/shivaa.min.css` — 965,451 → 876,841 B (−9.2 %, gzip ≈ 191 KB → 174,636 B) — produced by the new `tools/build-css-min.mjs`, which **refuses to write a sheet that is not structurally identical** to `css/shivaa.css` (8,758 effective rules compared with their media context, 9 `@font-face`, 264 `@keyframes`, `restructure:false`); the readable bundle still ships, so a rollback is one `<link>`. Plus `decoding="async"` on all 43 image templates with a runtime backstop. Gates: new `t-v251-alive` (46) + t-v250 34 + t-v249 36 + t-v248 37 + t-v247 53 + t-v246 58 + t-v245 39 + t-v244 54 + t-v243 36 + t-v242 41 + t-v241 43 + t-v240 16, all 0 red; `check-handoff` 259 checks 0 red |
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
