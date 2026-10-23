# DEPLOY-v235.md — Shivaa Ecom · v235 "The Millisecond Desk"

**Deploy this one.** It contains v234 (the desk app you already applied) plus the
change you asked for: the bullion desk stays as current as its data can be, and
every number on it says how old it is.

**What you said:**
*"Update the bullion desk more, keep it updated every millisecond."*

**Status: packaged 23 Oct 2026 — NOT deployed.** Nothing goes live without your
explicit yes. The build you applied is **v234** (23 Oct 2026). Gate:
**26 checks, 0 red**. Package: `shivaa-update-v235.zip` —
**367 files · 37,424,830 bytes** — sha256
`f5b14e8a274a1911ed87875992de43a144402e48930f4702553e8ad09b26ec35`.

**Next release: v236.** Rollback is v234.

---

## 1 · Straight answer first: what "every millisecond" can and cannot mean

**Cannot:** a price that changes a thousand times a second. MCX/Angel sends one
quote about every second, and the desk caches it for one second. Anything faster
would be a number we invented — and an invented price on a bullion desk is a
loss, not a feature. So v235 never fabricates a price.

**Can, and now does:**

| | v234 (live) | v235 |
|---|---|---|
| when a tick is painted | on a timer, behind whatever else the page was doing | in the **next animation frame**; ticks landing together become **one** repaint |
| price change cost | one forced layout per changed number | **0** layout reads (counted in the test) |
| clock | date + time, refreshed with the tick | **12:04:31.284** — milliseconds, every frame |
| how old are these numbers? | you had to guess | shown: `+142 ms`, amber past 1.5 s, red past 5 s |
| updates per second | not stated | measured and shown: `1.0/s` (or `9.4/s` with the push relay) |
| stale feed | kept showing the number | the board **dims** and says how old it is |
| poll rate | every 800 ms against a 1 s cache (1 request in 5 wasted) | the server says how fresh it can be: **250 ms** with the relay, **1 s** on the cache, **5 s** when stale |

---

## 2 · What a jeweller sees

Under the brand line, one strip:

```
17:42:06.318     +142 ms     1.0/s
```

- **the clock** — IST, to the millisecond, in tabular digits so it never jumps
  sideways;
- **the age** — how old the digits on the board actually are: the exchange age
  the server measured, plus the time the tick took to reach this frame. Green,
  then amber past 1.5 s, then red past 5 s;
- **the rate** — ticks actually received per second over the last two seconds.
  That is the number that answers "is this live?" without anyone having to
  believe a label.

Past five seconds the values dim and the top bar gains a red hairline. It does
not hide them: a jeweller needs to see the last known price *and* know it is
old.

---

## 3 · What is in the package

367 files — v234's 366 plus **`css/v235.css`**. The stylesheet is inside the one
bundle (now **69 layers**, 936,026 B raw / 184,230 B gzipped — still **one**
request). No new scripts: the engine lives in `js/admin.js`, which both the shop
and the desk already load, so `desk.html` needs no regeneration beyond the
release stamp.

Not in the package, ever: `data/db.json`, the root `.htaccess`, `config.php`,
uploads.

---

## 4 · Install

1. Back up `data/db.json`.
2. Upload `shivaa-update-v235.zip` over the site root, overwriting.
3. Hard-refresh once; the service worker moves the tab to `shivaa-shell-v235`.
4. Verify: `https://shivaa.in/api/version` must read `rel: 235` and
   `stamp.matched: true`.
5. Open `https://shivaa.in/desk.html` as a jeweller and check: the strip under
   the brand shows a millisecond clock, an age in ms and a rate; prices flash as
   ticks land; leave it open a minute and the rate stays around `1.0/s`; turn
   the phone's data off and within five seconds the board dims and the age turns
   red.

**Rollback:** re-upload `shivaa-update-v234.zip`. v235 changes **no database
shape** at all — new fields live only in the tick response and in the page.

---

## 5 · What could not be checked here

- **A real phone and a real PC.** Everything was measured in jsdom
  (`qa/browser/t-v235-live.mjs`, 71 assertions) plus the gate (26 checks, 0 red).
  The real `requestAnimationFrame` cadence, a real exchange feed and how the
  strip reads in sunlight were not exercised on a handset.
- **The live Angel/MCX feed.** No credentials and no network here: the suite
  drives `qa/preview_shim.py`, which mirrors the tick's exact shape and prices
  the fixture board. The `250 ms` relay path in particular is reasoned from the
  code (the relay writes ~10 frames/s) and is **not** measured against a live
  relay.
- **PHP.** No PHP binary: `api.php` is checked with `qa/phpbal.py` (balanced) and
  mirrored in the shim. The PHP itself has not been executed.
- **Your live database and real partner accounts.**
- **Play Store**: `playstore/verify.mjs` still exits 2 by design (placeholders,
  unrelated to this release).
