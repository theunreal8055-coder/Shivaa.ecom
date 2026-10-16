# DEPLOY-v224.md — release 224 · "THE EVERY-CORNER RELEASE" · smoother, and every corner checked

Status: **READY — owner approval required before anything is taken live.**
A push, a green test run, or a finished zip is **not** approval. Live today is
**v205** (WWW + Netlify). If anything higher than 224 is live, stop.

**Read `DEPLOY-v205.md` first.** Drop-in replace root with `cms/` (same shape),
then `purge` before `activate`. This package carries v206 → v224 and includes
the film files (`images/films/`), the offer artwork (`images/offers/`) and the
one stylesheet bundle.

---

## 1 · What the owner asked

> "Make it even more smoother in the next update and fix all usability issues,
> make a big update file by checking each and every corner"

So this release is two things at once: the remaining smoothness that a fast
connection cannot hide, and a corner-by-corner pass over the parts of the shop
people touch with a thumb.

## 2 · The smoothness that was still there — layout animations

A server-side speed-up only helps until the page is on the screen. After that,
"smooth" is decided by whether the browser has to **lay the page out again** on
every frame. A CSS animation on `margin`, `left`, `width` or `top` does exactly
that: every frame the browser re-measures the page and repaints it on the CPU.
An animation on `transform` / `translate` / `opacity` is handed to the
compositor instead and costs the main thread almost nothing.

Five keyframes in this shop were still doing it the expensive way:

| Animation | What it did every frame | Where the reader sees it | Now |
|---|---|---|---|
| `hsFloat` | animated `margin-top` on **four** hero cards | **the first thing on the home page, from first paint** | `translate: 0 -13px` |
| `plSweep` | animated `left` on the pillar line | home, always running | `translate: -100% → 250%` |
| `plShine` | animated `left` on the hover shine | pillar / card hover | `translate` |
| `finSheen` | animated `left` on the finale sheen | the 10 g band | `translate: -140% → 280%` |
| `floatBullion` | animated a **40-50 px `drop-shadow` filter** | the 10 g poster card | static shadow; the float is `transform` |
| `bcBeam` | animated a **`blur()` filter** on a ~500 px aurora | Black Card hero | static `blur(1.25px)`; the pulse is `opacity` |
| `bcRevealCard` | animated a `blur(5px)` on entry | Black Card reveal | `transform` + `opacity` only |

Every geometry was preserved by arithmetic, not by eye: e.g. the pillar sweep
used to travel from `left:-40%` to `left:100%` of a 180 px line — as a fraction
of the 40 %-wide element that is `-100% → +250%` of its own width, which is
exactly what it animates now.

**Honest note on support:** `translate` as an independent property needs
Chrome 104+ / Safari 14.1+ / Firefox 72+ (2021–2022). On anything older the
animation simply does not run — the card stands still, nothing breaks, and the
page is *cheaper*, not wrong. That is a better failure mode than re-laying out
the page on a phone that can least afford it.

## 3 · The smoothness that was still there — timers rebuilding the DOM

Four timers were writing to the page on a schedule, on screen or not, whether or
not anything had changed:

| Timer | Before | After |
|---|---|---|
| Draw countdown (`bindCountdown`) | `innerHTML` rebuild of all four cells **every second, forever** | cells built once; only a changed digit is written; pauses off screen (120 px) and on a hidden tab |
| Draw countdown (`bindFinaleCd`) | the same, plus the label | same fix |
| Footer rate ticker (`v107.js`) | `innerHTML` rewrite **every 2.5 s**, byte-identical because rates move every 10 minutes | writes only when the markup actually changed |
| "MCX live · N s ago" (`app.js`) | wrote the same string **every second** | writes only on a real change, and only into its text node |

Measured on the scheme page (jsdom, MutationObserver on the whole page):

```
before : ~20 nodes rebuilt per second per countdown  (a 4-cell strip re-created)
         + ~27 nodes rebuilt every 2.5 s by the ticker   ≈ 35 DOM writes / second
after  : 11 nodes added / 9 removed in a 5-second window  ≈ 2 DOM writes / second
```

A rebuild is not just "some DOM work": it invalidates the layout of everything
around the strip, which is exactly what a hitch *inside a scroll* is made of.

## 4 · Usability corners (new layer `css/v224.css`, last in the bundle)

