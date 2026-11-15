# NEXT-CHAT-HEAD — paste this first in every new chat

**Written 12 Nov 2026 (Asia/Calcutta), after v246 was packaged.**
**Newest release: v246 “Lightning”** — packaged, awaiting the owner's yes; it contains v237–v245.
**Next release: v247.** Session branch: `arena/95be65a4-shivaa-ecom`.

**Branches (read this once):** this session works on `arena/95be65a4-shivaa-ecom`. The ledger's stored
`release_branch` field still says `arena/e8a470c6-shivaa-ecom` — that is the name an earlier session wrote
into `docs/release-ledger.json` and `qa/check-handoff.py` pins it, so it stays; it is **not** a branch to
switch to. Never switch, create or push a branch other than the session branch.

**The package to install:** `shivaa-update-v246.zip` · **689 files** · **43,776,814 B** · sha256
`d389c28b1829541aae93deade6b1029f423e01b4fb9c77d5100366560a98ef88`. It is the only zip to install.

**Why v246 exists — the owner's words were about weight, so the fix was measured in bytes:**
*“App lags and feel stuck and doesn't load everything fast and lighteining speed”*. Two counts, taken on
this tree before anything was changed:

1. **Pictures.** The phone home page asked for **72 pictures = 5,113 KB**. A 409 KB
   `reviews/cust-2.jpg` was sitting in a 150 px circle; a 244 KB `products/necklace-rani.jpg` was sitting in
   a 360 px card; the 18-chip category rail served 40–132 KB originals into 72 px circles; the quick-view
   overlay opened at 244 KB. Five render sites wrote `p.images[0]` straight into `src=` instead of calling
   `thumbAttrs()`, so the 320/560 webp thumbs that `qa/build-thumbs.py` had been generating since v241 were
   never requested. All of them now go through `thumbAttrs()` / `thumbUrl()`; home is **1,832 KB**.
2. **Requests.** `index.html` asked for **33 separate `<script>` files** with `defer` — each one waits for
   the one before it, so on 4G that is 33 round trips before the last layer can run. The 31 behaviour
   layers are now concatenated, in document order, into `js/rel.js` by `tools/build-js-bundle.py`:
   **two script requests** (`app.js` + `rel.js`), both preloaded from the head. `app.js` stays out of the
   bundle on purpose — a behaviour layer must never be able to stop the shop from opening. Rebuild with
   `python3 tools/build-js-bundle.py --write` (it refuses to write a bundle that does not parse); never
   hand-edit `rel.js`; the source layers stay on disk so a rollback is one `index.html`.

The service worker install no longer competes with the page it is installing for: four fetches at a time,
fonts/icons/pictures taken from the http cache instead of `cache:'reload'`, precache list ~40 → **18**.

**The rule that would have un-done v245 silently:** v245 deleted `content-visibility` from the *shipped*
`css/shivaa.css` by hand. The next `build-css-bundle.py --write` would have put all 19 declarations
straight back. They are now deleted from the **twelve source layers** and the bundle is regenerated;
exactly **one** `content-visibility` remains — the universal guard in `css/v245.css`. Never add
`content-visibility: auto` again, and never edit the bundle instead of a layer. `overflow-x: hidden` on
`html, body` is banned too (use `clip`).

> ⚠ **No per-release gate script exists.** `node --check` (app, rel, sw), `t-v246-light` (**58/58** — the new
> one: one-request bundle, worker storm, small-slot originals, and a picture budget measured on a rendered
> home/shop page on phone and PC), `t-v245-scroll` (39/39), `t-v244-butter` (54/54), `t-v243-header`
> (36/36), `t-v242-taps` (37/37), `t-v241-perf` (43/43), `t-v240-rip` (16/16) and `check-handoff.py` are
> green — **283 checks**. The older suites now ask "is vXXX inside `rel.js`, at the right index?" instead of
> looking for a per-file `<script>` tag.
>
> **jsdom has no scroll engine, no compositor and no network.** The byte counts here are real (file sizes),
> the *feel* is not measurable in this sandbox. That is why `?perfdiag=1` (report) and `?nofx=1` (kill
> switch: no parking, no decode-ahead, plain site) exist — the owner's device is the only place the result
> can be confirmed. Do not explain away an owner report with numbers from here.

**What to do if the owner still says it is slow:** ask for `?perfdiag=1` output and the phone model, and
check in this order — (1) is the browser fetching `-320.webp` or the originals (Network tab, filter
`images/products`), (2) is `rel.js?v=246` in the requests or 32 old `v###.js` files, (3) the gold-rate
`/api/rates` round trip (the 6 s preloader cap is deliberate: rates are never cached, and a screen of
₹0 is worse than a splash). Next candidates are already listed in `MEMORY.md`: merge `app.js` parsing work,
`.aurora::before` blur(26px) + 14 s drift, ~32 `transition: all`.

---

## Paste block (start of a new chat)

```
Repo: theunreal8055-coder/Shivaa.ecom — branch arena/95be65a4-shivaa-ecom.
Read AGENTS.md (CURRENT STATE first) and docs/NEXT-CHAT-HEAD.md before anything.
Run: bash qa/where-am-i.sh   → exit 0 = FORWARD, exit 3 = behind (stop, move to the branch it names).
Then: python3 qa/check-handoff.py ; node qa/browser/t-v246-light.mjs ; node qa/browser/t-v245-scroll.mjs
Newest release: v246 “Lightning” (packaged, not installed). Next number: v247.
NEVER use content-visibility (it froze the owner's phone), never overflow-x:hidden on html/body.
Never write images[0] into src= — every picture goes through thumbAttrs(). Never add a 33rd script tag:
add the layer to tools/js-bundle-order.txt and rebuild rel.js.
Only the owner deploys. Reply to him in simple Hinglish.
```
