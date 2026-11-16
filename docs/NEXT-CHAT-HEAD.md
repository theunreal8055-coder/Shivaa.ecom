# NEXT CHAT HEAD — read this first

> **CURRENT STATE — v248 “Instant” PACKAGED, AWAITING THE OWNER'S YES (12 Nov 2026).**
> The only zip to install: **`shivaa-update-v248.zip`** — **763 files · 45,051,400 B ·
> `861d946d45afaac68b395aafc29eee36399df6ab9e8b067361f7429e10553faa`**.
> It contains v237–v247, so **one upload brings the shop fully up to date.**
> **Next release number: v249.** Branch: `arena/95be65a4-shivaa-ecom`.
> Raw link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/95be65a4-shivaa-ecom/shivaa-update-v248.zip`

> **BRANCH WARNING.** Work on `arena/95be65a4-shivaa-ecom` only. The `release_branch` field inside
> `docs/release-ledger.json` still says `arena/e8a470c6-shivaa-ecom` for the twin tree — do **not** switch
> to it, do not create a branch, do not force-push. Forward-only.

> **Before anything else:** `bash qa/where-am-i.sh` → exit 0 FORWARD (exit 3 = this tree is behind; stop and
> move to the release branch it names), then `python3 qa/check-handoff.py` and
> `node qa/browser/t-v248-instant.mjs`.

---

## 1 · What the owner asked for, in his words

> *“Still the app doesn't feel smooth, and whenever you click any option or any button it waits for 3 seconds
> and then starts loading the next page, why does it lags for 3 seconds and it feels struck and loads very
> slowly for the first time also and whenever we scroll after that.”*

Three complaints, one measurement each: **(a)** a tap waits, then loads; **(b)** the first load is slow;
**(c)** scrolling after a navigation is heavy. v248 answers all three, and gives him the instruments to prove
the answer on his own phone.

## 2 · The 3 seconds were a deferral, not slow rendering

Rendering a route here is a hash change plus one `innerHTML` assignment: measured in the jsdom harness it is
**11 ms to the hash and 145 ms to the new page**, on a phone viewport **54 ms**. Whatever he experienced was
something standing *between* the tap and `location.hash`. The audit found three such things and all three are
gone:

| # | what stood in the way | where | what it does now |
|---|---|---|---|
| 1 | `startViewTransition` navigation: `preventDefault()` on the link, snapshot of the old page, hash set inside the callback behind a 300 ms cap + rAF | `cms/js/v226.js` | **opt-in** (`?vt=1`), off by default — a plain native hash navigation again |
| 2 | `window.scrollTo({top:0})` under `html{scroll-behavior:smooth}` → the new page drew at the old offset and glided home | `cms/js/app.js` `route()`, `motion.css` | `behavior:'instant'` + `html,body{scroll-behavior:auto!important}` + a 700 ms hold around any tap (`css/v248.css`) |
| 3 | rail centring: a smooth `scrollIntoView` on the chip that was about to be replaced | `cms/js/v226.js` `centerRail()` | skipped for any link that navigates |

**No animation may ever be removed by tuning it.** The rule for v249 and after: if something sits between a
tap and the page, delete it, do not speed it up.

## 3 · First load

`index.html` ships a real page skeleton (`#view > .shv-skeleton`). The opaque preloader used to cover it until
the whole boot batch answered. **It lifts at 260 ms in every case** (`liftPreloader()` in `app.js`), and the
cold paint ceiling went **6000 → 4000 ms** — safe because every unknown price renders as a skeleton
(`PRICE_PENDING`), never ₹0 and never ₹NaN. Tested with `boot('#/', { stall: true })`: every request hangs
forever and the skeleton is still on screen.

## 4 · Scrolling after a tap

- `lazySweep` ran **three times** per navigation (0 / 900 / 2600 ms); every run calls `getBoundingClientRect()`
  on every image, i.e. a forced style+layout. Now **once on the next frame** + the 2600 ms CMS pass.
- While `html.shv-scrolling` is on (v244 owns it), entrance animations, reveal classes and image fades are
  switched off — a picture that arrives under a moving thumb is simply there.
- The 110 KB of decorative scripts (v117 → aurum · motion · boost) no longer land in an idle window that
  opened *mid-gesture*: they wait for **700 ms of real quiet** (hard ceiling 12 s).

