# v170 — desktop categories and correct category results

21 September 2026. New forward-only update; preserves v169. **Not live-deployed.**

## Download and install

- File: **shivaa-update-v170.zip** — 19 files, 545,711 bytes.
- Source: `0b0a7e8a95be970f023c530099234a1acac6e83c`.
- SHA-256: `4ec884c4d5f8634a47f3b4112f2d36ff26010cf4b033b3fea48b21920310c60e`.
- [Download from this session's GitHub branch](https://github.com/theunreal8055-coder/Shivaa.ecom/raw/refs/heads/arena/01a0c384-shivaa-ecom/shivaa-update-v170.zip).
- Requires an existing full **v165-or-newer** installation. Includes the prior
  v166–v169 cumulative code update, not just the new category delta.

**Back up the website and database first.** Extract all files together into the
existing website folder containing `index.html` and `api.php` (usually
`public_html`, or `public_html/cms` on a subfolder installation). The ZIP has
root-relative files: **do not add another cms folder**. Never replace only sw.js.

No database, customer records, credentials, uploads, product media or host-managed
`.htaccess` is included. No main merge or hosting workflow was triggered. GitHub
sign-in with repository access may be required for a private-repository download.

## What was repaired

1. **Incorrect/empty category results during animations.** Aurum's page transition
   temporarily appends a visual clone of the old page to the document. Global
   shop selectors read the old checked category and metal controls as well as
   the new ones. Switching categories could retain old products or return no
   matches. Shop selectors and event binding now belong only to the live view;
   the approved visual transition is preserved.
2. **Desktop panel placement and reachability.** The fixed menu was inside the
   backdrop-filtered sticky header. Chromium measured its bottom at 858px on a
   768px-high laptop viewport. It now lives outside that containing block, fits
   the available viewport, scrolls internally, resets its scroll position when
   opened, and tracks the header's changing size. The trigger remains clickable.
3. **Selection lost on scroll/focus.** Both old menu controllers dismissed it on
   window scroll, including scrolling induced while reaching a tile. Scrolling
   no longer removes the click target; outside click, backdrop, Escape, route
   change and a mobile/desktop breakpoint change still dismiss the menu.
4. **Activation ownership.** Plain desktop clicks commit the hash before hiding
   the panel. Same-category selection redraws once, not through two competing
   controllers. Ctrl/middle-click retain native new tabs. Mobile/tablet drawer
   links continue working; resizing clears obsolete scrims/body locks. Escape
   returns desktop focus to the trigger. A labelled navigation region replaces
   the incomplete ARIA menu role.

The first category link already navigated in a clean v169 browser session; this
is not a claim that every v169 click was universally broken. The regression tests
reproduce the layout, scroll dismissal, stale-filter and repeated-activation
failures that simple synthetic click tests missed. No bug-free certification or
live-host verification is implied.

## Release and contents

Index/app/API/worker and shell asset URLs are **170** together. Media cache stays
**168** deliberately: no media changed. Staff loading continues to follow APP_REL.

```text
api.php
index.html
sw.js
css/fonts.css
css/styles.css
css/v116.css
css/v167.css
js/app.js
js/admin.js
js/auth.js
js/hallmark.js
js/v116.js
js/v117.js
js/v118.js
js/v125.js
js/v166.js
js/v167.js
manifest.webmanifest
manifest.json
```

Reproduce the byte-verified archive:

```bash
python3 tools/mega/make-v170-zip.py 0b0a7e8a95be970f023c530099234a1acac6e83c
```

## Verification

- Real Chromium, full shipped HTML/CSS/scripts, isolated API/product fixtures:
  **97/97 checks pass**. No forced clicks, no jsdom geometry substitution.
- Same final browser suite against the unchanged v169 baseline: **19 pass,
  78 fail**. These are repeated test cases, not 78 distinct bugs.
- Desktop: 1366×768, 1024×600 with delayed catalogue API, 1920×1080; all
  17 categories plus three featured links. Checks selected filter, matching
  product, exact category result list, closed panel/backdrop, native new tabs,
  mouse image/text targets, same route, Enter/Escape, back, scroll and resize.
- Touch Chromium emulation: 390px, 768px, 820px; rings/necklaces/silver, repeat
  category, drawer cleanup and mobile-to-desktop resize.
- Tests never contact the live API/payment/OTP services or read/write customer
  data. The test catalogue is generated QA data, never packaged.
- Exact archive-member/source matching, allowlist, ZIP integrity and coherent
  release assertions pass. Final regression and actual ZIP-overlay results are
  recorded in `docs/SESSION-STATE-2026-09-21-v170.md`.
- JS syntax and whitespace checks pass. PHP static sweep: 209 routes, zero
  exceptions; this is not 209 executed endpoint tests.

Run the browser suite on a normal development machine:

```bash
cd tools/mega/smoke
npm ci --no-audit --no-fund
npx playwright install --with-deps chromium
npm run test:categories
npm run test:regression
```

`CHROMIUM_EXECUTABLE_PATH` can select an installed Chromium binary. `SMOKE_CMS`
selects isolated source/ZIP-overlay fixtures. This sandbox used npm-provided
Chromium 153 with its extracted libraries because the browser CDN was unreachable.
Browser binaries and transient logs are not committed or packaged.

## After installation — still required on the real host

1. Confirm `/api/version` returns release 170 and matched index/app/worker stamps.
2. On the previously affected laptop, open Categories, choose Rings, then
   Necklaces, then a bottom-row category. Each must show the selected heading and
   only that category's products (or its honest empty state).
3. Repeat after changing a metal filter, with a shorter/zoomed window, and after
   revisiting from an older cached tab. Verify Enter/Escape and mobile navigation.
4. Smoke-check the unchanged cart and direct Cashfree entry without making an
   unapproved real payment. Report hosting/cache errors separately from source.

Actual Windows/macOS browsers, Firefox/WebKit, live hosting and real mobile
hardware still need owner acceptance; headless Chromium emulation is not that.