1. **iOS zoomed the whole page whenever a field was focused.** A focused input
   under 16 px makes Safari zoom in and it does not zoom back out — after typing
   an email the reader is left on a zoomed page. The 16 px floor already existed
   in v116 / v120 / v192 / v194 / mobile.css, but **later layers re-declared
   smaller sizes on top of it** (13–15 px in v107, v186, v208, v209, boost,
   motion, aurum …). v224 is the last layer, so its floor finally holds. The 39
   selectors it raises are below 16 px *everywhere they appear*, so it can only
   raise a field, never shrink one — verified by re-running that check inside
   the test suite. The deliberately large fields stay as designed
   (`.otp-boxes input` 17–22 px, `.shv-otp input` 20–28 px, `.bbc-wt input` 34 px).
2. **The carousel dots could not be tapped.** `.qv-dot` (7 px) and `.ds-dot`
   (6 px) are real `<button>`s. They keep their exact look and gain a 27 px hit
   area (`::after` with `inset:-10px`) on a 20 px pitch, so neighbouring dots do
   not steal each other's taps.
3. **The buttons in the phone's gesture area.** The concierge FAB, the theme
   button and the back-to-top button sat 22–152 px from the bottom edge — inside
   the home-indicator swipe area on a notched iPhone. All of them now add
   `env(safe-area-inset-bottom)` (and the left inset for the FAB).
4. **The chat panel could be taller than the phone screen.** It was sized with
   `100vh`, which on mobile includes the part of the screen the address bar
   covers — its input could sit below the visible area. It now uses `100dvh`.
5. **Numerals that re-measured themselves.** Proportional digits mean the
   countdown, the footer rate cells and the "MCX live · N s ago" text change
   width every second, re-measuring the strip around them. Tabular figures.
6. **Panel scroll dragged the page behind it** (footer reveal on the last
   swipe) — `overscroll-behavior: contain` on the concierge body and the Saathi
   body.
7. **The newsletter field** now asks for the email keyboard, no autocapitalise,
   no spellcheck, no autocorrect.
8. **Images without `alt`** in the admin panel and both QR renderers now have it
   (empty `alt=""` where a thumbnail is deliberately decorative).

## 5 · What was checked and found already correct (so the corners really were checked)