## 5 · The instruments (use these when he reports again)

| what | how |
|---|---|
| last 12 taps: press → hash → page → paint, plus every long task | `Shivaa.taps()` in the console |
| one line to paste into a message | `Shivaa.v248.report()` |
| the same numbers on the screen, big, for a screenshot | open the site with `?tapdiag=1` |
| kill all decorative motion | `?nofx=1` |
| the previous audits | `Shivaa.v245.audit()`, `Shivaa.v247.audit()` |

The meter reads `pointerdown`, so the number starts at the finger, not at the end of the click.

## 6 · Honest limits — say this to him

jsdom has **no compositor, no rasteriser, no scroll engine and no `startViewTransition`**. Everything in this
document is a measurement of *code paths*, not of his phone. What v248 can honestly claim: *the three places
where a tap could be parked are gone, and the meter will show it on the device*. Do not write “smooth” without
his confirmation.

## 7 · HARD RULES (do not re-learn these the hard way)

- **Never `content-visibility`.** v244 froze a phone with it.
- **Never `overflow-x: hidden` on `html, body`** — use `overflow-x: clip`.
- **Never `preventDefault()` a navigation link.**
- **Never leave `scroll-behavior: smooth` on `html`** — a route change must be a jump.
- **Never write `images[0]` into `src=`** — every picture goes through `thumbAttrs()` / `thumbUrl()`.
- **Never add a `<script>` tag per layer** — edit the layer, then `python3 tools/build-js-bundle.py --write`;
  CSS: `python3 tools/build-css-bundle.py --write`. Bundles are generated; never hand-edit `rel.js`/`shivaa.css`.
- **Never ship** `.htaccess`, `config.php`, `cms/data/db.json`; no credentials in chat.
- **Never guess a number into a handover.** If it is not measured, say it is not measured.

## 8 · If he still says it feels slow, do this in order

1. Ask for one line: `Shivaa.v248.report()` (or a `?tapdiag=1` screenshot). It separates
   *press → hash* (a deferral or the browser) from *hash → page* (our render) from *long tasks* (parse, decode,
   layout).
2. If **press → hash** is large: something is still intercepting the click. Audit every `preventDefault`,
   every `startViewTransition`, every `navigate()` that sets the hash inside a callback.
3. If **hash → page** is large: the route itself is doing work. Profile `pages[page]` for that route; look for
   a synchronous fetch or a full catalogue rebuild.
4. If **long tasks** are large: look for a 100 KB+ parse (a layer added to the bundle), a big image decode
   (`thumbAttrs` bypassed), or a layout read in a scroll handler.
5. Only then consider moving work off the critical path.

## 9 · Verification state at packaging

- `python3 qa/check-handoff.py` → **234 checks, 0 red** (after this file and the zip are committed).
- **376 browser checks, 0 red**: `t-v248-instant` 37, `t-v247-premium` 53, `t-v246-light` 58,
  `t-v244-butter` 54, `t-v241-perf` 43, `t-v242-taps` 40, `t-v245-scroll` 39, `t-v243-header` 36,
  `t-v240-rip` 16.
- `python3 tools/build-js-bundle.py` → 34 layers, one request; `build-css-bundle.py` → 75 layers, one request.
- Stamps at 248: `index.html` (`__SHIVAA_REL`, every `?v=`), `app.js` `APP_REL`, `sw.js` `REL` +
  `shivaa-shell-v248`, `api.php` `'rel' => 248`.

## 10 · Paste block for a fresh chat

```
Repo     theunreal8055-coder/Shivaa.ecom   branch arena/95be65a4-shivaa-ecom (do not switch, do not force-push)
Live     v248 “Instant” — packaged 12 Nov 2026, awaiting the owner's yes (deployed build on his host: 244)
Package  shivaa-update-v248.zip · 763 files · 45,051,400 B
         sha256 861d946d45afaac68b395aafc29eee36399df6ab9e8b067361f7429e10553faa
Contains v237–v247
Next     v249 — start from the owner's Shivaa.v248.report() line, never from a guess
Gates    node qa/browser/t-v248-instant.mjs (37) · python3 qa/check-handoff.py (234)
Rules    no content-visibility · no overflow-x:hidden on html/body · never preventDefault a nav link
         no scroll-behavior:smooth on html · bundles are generated · .htaccess/config.php/db.json never ship
```
