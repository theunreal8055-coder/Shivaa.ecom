# DEPLOY-v222.md — release 222 · "THE LOAD RELEASE" · one stylesheet, one paint

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 222 is live, stop.

**Read `DEPLOY-v205.md` first.** Drop-in replace root with `cms/` (same shape),
then `purge` before `activate`. This package carries v206 → v222 and includes
the film files (`images/films/`) and the offer artwork (`images/offers/`).

---

## 1 · What the owner asked

> "The website is not loading correctly and smoothness is not like other d2c
> brands, make the update file"

Two things were measured first, and both were real.

## 2 · The finding — the shop asked the browser for 58 stylesheets at once

`cms/index.html` linked **58 `<link>` tags for 57 separate stylesheets, and
every single one of them was render-blocking**. A browser cannot paint a single
pixel until all of them have arrived.

Worse, six of those layers (`hallmark`, `trust`, `motion`, `aurum`, `v107`,
`boost`) used the preload-swap pattern — they were fetched non-blocking and
swapped in *after* the first paint. So the page painted, then **restyled itself
in front of the shopper**. That restyle is the "not loading correctly" feeling;
the 58 serialised round trips are the "not smooth".

This grew organically: every release added its own layer rather than editing an
earlier one (which is the right instinct for a forward-only repo — it just
never got collected up).

| | v205–v221 (live shape) | v222 |
|---|---|---|
| Stylesheet requests | **58** | **1** |
| CSS, gzipped | 267.6 KB | **168.3 KB** |
| CSS, raw | 1,046.1 KB | 850.7 KB |
| Arrives after first paint | 6 layers | **none** |
| Service-worker precache on install | 57 stylesheets | **1** |

The byte saving is nice, but the **57 fewer round trips** is the point. On a
phone on Indian mobile data, that is the difference between a page that appears
and a page that stutters in.

## 3 · The fix

Everything now goes through one file, `/css/shivaa.css?v=222`:

- **`tools/css-bundle-order.txt`** — the cascade order, in one place. It is the
  exact document order the 58 `<link>` tags had. **This order is load-bearing**:
  later layers exist to override earlier ones on specificity ties.
- **`tools/build-css-bundle.py`** — concatenates the layers in that order into
  `cms/css/shivaa.css`, stripping CSS comments (quote- and escape-aware, so it
  never touches a string or a `url()`). It then *proves its own output*: byte
  equality against an independent rebuild, and every block present at its own
  position without overlap.
- **`cms/css/shivaa.css`** — the built bundle. Never hand-edit it: edit the
  layer under `cms/css/` and re-run `python3 tools/build-css-bundle.py --write`.

### One detail that had to be preserved exactly

`index.html` linked **`v186.css` twice** (lines 97 and 104). Two `<link>`s to
one stylesheet still occupy **two positions in the CSS cascade**, so the bundle
reproduces both. Dropping either one would let an earlier layer win a tie it
currently loses. The order file says so in a comment, and
`qa/browser/t-v222-bundle.mjs` fails if anyone "tidies" it away.

### What was deliberately **not** done

- **No minification.** Whitespace is untouched, so a bundle rule reads exactly
  like its source. gzip/brotli carry the bytes (`.htaccess` already serves both).
- **No source file deleted or edited.** All 57 layers stay in the repo and in
  the zip. The QA suites read them, and a rollback restores `index.html` alone.
- **No JavaScript bundling.** The scripts are already managed: 22 `defer` files,
  `admin.js`/`qr.js` fetched on demand at `#/admin`, and
  `motion.js`/`aurum.js`/`boost.js` injected after first paint by `v117.js`.
  Bundling them would risk `'use strict'` leaking across file boundaries for a
  gain that first paint never sees.

## 4 · The second bug this release fixes (found by the gate)

While re-running the QA, `t7-audit` caught a **real crash on the Contact page**:

```
TypeError: Cannot read properties of null (reading 'address')
    at pages.contact (js/app.js:9032)
```

`state.settings` started as `null` and only became an object after
`/api/settings` answered. Boot deliberately **caps that wait at 6 seconds and
paints the degraded page anyway** — so during that window any route that read a
setting threw. The Contact page read `state.settings.address` directly.

In other words: **a shopper who opened Contact in the first seconds on a slow
connection got a half-drawn page.** That is the same complaint as the rest of
this release, and it is now fixed at the root:

- the shop's defaults live in one `SETTINGS_DEFAULTS` object;
- `state.settings` starts as those defaults, so it is never null;
- the API answer still overrides them field by field, exactly as before.