| Corner | Result |
|---|---|
| **Was anything lost when 58 stylesheets became 1?** | **No.** The bundle carries every one of the 57 files v221 linked (its 64 `<link>` tags were compared one by one against the bundle's layer list). `v186.css` still occupies its two cascade positions. |
| Two CSS files on disk are dead | `bot.css` and `v108.css` — **never linked**, not even before the bundle, and nothing in the shipped tree loads `bot.js` or `v108.js`. Left in place (this release is not a deletion release); recorded in `NEXT-CHAT-HEAD.md`. |
| Tap targets generally | `.icon-btn` is 42/46 px, `.nav-toggle` 42 px, the sidebar/nav links carry their own min-heights; the dots were the only genuinely untappable controls. |
| Text selection | `user-select:none` is used only on decorative UI (gallery wrap, banners, chips, the rate picker) — never on product copy, so nothing a shopper needs to copy is blocked. |
| Keyboard focus | a global `:focus-visible` ring exists in every layer that needs one. |
| `background-attachment: fixed` | none anywhere (it is the classic mobile scroll-killer). |
| Asset references | no new image/CSS/JS reference was added by this release, so the 264-reference / zero-404 result from v223 stands. |
| DOM growth while idle | the scheme page settles and stays flat (asserted in the new suite). |
| JavaScript bundling | **considered again and rejected again**: the 21 files are `defer` (they already download in parallel and do not block first paint); `app.js` alone is 762 KB with 308 top-level declarations, and two files carry top-level `'use strict'`. Concatenating them risks cross-file leakage, and a broken payment path for a few round trips is a bad trade. |
| `content-visibility: auto` on below-fold sections | **rejected**: v217 removed it because a guessed `contain-intrinsic-size` made the page height change while scrolling (the jump-to-top complaint). The modern form (`contain-intrinsic-size: auto`) would be safer, but this sandbox cannot measure layout, so it is left as a future candidate with the reason written down. |
| Hover-only layout transitions (22 rules) | left alone on purpose: they run once per hover, on a mouse, not per frame. Converting them blind would risk changing the look of the card and pillar hovers with no measured gain. |

## 6 · Version stamps (all moved to 224)

`index.html` (`?v=224` ×29 + `window.__SHIVAA_REL=224`), `sw.js`
(`shivaa-shell-v224`, `const REL = 224;`, SHELL_FILES re-stamped ×28),
`app.js` (`APP_REL = 224`), `api.php` (`'rel' => 224`), and both shipped
countdown docs. The shell name changed, so every phone picks the new files up
on activate.

## 7 · QA run before packaging (headless jsdom + static, no real browser)

| Check | Result |
|---|---|
| `node qa/browser/t-v224-corners.mjs` (**new** — 62 assertions) | **62 / 0** |
| `node qa/browser/t-v223-smooth.mjs` | **39 / 0** |
| `node qa/browser/t-v222-bundle.mjs` | **36 / 0** |
| `node qa/browser/t-v221-cleanup.mjs` | **34 / 0** |
| `node qa/browser/t-v220-billing-gone.mjs` | **13 / 0** |
| `node qa/browser/t-v209-alive.mjs` | **96 / 0** |
| `node qa/browser/t-v206-flip.mjs` | **ALL PASS** |
| `node qa/browser/t7-audit.mjs` (37 routes, 145 buttons, 31 controls) | **4 / 0**, 0 uncaught errors |
| `node qa/browser/t-v218-sidebar.mjs` | **13 / 0** |
| `node qa/browser/t-v219-depth.mjs` | **22 / 0** |
| `node --check` on every edited JS file (`app.js`, `v107.js`, `admin.js`, `qr.js`, `v178.js`) | clean |

The new suite does not just look for the strings. It parses **every** `@keyframes`
block in all 58 layers (balanced-brace walk) and fails if any of them animates a
layout property; it walks every `setInterval` in the shipped JS with a real
paren parser and fails if any callback rebuilds markup; it re-derives the CSS
field sizes to prove the 16 px floors cannot shrink anything large; and it boots
the scheme page to prove the countdown's four `<b>` nodes are the **same nodes**
two seconds later (that is the innerHTML churn test), that the digits still
update, and that the page's node count stays flat while it sits idle.

**Not run:** `php -l` on `api.php` (PHP is not installed in this sandbox). The
v224 change there is a single number — please run one `api.php` request after
upload.

**Not verified in a browser:** this sandbox has no real browser and no phone, so
what the owner sees is confirmed by the checklist below, not by these numbers.

## 8 · Package

- `shivaa-update-v224.zip` — **351 files · 37,227,019 bytes · sha256
  `abd3f873bd552052876e145ef4719f2ea3162d22fa6c384250e45e58cf3fc304`**
- One file more than v223: the new layer `css/v224.css` (the bundle it feeds is
  already inside `css/shivaa.css`).
- Includes `images/films/` (18 files) and `images/offers/` (4 files).
- `cms/data/db.json` is **not** in the zip (gitignored, local fixture only).
- Verified after building: the archive was extracted and **all 351 packaged
  files compare byte-identical to `cms/`** (0 differing); inside it the bundle
  carries the `/* v224.css */` block, the `translate:` rules and the
  `safe-area-inset-bottom` fixes, `index.html` links exactly **one** stylesheet
  with `__SHIVAA_REL=224`, and there is no `data/db.json` entry.
- Bundle size: **873,144 B raw / 172,651 B gzipped** (v222 was 871,097 / 172,324
  — this release costs 327 gzipped bytes for all of the above).
- Link: `https://github.com/theunreal8055-coder/Shivaa.ecom/raw/arena/e8a470c6-shivaa-ecom/shivaa-update-v224.zip`
- Rollback rung: `shivaa-update-v223.zip` — the last *live* release is still **v205**.

## 9 · Deploy steps (after the owner's explicit yes only)

1. Download `shivaa-update-v224.zip`; check the sha256 above.
2. Replace the site root with the zip's contents (same shape as `cms/`).
3. Purge the CDN cache **before** activating.
4. Check `GET /api/settings` answers and `GET /api/version` reports rel 224.
5. **Owner visual check — on a phone, on mobile data:**
   - **Scroll the home page slowly from top to bottom.** The hero cards and the
     gold thread should move without the page feeling heavy — that heaviness was
     the hero cards re-laying-out the page on every frame.
   - **Tap the newsletter email field.** The page must **not** zoom in. That is
     the single most visible fix in this release.
   - **On a product page, tap the little dots under the photo row** — they must
     register now (they used to be a 6 px target).
   - **Open the concierge chat (bottom-left).** The panel must fit the screen
     with its input visible, and the button must sit above the home-indicator
     area, not inside it.
   - **Watch the draw countdown on the scheme page** for a few seconds: the
     digits must stay perfectly steady in width (no jiggle).
   - **Scroll to the footer** and watch the rate cells: no flicker, no jump.
6. Useful check in Chrome DevTools → Performance: record 5 seconds while
   scrolling the home page. **Layout / Update Layout should stay near zero**;
   the hero float now shows up under Composite Layers, not under Layout.

## 10 · Suggested rollback

If anything looks wrong on the phone, restore `shivaa-update-v223.zip`.
Forward-only still applies: never re-number, never reuse 224.
