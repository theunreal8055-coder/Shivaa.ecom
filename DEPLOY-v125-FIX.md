# SHIVAA v125-FIX — deploy (Hostinger · 3 minutes)

**What this release is:** a three-file repair that makes the live server a
pure v125. Live probing on 16 Sep found: (1) `sw.js` was still the **v126
shell** (`shivaa-shell-v126`) — and because the server file equals what the
v126 shell installed, no device will ever detect an update until it changes;
(2) `js/boost.js` was **missing** (404) — the v46-era ambience file that
mounts the hero film, the carousel ambient films and the bridal CTA film,
so those films silently stopped playing; (3) `css/boost.css` was **missing**
(404) — the stylesheet for those same elements. Everything else on the
server was verified v125 (`app.js` APP_REL=125, `v117.js` v125-era,
`v125.js` pure, `v126.js`/`v126.css` absent).

`api.php` · `.htaccess` · `data/db.json` · `index.html` are **NOT** in this
zip. Nothing in `data/`, `uploads/` or `images/` is touched.

| file | era | proof |
|---|---|---|
| `sw.js` | v125 | byte-identical to `shivaa-update-v125.zip`'s `sw.js`; shell `shivaa-shell-v125` |
| `js/boost.js` | v125 (pre-v126) | `node --check` clean; 0 `data-film`, 6 `autoplay`; the v126 zip's only difference is its cold-film edits |
| `css/boost.css` | pre-v126 | untouched by both v125 and v126 (in neither zip) |

## 1 · Upload

1. Upload **`shivaa-fix-v125.zip`** (3 files, 87 KB) into `public_html`.
2. Right-click → **Extract** → **Overwrite / Replace all**.
3. Root layout: `sw.js`, `js/boost.js`, `css/boost.css` land where they
   belong. Nothing to move.

## 2 · One-time device clear (30 s each)

The v126 service worker is installed on every device that visited during
the v126 period. The new `sw.js` content triggers the in-app update banner,
but the belt-and-braces move is: close **every shivaa.in tab** → Chrome →
Settings → Site settings → shivaa.in → **Clear & reset** → reopen.

## 3 · What to check

| # | Check | Expected |
|---|---|---|
| 1 | View-source `https://shivaa.in/sw.js` | `shivaa-shell-v125` |
| 2 | Load the homepage, watch the hero 5 s | The photograph paints immediately; the hero **film fades in** over it (it was a still photo before this fix) |
| 3 | Scroll to Revolving Case + Gold Thread | All nine films still play exactly as now — this fix does not touch them |
| 4 | DevTools → Application → Service Workers | `shivaa-shell-v125` active, no v126 shell |
| 5 | Console on a fresh load | No more failed `boost.js?v=46` / `boost.css?v=46` requests |

## 4 · Why it was safe to ship as a repair

- `sw.js` is byte-identical to the one inside `shivaa-update-v125.zip` —
  this is not a new build, it is the v125 release's own shell.
- `boost.js`/`boost.css` were never edited by v125 or v126's zip (v126's
  zip carries a *modified* `boost.js`; this one does not).
- The v125 shell's precache asks for exactly `/js/boost.js?v=46` and
  `/css/boost.css?v=46` — both restored, so the precache warms fully.
  `v117.js` (v125-era, already live) injects `boost.js?v=46` — stamps match.

## 5 · Rollback

None needed — worst case, re-extract `shivaa-update-v125.zip` over the top
(the site works without the boost pair by design: poster-first).