`state.rates` already used this defensive pattern everywhere; `state.settings`
was the exception.

## 5 · Version stamps (all moved to 222)

`index.html` (`?v=222` ×28 + `window.__SHIVAA_REL=222`), `sw.js`
(`shivaa-shell-v222`, `const REL = 222;`, SHELL_FILES re-stamped),
`app.js` (`APP_REL = 222`), `api.php` (`'rel' => 222,`), and both shipped
countdown docs (`docs/HANDOFF-unreal8055.md`,
`docs/shivaa-website-facts-for-grok.md`).

The shell name changed, so every phone picks the new files up on activate.

## 6 · QA run before packaging (headless jsdom + static, no real browser)

| Check | Result |
|---|---|
| `node qa/browser/t-v222-bundle.mjs` (**new** — 36 assertions) | **36 / 0** |
| `node qa/browser/t-v221-cleanup.mjs` | **34 / 0** |
| `node qa/browser/t-v220-billing-gone.mjs` | **13 / 0** |
| `node qa/browser/t-v209-alive.mjs` (alive suite) | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` (flip guard) | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` (routes + buttons + errors) | **4 / 0** |
| `node qa/browser/t-v218-sidebar.mjs` | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` | **22 / 0** |
| `node --check` on `app.js`, `sw.js` and every edited suite | clean |

The new suite locks the whole claim: the layer order, the `v186.css` double
position, that `index.html` links exactly one stylesheet, that no per-layer
`<link>` or preload-swap survives, that the service worker precaches one file,
that the live selectors (`.sv-case-no`, `.bc-card`, the v219 offer depth, the
stillness guards) are inside the bundle — and it **re-runs the build script's
own byte-equality proof as part of the gate**.

**The gate earned its keep twice on this release:**

1. `t-v222-bundle` caught the first draft of `build-css-bundle.py` deriving its
   input order from `index.html`. Once `index.html` links only the bundle, that
   means bundling the bundle into itself. The order now lives in its own file.
2. `t7-audit` caught the Contact-page crash described in section 4.

Both are why the suites are run in full before a zip is built, not skipped.

**Not run:** `php -l` on `api.php` (PHP is not installed in this sandbox). The
v222 `api.php` change is a single number (`'rel' => 221,` → `'rel' => 222,`).
Please run one `api.php` request (e.g. `GET /api/settings`) after upload.

**Not verified in a browser:** there is no real browser here. The bundle was
proven *equal to the concatenation of the layers in the exact historical
order* — that is a mathematical guarantee about the bytes, not a screenshot. The
owner checklist in section 8 is how the visual side gets confirmed.

## 7 · Package

- `shivaa-update-v222.zip` — **350 files · 37,218,811 bytes · sha256
  `e05e08dd1bd550a4c04b8b4b59ca6884627b68122a34f6934b5348e6d9f77643`**
- Same file list as v221 **plus one new file**: `css/shivaa.css`.
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- `cms/data/db.json` is **not** in the zip (gitignored, local fixture only).
- Verified after building: all 350 packaged files compare byte-identical to
  `cms/`, and the `css/shivaa.css` inside the zip hashes to
  `7167f1bcd7d854d3868ba067c3d767d087a9818d8f9148804184795d80fcd188`.
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v222.zip`
- Rollback rung: `shivaa-update-v221.zip` — the last live release is still **v205**.

## 8 · Deploy steps (after the owner's explicit yes only)

1. Download `shivaa-update-v222.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Check `GET /api/settings` answers and `GET /api/version` reports rel 222.
5. **Owner visual check — this is the release, so look at the loading itself:**
   - Open the site **on a phone**, on mobile data (not wifi).
   - The page should appear **once, fully styled** — there must be **no flash
     where it restyles itself a moment after appearing**. That flash is the
     thing v222 removes; if it is still there, stop and report it.
   - Scroll the home page — it should feel steadier, not steppy.
   - Open **Contact** (`#/contact`) and check the store address, phone and
     email are all shown (that is the page that used to crash).
6. Optional but useful: in Chrome DevTools → Network, filter by CSS. You should
   see **one** row, `shivaa.css`, not 58.

## 9 · Suggested rollback

If anything about the styling looks wrong after upload, restore
`shivaa-update-v221.zip`. Because every source layer still ships, the narrowest
rollback also works: put v221's `index.html` back on its own — the 57
individual stylesheets are all present on the server either way. Forward-only
still applies: never re-number, never reuse 222.
